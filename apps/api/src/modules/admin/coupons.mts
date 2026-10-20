import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { categories, coupons, sql } from '@readtraining/db'

import { logActivity } from '../../lib/activity.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// Coupons (Part B, B3): discount codes. Every admin can see them; creating, changing and turning one off or on needs the
// "coupons" switch, and each is logged. Dates are UK days: a coupon starts at the start of its first day and ends at the end of
// its last day (Europe/London). A coupon is never deleted; it is turned off. Checkout (still demo) will read them once payments
// are real; until then "used" stays at 0.

const fieldError = (field: string, message: string) => new TRPCError({ code: 'BAD_REQUEST', message, cause: Object.assign(new Error(message), { field }) })
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date, like 2026-11-30.')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), 'Enter a real date.')
const details = z
  .object({
    code: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .pipe(z.string().min(3, 'Enter a code of at least 3 characters.').max(30, 'Keep the code to 30 characters or fewer.').regex(/^[A-Z0-9][A-Z0-9-]*$/, 'Use only letters, numbers and hyphens, starting with a letter or number.')),
    kind: z.enum(['percent', 'amount']),
    // a whole percent, or pounds and pence
    value: z.number({ invalid_type_error: 'Enter the discount.', required_error: 'Enter the discount.' }).positive('Enter a discount above 0.'),
    startsOn: day.nullable(),
    endsOn: day.nullable(),
    usageLimit: z.number({ invalid_type_error: 'Enter a whole number.' }).int('Enter a whole number.').min(1, 'Enter 1 or more, or leave it empty for no limit.').max(1_000_000, 'Enter a smaller number.').nullable(),
    scope: z.enum(['all', 'categories', 'courses']),
    categories: z.array(z.string().max(80)).max(50),
    courses: z.array(z.number().int().positive()).max(200),
  })
  .superRefine((d, ctx) => {
    if (d.kind === 'percent' && (!Number.isInteger(d.value) || d.value > 100)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Enter a whole percentage from 1 to 100.' })
    if (d.kind === 'amount' && (Math.round(d.value * 100) !== d.value * 100 || d.value > 100_000)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Enter an amount in pounds and pence, up to £100,000.' })
    if (d.startsOn && d.endsOn && d.endsOn < d.startsOn) ctx.addIssue({ code: 'custom', path: ['endsOn'], message: 'The last day must be on or after the first day.' })
    if (d.scope === 'categories' && !d.categories.length) ctx.addIssue({ code: 'custom', path: ['categories'], message: 'Choose at least one category.' })
    if (d.scope === 'courses' && !d.courses.length) ctx.addIssue({ code: 'custom', path: ['courses'], message: 'Choose at least one course.' })
  })
type Details = z.infer<typeof details>

// a Postgres array from a list (the sql template would otherwise spread a list into separate values)
const textArray = (list: string[]) => (list.length ? sql`array[${sql.join(list.map((x) => sql`${x}`), sql`, `)}]::text[]` : sql`'{}'::text[]`)
const intArray = (list: number[]) => (list.length ? sql`array[${sql.join(list.map((x) => sql`${x}`), sql`, `)}]::integer[]` : sql`'{}'::integer[]`)
const startOf = (d: string | null) => (d ? sql`(${d}::date)::timestamp at time zone 'Europe/London'` : sql`null`)
const endOf = (d: string | null) => (d ? sql`(${d}::date + 1)::timestamp at time zone 'Europe/London'` : sql`null`)
const STATUS = {
  live: sql`c.active and (c.starts_at is null or c.starts_at <= now()) and (c.ends_at is null or c.ends_at > now()) and (c.usage_limit is null or c.used < c.usage_limit)`,
  scheduled: sql`c.active and c.starts_at > now()`,
  ended: sql`c.active and ((c.ends_at is not null and c.ends_at <= now()) or (c.usage_limit is not null and c.used >= c.usage_limit))`,
  off: sql`not c.active`,
}

// the checks that need the database: real category addresses, and a code no other coupon has
async function check(db: typeof Db, d: Details, id: string | null) {
  if (d.scope === 'categories') {
    const known = await db.execute<{ slug: string }>(sql`select slug from ${categories} where slug = any(${textArray(d.categories)})`)
    if (known.length !== new Set(d.categories).size) throw fieldError('categories', 'Choose categories from the list.')
  }
  const [taken] = await db.execute<{ id: string }>(sql`select id from ${coupons} where code = ${d.code} ${id ? sql`and id <> ${id}::uuid` : sql``}`)
  if (taken) throw fieldError('code', 'Another coupon already uses this code.')
}
const values = (d: Details) => ({
  code: d.code,
  kind: d.kind,
  value: d.kind === 'percent' ? d.value : Math.round(d.value * 100),
  starts_at: startOf(d.startsOn),
  ends_at: endOf(d.endsOn),
  usage_limit: d.usageLimit,
  scope: d.scope,
  categories: d.scope === 'categories' ? [...new Set(d.categories)] : [],
  courses: d.scope === 'courses' ? [...new Set(d.courses)] : [],
})

type Row = { id: string; code: string; kind: 'percent' | 'amount'; value: number; starts_on: string | null; ends_on: string | null; usage_limit: number | null; used: number; scope: 'all' | 'categories' | 'courses'; categories: string[]; courses: number[]; active: boolean; status: keyof typeof STATUS; created_at: string; created_by_name: string | null }
const shape = (r: Row) => ({
  id: r.id,
  code: r.code,
  kind: r.kind,
  value: r.kind === 'percent' ? r.value : r.value / 100,
  startsOn: r.starts_on,
  endsOn: r.ends_on,
  usageLimit: r.usage_limit,
  used: r.used,
  scope: r.scope,
  categories: r.categories,
  courses: r.courses,
  status: r.status,
  createdAt: new Date(r.created_at).toISOString(),
  createdBy: r.created_by_name,
})

export const couponsRouter = createTRPCRouter({
  // Every coupon, newest first, with its status now; search by code; the count in each status for the tabs.
  list: adminProcedure('admin.panel.open')
    .input(z.object({ q: z.string().trim().max(40).optional(), status: z.enum(['live', 'scheduled', 'ended', 'off']).optional() }))
    .query(async ({ ctx, input }) => {
      const status = sql`case when ${STATUS.off} then 'off' when ${STATUS.scheduled} then 'scheduled' when ${STATUS.ended} then 'ended' else 'live' end`
      const where = [sql`true`]
      if (input.q) where.push(sql`c.code ilike ${`%${input.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`}`)
      if (input.status) where.push(input.status === 'live' ? STATUS.live : STATUS[input.status])
      const rows = await ctx.db.execute<Row>(sql`
        select c.id, c.code, c.kind, c.value, c.usage_limit, c.used, c.scope, c.categories, c.courses, c.active, c.created_at,
               to_char(c.starts_at at time zone 'Europe/London', 'YYYY-MM-DD') starts_on,
               to_char((c.ends_at at time zone 'Europe/London') - interval '1 day', 'YYYY-MM-DD') ends_on,
               ${status} status, nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '') created_by_name
        from ${coupons} c left join public.profiles p on p.id = c.created_by
        where ${sql.join(where, sql` and `)}
        order by c.created_at desc limit 500`)
      const [n] = await ctx.db.execute<Record<keyof typeof STATUS, number>>(sql`
        select count(*) filter (where ${STATUS.live})::int live, count(*) filter (where ${STATUS.scheduled})::int scheduled,
               count(*) filter (where ${STATUS.ended})::int ended, count(*) filter (where ${STATUS.off})::int off
        from ${coupons} c`)
      return { coupons: rows.map(shape), counts: n }
    }),

  create: adminProcedure('admin.coupons.manage')
    .input(details)
    .mutation(async ({ ctx, input }) => {
      await check(ctx.db, input, null)
      const v = values(input)
      const [row] = await ctx.db.execute<{ id: string }>(sql`
        insert into ${coupons} (code, kind, value, starts_at, ends_at, usage_limit, scope, categories, courses, created_by)
        values (${v.code}, ${v.kind}, ${v.value}, ${v.starts_at}, ${v.ends_at}, ${v.usage_limit}, ${v.scope}, ${textArray(v.categories)}, ${intArray(v.courses)}, ${ctx.user.id}::uuid)
        returning id`)
      await logActivity(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.coupon_created', targetType: 'coupon', targetId: row.id, metadata: { code: v.code, kind: v.kind, value: input.value }, ip: ctx.ip })
      return { id: row.id }
    }),

  update: adminProcedure('admin.coupons.manage')
    .input(details.and(z.object({ id: z.string().uuid() })))
    .mutation(async ({ ctx, input }) => {
      await check(ctx.db, input, input.id)
      const v = values(input)
      const [row] = await ctx.db.execute<{ id: string }>(sql`
        update ${coupons} set code = ${v.code}, kind = ${v.kind}, value = ${v.value}, starts_at = ${v.starts_at}, ends_at = ${v.ends_at},
               usage_limit = ${v.usage_limit}, scope = ${v.scope}, categories = ${textArray(v.categories)}, courses = ${intArray(v.courses)}, updated_at = now()
        where id = ${input.id}::uuid returning id`)
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'That coupon no longer exists.' })
      await logActivity(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.coupon_updated', targetType: 'coupon', targetId: row.id, metadata: { code: v.code, kind: v.kind, value: input.value }, ip: ctx.ip })
      return { ok: true }
    }),

  // Turn a coupon off (it stops working at once) or back on.
  setActive: adminProcedure('admin.coupons.manage')
    .input(z.object({ id: z.string().uuid(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.execute<{ code: string }>(sql`update ${coupons} set active = ${input.active}, updated_at = now() where id = ${input.id}::uuid and active <> ${input.active} returning code`)
      if (!row) return { ok: true }
      await logActivity(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: input.active ? 'admin.coupon_turned_on' : 'admin.coupon_turned_off', targetType: 'coupon', targetId: input.id, metadata: { code: row.code }, ip: ctx.ip })
      return { ok: true }
    }),
})
