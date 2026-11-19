import { z } from 'zod'

import { sql, type SQL } from '@readtraining/db'
import { adminPermissions, type AdminPermission } from '@readtraining/permissions'

import { orderBy, paging, total, window } from '../../lib/paging.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// The activity log viewer (Part B, B1): the append-only log recorded since Part A, newest first, searchable by who did it or
// what it affected, by kind of action and by date. Every admin can read it, for the areas they work in (seenBy); nobody can
// change it (the database refuses).
// One page at a time (keyset on id), so it stays fast as the log grows.

const KINDS = {
  signin: sql`(l.action in ('auth.login', 'auth.logout', 'auth.two_step_verified', 'auth.password_check_failed', 'admin.login'))`,
  account: sql`(l.action like 'auth.%' or l.action like 'profile.%' or l.action like 'consent.%' or l.action like 'email.%') and l.action not in ('auth.login', 'auth.logout', 'auth.two_step_verified', 'auth.password_check_failed')`,
  organisations: sql`(l.action like 'provider.%' or l.action like 'business.%' or l.action like 'identity.%' or l.action like 'course.%' or l.action like 'cohort.%' or l.action like 'venue.%')`,
  admin: sql`(l.action like 'admin.%' and l.action <> 'admin.login')`,
  denied: sql`(l.action = 'access.denied')`,
  // the Dashboard's Recent activity: what people did, without sign-ins, refused attempts, opening a workspace, switching
  // account or the automatic emails (all still on the Activity log page)
  work: sql`(l.action not like 'auth.%' and l.action not like 'email.%' and l.action not in ('admin.login', 'access.denied', 'identity.switched', 'provider.workspace.open', 'business.workspace.open'))`,
} as const
// Whose entries an admin sees: everyone's with the admin team switch (Full admins); otherwise their own, and those of the areas
// their switches work in (each area by its kinds of action), so the log never shows a part of the panel they can't open.
const actions = (...patterns: string[]) => sql`(${sql.join(patterns.map((p) => sql`l.action like ${p}`), sql` or `)})`
const AREAS: [AdminPermission[], SQL][] = [
  [['approve'], actions('provider.%', 'course.%', 'cohort.%', 'venue.%', 'plan.%', 'admin.provider_%', 'admin.course_%', 'admin.staff_access_%', 'admin.own_request_decided', 'email.application_received_sent', 'email.course_%', 'email.provider_decision_sent', 'email.approvers_told', 'email.staff_changes_sent')],
  [['suspend'], actions('account.%', 'admin.account_%', 'admin.provider_suspended', 'admin.provider_reinstated', 'email.closure_%')],
  [['catalogue'], actions('admin.catalogue_%', 'admin.shared_course_%', 'email.shared_page_paused_sent')],
  [['content', 'platform.settings'], actions('admin.content_%', 'admin.review_%', 'admin.email_test_sent')],
  [['coupons'], actions('admin.coupon_%')],
  [['orders.view', 'orders.book', 'refunds', 'disputes', 'payouts', 'adjustments', 'finance.settings'], actions('admin.order_%', 'admin.refund_%', 'admin.dispute_%', 'admin.payout_%', 'admin.balance_adjusted', 'admin.provider_charged', 'admin.provider_commission_changed', 'admin.commission_default_changed', 'admin.fees_changed')],
  [['export'], actions('admin.data_exported')],
]
function seenBy(userId: string, held: AdminPermission[]) {
  if (held.includes('admins')) return null
  const areas = AREAS.filter(([needs]) => needs.some((p) => held.includes(p))).map(([, where]) => where)
  return sql`(l.actor_user_id = ${userId}::uuid${areas.length ? sql` or ${sql.join(areas, sql` or `)}` : sql``})`
}

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
        kind: z.enum(['signin', 'account', 'organisations', 'admin', 'denied', 'work']).optional(),
        from: day.optional(), // UK dates, both days included
        to: day.optional(),
        ...paging,
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = [sql`true`]
      const mine = seenBy(ctx.user.id, adminPermissions(ctx.actor.admin))
      if (mine) where.push(mine)
      if (input.kind) where.push(KINDS[input.kind])
      if (input.from) where.push(sql`l.at >= (${input.from}::date)::timestamp at time zone 'Europe/London'`)
      if (input.to) where.push(sql`l.at < (${input.to}::date + 1)::timestamp at time zone 'Europe/London'`)
      if (input.q) {
        const like = `%${input.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
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
          // an account that has since been deleted is named as such, never by its raw id
          target: r.target_type ? { type: r.target_type, id: r.target_id, label: r.target_email ?? r.org_name ?? (['account', 'profile', 'user'].includes(r.target_type) ? 'Deleted account' : r.target_id) } : null,
          organisation: r.org_name,
          metadata: r.metadata ?? {},
          ip: r.ip,
        })),
      }
    }),
})
