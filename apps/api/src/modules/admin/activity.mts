import { z } from 'zod'

import { sql } from '@readtraining/db'

import { orderBy, paging, total, window } from '../../lib/paging.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// The activity log viewer (Part B, B1): the append-only log recorded since Part A, newest first, searchable by who did it or
// what it affected, by kind of action and by date. Every admin can read it; nobody can change it (the database refuses).
// One page at a time (keyset on id), so it stays fast as the log grows.

const KINDS = {
  signin: sql`(l.action in ('auth.login', 'auth.logout', 'auth.two_step_verified', 'auth.password_check_failed', 'admin.login'))`,
  account: sql`(l.action like 'auth.%' or l.action like 'profile.%' or l.action like 'consent.%' or l.action like 'email.%') and l.action not in ('auth.login', 'auth.logout', 'auth.two_step_verified', 'auth.password_check_failed')`,
  organisations: sql`(l.action like 'provider.%' or l.action like 'business.%' or l.action like 'identity.%')`,
  admin: sql`(l.action like 'admin.%' and l.action <> 'admin.login')`,
  denied: sql`(l.action = 'access.denied')`,
} as const
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

type Row = {
  total: number
  id: number
  at: string
  actor_user_id: string | null
  actor_identity: 'student' | 'provider' | 'business' | 'admin' | 'system'
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
  ip: string | null
  actor_email: string | null
  actor_first: string | null
  actor_last: string | null
  target_email: string | null
  org_name: string | null
}

export const activityRouter = createTRPCRouter({
  list: adminProcedure('admin.activity.view')
    .input(
      z.object({
        q: z.string().trim().max(200).optional(), // a name, an email, or a reference (account id, organisation id, page…)
        kind: z.enum(['signin', 'account', 'organisations', 'admin', 'denied']).optional(),
        from: day.optional(), // UK dates, both days included
        to: day.optional(),
        ...paging,
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = [sql`true`]
      if (input.kind) where.push(KINDS[input.kind])
      if (input.from) where.push(sql`l.at >= (${input.from}::date)::timestamp at time zone 'Europe/London'`)
      if (input.to) where.push(sql`l.at < (${input.to}::date + 1)::timestamp at time zone 'Europe/London'`)
      if (input.q) {
        const like = `%${input.q.replace(/[\%_]/g, (c) => `\${c}`)}%`
        where.push(sql`(au.email ilike ${like} or concat_ws(' ', ap.first_name, ap.last_name) ilike ${like} or tu.email ilike ${like}
          or o.name ilike ${like} or l.actor_user_id::text = ${input.q} or l.target_id = ${input.q} or l.organisation_id::text = ${input.q})`)
      }
      const rows = await ctx.db.execute<Row>(sql`
        select l.id, l.at, ${total} total, l.actor_user_id, l.actor_identity, l.action, l.target_type, l.target_id, l.metadata, l.ip,
               au.email actor_email, ap.first_name actor_first, ap.last_name actor_last, tu.email target_email, o.name org_name
        from public.activity_log l
        left join auth.users au on au.id = l.actor_user_id
        left join public.profiles ap on ap.id = l.actor_user_id
        left join auth.users tu on l.target_type in ('account', 'profile', 'user') and tu.id::text = l.target_id
        left join public.organisations o on o.id::text = coalesce(l.organisation_id::text, case when l.target_type = 'organisation' then l.target_id end)
        where ${sql.join(where, sql` and `)}
        order by ${orderBy(sql`l.at`, input.dir, sql`l.id`)}
        ${window(input.page, input.limit)}`)
      return {
        total: rows[0]?.total ?? 0,
        entries: rows.map((r) => ({
          id: Number(r.id),
          at: new Date(r.at).toISOString(),
          identity: r.actor_identity,
          action: r.action,
          actor: r.actor_user_id
            ? { id: r.actor_user_id, email: r.actor_email, name: `${r.actor_first ?? ''} ${r.actor_last ?? ''}`.trim() || r.actor_email }
            : null,
          target: r.target_type ? { type: r.target_type, id: r.target_id, label: r.target_email ?? r.org_name ?? r.target_id } : null,
          organisation: r.org_name,
          metadata: r.metadata ?? {},
          ip: r.ip,
        })),
      }
    }),
})
