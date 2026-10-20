import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { sql } from '@readtraining/db'

import { logActivity } from '../../lib/activity.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { signedPhotoUrl, supabase } from '../../lib/supabase.mjs'
import { orderBy, paging, total, window } from '../../lib/paging.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// Students (Part B, B1): every account on the site, from the real data. Every admin can find a person and open their record
// (profile, how they sign in, their provider and business accounts, their activity). Blocking needs the "suspend" switch and
// downloading everything held about a person needs "export"; both are logged with the admin who did it.
// Bookings, wallet and certificates join the record when those features are real.

const STATUS = {
  unconfirmed: sql`u.email_confirmed_at is null`,
  blocked: sql`u.banned_until > now()`,
  providers: sql`exists (select 1 from public.organisation_members m join public.organisations o on o.id = m.organisation_id where m.user_id = u.id and o.type = 'provider')`,
  businesses: sql`exists (select 1 from public.organisation_members m join public.organisations o on o.id = m.organisation_id where m.user_id = u.id and o.type = 'business')`,
} as const
const id = z.object({ userId: z.string().uuid() })
const iso = (t: string | null) => (t ? new Date(t).toISOString() : null)

type Named = { first_name: string | null; last_name: string | null; email: string }
const nameOf = (r: Named) => `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.email
const statusOf = (r: { banned: boolean; email_confirmed_at: string | null }) => (r.banned ? 'blocked' : r.email_confirmed_at ? 'active' : 'unconfirmed')

// the person an action is about: refused when the account is gone
async function person(db: typeof Db, userId: string) {
  const [row] = await db.execute<{ banned: boolean; admin: boolean }>(sql`
    select coalesce(u.banned_until > now(), false) banned, exists (select 1 from public.admin_users a where a.user_id = u.id and a.active) admin
    from auth.users u where u.id = ${userId}::uuid and u.deleted_at is null`)
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'This account no longer exists.' })
  return row
}

const STUDENT_SORT = { joined: sql`u.created_at`, name: sql`lower(coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), u.email))`, last: sql`u.last_sign_in_at` }

export const studentsRouter = createTRPCRouter({
  // Newest accounts first, a page at a time.
  list: adminProcedure('admin.students.view')
    .input(
      z.object({
        q: z.string().trim().max(200).optional(), // a name, an email, a phone number or an account id
        status: z.enum(['unconfirmed', 'blocked', 'providers', 'businesses']).optional(),
        sort: z.enum(['joined', 'name', 'last']).default('joined'),
        ...paging,
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = [sql`u.deleted_at is null`]
      if (input.status) where.push(STATUS[input.status])
      if (input.q) {
        const like = `%${input.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
        where.push(sql`(u.email ilike ${like} or concat_ws(' ', p.first_name, p.last_name) ilike ${like} or p.phone ilike ${like} or u.id::text = ${input.q})`)
      }
      const rows = await ctx.db.execute<Named & { id: string; created_at: string; total: number; last_sign_in_at: string | null; email_confirmed_at: string | null; banned: boolean; orgs: { type: 'provider' | 'business'; name: string }[] | null; admin: boolean }>(sql`
        select u.id, u.email, u.created_at, ${total} total, u.last_sign_in_at, u.email_confirmed_at, coalesce(u.banned_until > now(), false) banned,
               p.first_name, p.last_name,
               (select json_agg(json_build_object('type', o.type, 'name', o.name) order by o.name)
                  from public.organisation_members m join public.organisations o on o.id = m.organisation_id where m.user_id = u.id) orgs,
               exists (select 1 from public.admin_users a where a.user_id = u.id and a.active) admin
        from auth.users u left join public.profiles p on p.id = u.id
        where ${sql.join(where, sql` and `)}
        order by ${orderBy(STUDENT_SORT[input.sort], input.dir, sql`u.id`)}
        ${window(input.page, input.limit)}`)
      return {
        total: rows[0]?.total ?? 0,
        students: rows.map((r) => ({
          id: r.id,
          name: nameOf(r),
          email: r.email,
          joinedAt: iso(r.created_at)!,
          lastSignInAt: iso(r.last_sign_in_at),
          status: statusOf(r),
          organisations: r.orgs ?? [],
          admin: r.admin,
        })),
      }
    }),

  // One person's record. Their activity comes from admin.activity.list.
  get: adminProcedure('admin.students.view')
    .input(id)
    .query(async ({ ctx, input }) => {
      const [r] = await ctx.db.execute<
        Named & {
          id: string
          created_at: string
          last_sign_in_at: string | null
          email_confirmed_at: string | null
          banned: boolean
          methods: string[] | null
          two_step: boolean
          avatar_url: string | null
          date_of_birth: string | null
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          postcode: string | null
          marketing_opt_in: boolean | null
          marketing_opt_in_at: string | null
          admin_preset: string | null
        }
      >(sql`
        select u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at, coalesce(u.banned_until > now(), false) banned,
               array(select jsonb_array_elements_text(coalesce(u.raw_app_meta_data->'providers', '[]'::jsonb))) methods,
               exists (select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified') two_step,
               p.first_name, p.last_name, p.avatar_url, p.date_of_birth, p.phone, p.address_line1, p.address_line2, p.city, p.postcode,
               p.marketing_opt_in, p.marketing_opt_in_at,
               (select a.preset::text from public.admin_users a where a.user_id = u.id and a.active) admin_preset
        from auth.users u left join public.profiles p on p.id = u.id
        where u.id = ${input.userId}::uuid and u.deleted_at is null`)
      if (!r) throw new TRPCError({ code: 'NOT_FOUND', message: 'This account no longer exists.' })
      const orgs = await ctx.db.execute<{ id: string; type: 'provider' | 'business'; name: string; status: string; role: string; job_title: string | null; joined_at: string }>(sql`
        select o.id, o.type, o.name, o.status, m.role, m.job_title, m.created_at joined_at
        from public.organisation_members m join public.organisations o on o.id = m.organisation_id
        where m.user_id = ${input.userId}::uuid order by o.type, o.name`)
      return {
        id: r.id,
        name: nameOf(r),
        email: r.email,
        photoUrl: await signedPhotoUrl(r.avatar_url),
        dateOfBirth: r.date_of_birth,
        phone: r.phone,
        address: [r.address_line1, r.address_line2, r.city, r.postcode].filter((x): x is string => Boolean(x)),
        marketingOptIn: r.marketing_opt_in === true,
        marketingOptInAt: iso(r.marketing_opt_in_at),
        joinedAt: iso(r.created_at)!,
        confirmedAt: iso(r.email_confirmed_at),
        lastSignInAt: iso(r.last_sign_in_at),
        status: statusOf(r),
        signInMethods: r.methods ?? [],
        twoStep: r.two_step,
        admin: r.admin_preset,
        organisations: orgs.map((o) => ({ id: o.id, type: o.type, name: o.name, status: o.status, role: o.role, jobTitle: o.job_title, joinedAt: iso(o.joined_at)! })),
      }
    }),

  // Block: they can't sign in, and every session they have ends now. Not yourself, and not an admin (remove them from the
  // admin team first). The reason is kept in the activity log.
  block: adminProcedure('admin.accounts.suspend')
    .input(id.extend({ reason: z.string().trim().min(1, 'Enter why this account is being blocked.').max(500) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can’t block your own account.' })
      const who = await person(ctx.db, input.userId)
      if (who.admin) throw new TRPCError({ code: 'FORBIDDEN', message: 'This person is on the admin team. Remove them from the admin team first.' })
      if (who.banned) throw new TRPCError({ code: 'CONFLICT', message: 'This account is already blocked.' })
      if (!supabase) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Accounts can’t be blocked right now.' })
      const { error } = await supabase.auth.admin.updateUserById(input.userId, { ban_duration: '876000h' })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Accounts can’t be blocked right now.' })
      await ctx.db.transaction(async (tx) => {
        await tx.execute(sql`delete from auth.sessions where user_id = ${input.userId}::uuid`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.account_blocked', targetType: 'account', targetId: input.userId, metadata: { reason: input.reason }, ip: ctx.ip })
      })
      return { ok: true }
    }),

  unblock: adminProcedure('admin.accounts.suspend')
    .input(id)
    .mutation(async ({ ctx, input }) => {
      const who = await person(ctx.db, input.userId)
      if (!who.banned) throw new TRPCError({ code: 'CONFLICT', message: 'This account is not blocked.' })
      if (!supabase) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Accounts can’t be unblocked right now.' })
      const { error } = await supabase.auth.admin.updateUserById(input.userId, { ban_duration: 'none' })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Accounts can’t be unblocked right now.' })
      await logActivity(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.account_unblocked', targetType: 'account', targetId: input.userId, metadata: {}, ip: ctx.ip })
      return { ok: true }
    }),

  // Everything held about a person (a subject access request): account, profile, organisations and their whole activity log.
  export: adminProcedure('admin.data.export')
    .input(id)
    .mutation(async ({ ctx, input }) => {
      await person(ctx.db, input.userId)
      const [account] = await ctx.db.execute(sql`
        select u.id, u.email, u.phone, u.created_at, u.email_confirmed_at, u.last_sign_in_at, u.raw_app_meta_data->'providers' sign_in_methods
        from auth.users u where u.id = ${input.userId}::uuid`)
      const [profile] = await ctx.db.execute(sql`
        select first_name, last_name, date_of_birth, phone, address_line1, address_line2, city, postcode, marketing_opt_in, marketing_opt_in_at,
               avatar_url is not null has_photo, created_at, updated_at
        from public.profiles where id = ${input.userId}::uuid`)
      const organisations = await ctx.db.execute(sql`
        select o.type, o.name, o.status, m.role, m.job_title, m.created_at joined_at
        from public.organisation_members m join public.organisations o on o.id = m.organisation_id where m.user_id = ${input.userId}::uuid`)
      const activity = await ctx.db.execute(sql`
        select at, action, actor_identity, target_type, target_id, metadata, ip from public.activity_log
        where actor_user_id = ${input.userId}::uuid or target_id = ${input.userId} order by id`)
      await logActivity(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.data_exported', targetType: 'account', targetId: input.userId, metadata: {}, ip: ctx.ip })
      return { exportedAt: new Date().toISOString(), account, profile: profile ?? null, organisations: [...organisations], activity: [...activity] }
    }),
})
