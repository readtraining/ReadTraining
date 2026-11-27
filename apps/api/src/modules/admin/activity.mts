import { z } from 'zod'

import { sql, type SQL } from '@readtraining/db'
import { adminPermissions, type AdminPermission } from '@readtraining/permissions'

import { orderBy, paging, total, window } from '../../lib/paging.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// The activity log viewer (Part B, B1): the append-only log recorded since Part A, newest first, searchable by who did it or
// what it affected, by kind of action and by date. Every admin can read it, for the areas they work in (seenBy); nobody can
// change it (the database refuses).
// One page at a time (keyset on id), so it stays fast as the log grows.

// What the log opens on (the "Important" view): everything except routine activity. As audit logs usually are (OWASP's logging
// guidance; GitHub's, Clerk's and Adobe's admin logs), it keeps our team's own decisions and changes, money, access and
// security events, refused changes and failed checks in front, and leaves out what people do every day for themselves and what
// follows on from another entry (the automatic emails, the auth trigger's copy of an admin's block or closure). Routine entries
// are still recorded and shown under All and their own tabs, since an investigation needs them. An action not listed is
// important, so a new kind of entry shows until someone decides otherwise.
const ROUTINE = [
  // signing in and looking after one's own account (the Sign-ins and Accounts tabs)
  'auth.signup', 'auth.email_confirmed', 'auth.login', 'auth.logout', 'auth.two_step_verified', 'admin.login',
  'auth.password_reset_requested', 'auth.password_changed', 'auth.email_change_requested', 'auth.email_changed', 'account.password_set',
  'profile.basic_updated', 'profile.address_updated', 'profile.photo_updated', 'profile.photo_removed',
  'consent.marketing_given', 'consent.marketing_withdrawn', 'identity.switched',
  // the auth trigger's copy of an admin's block, unblock or account closure (each logged as the admin's own action)
  'auth.banned', 'auth.unbanned', 'auth.account_deleted',
  // a staff session ending, resending an invite, a test email
  'admin.staff_access_ended', 'admin.invite_resent', 'admin.email_test_sent',
]
// a provider's everyday work on its own courses, dates, venues, plans and profile (important when our staff do it: metadata.staff)
const PROVIDER_ROUTINE = [
  'course.created', 'course.updated', 'course.duplicated', 'course.image_added', 'course.images_changed', 'course.edited_in_review', 'course.subject_suggested',
  'cohort.created', 'cohort.updated', 'cohort.bookings_on', 'cohort.bookings_off', 'cohort.deleted',
  'venue.created', 'venue.updated', 'venue.archived', 'venue.restored', 'venue.deleted',
  'plan.created', 'plan.updated', 'plan.archived', 'plan.restored', 'plan.deleted', 'addon.created',
  'provider.profile_updated', 'provider.terms_updated', 'provider.logo_updated', 'provider.logo_removed', 'provider.faqs_updated', 'provider.notice_emails_updated',
  'provider.member_invite_resent', 'provider.member_invite_cancelled',
]
const inList = (list: string[]) => sql.join(list.map((a) => sql`${a}`), sql`, `)
const IMPORTANT = sql`(not (
  l.action in (${inList(ROUTINE)})
  or l.action like 'email.%'
  or (l.action in (${inList(PROVIDER_ROUTINE)}) and not (l.metadata ? 'staff'))
  -- a refused page or read (the page doesn't open, nothing changed), except a refused attempt on the admin; entries from
  -- before reads were marked (metadata.read) are told by their page, or a permission to view or open
  -- (coalesce: a missing value must count as no, never as unknown, or the whole test would hide the entry)
  or coalesce(l.action = 'access.denied' and l.metadata->>'attempted' <> 'admin.panel.open'
    and (l.metadata->>'read' = 'true' or l.target_type = 'page' or l.metadata->>'attempted' like '%.view' or l.metadata->>'attempted' like '%.open'), false)
  -- an admin opening a provider's pages as staff only to look (each change the session makes is its own entry)
  or (l.action = 'admin.staff_access_started' and not exists (
    select 1 from public.activity_log s where s.organisation_id = l.organisation_id and s.at >= l.at and s.metadata->>'staff' = l.target_id and s.action <> 'access.denied'))
))`
const KINDS = {
  important: IMPORTANT,
  signin: sql`(l.action in ('auth.login', 'auth.logout', 'auth.two_step_verified', 'auth.password_check_failed', 'admin.login'))`,
  account: sql`(l.action like 'auth.%' or l.action like 'account.%' or l.action like 'profile.%' or l.action like 'consent.%') and l.action not in ('auth.login', 'auth.logout', 'auth.two_step_verified', 'auth.password_check_failed')`,
  organisations: sql`(l.action like 'provider.%' or l.action like 'business.%' or l.action like 'identity.%' or l.action like 'course.%' or l.action like 'cohort.%' or l.action like 'venue.%' or l.action like 'plan.%' or l.action like 'addon.%')`,
  admin: sql`((l.action like 'admin.%' and l.action <> 'admin.login') or l.action like 'system.%')`,
  emails: sql`(l.action like 'email.%')`,
  denied: sql`(l.action = 'access.denied')`,
  // the Dashboard's Recent activity: the important entries people made, without the refused attempts and failed checks
  work: sql`(${IMPORTANT} and l.action not in ('access.denied', 'auth.password_check_failed'))`,
} as const
// A provider's course is never shown to our team until it is sent for approval (CLAUDE.md), so the provider's own entries about
// a course never sent (its drafts, edits, pictures, or deleting it) stay out of the log in every view: a draft never sent
// (submitted_at stays set once sent, through a withdrawal too), or a deleted course that was never sent or decided on.
// (in / not in: each list is read once and looked up, rather than asked again for every entry)
const NOT_DRAFT_WORK = sql`not (l.target_type = 'course' and l.actor_identity = 'provider' and not (l.metadata ? 'staff') and (
  l.target_id in (select c.id::text from public.courses c where c.status = 'draft' and c.submitted_at is null)
  or (l.target_id not in (select c.id::text from public.courses c)
    and l.target_id not in (select s.target_id from public.activity_log s where s.target_type = 'course' and s.target_id is not null
      and (s.action = 'course.submitted' or s.action like 'admin.course_%')))))`
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

// Repeats are shown once: the same person, acting the same way, doing the same thing to the same thing (and, for a refusal,
// trying the same thing), each within REPEAT_GAP of the one before, is one row with how many times and from when to when. The
// log itself keeps every entry; only the list groups them, so pages and totals count the rows as they are shown.
const REPEAT_GAP = sql`interval '10 minutes'`
const SAME = sql`l.actor_user_id, l.actor_identity, l.action, l.target_type, l.target_id, l.organisation_id, l.metadata->>'attempted'`

type Row = {
  total: number
  id: number
  at: string
  first_at: string
  times: number
  actor_user_id: string | null
  actor_identity: 'student' | 'provider' | 'business' | 'admin' | 'system'
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
  actor_email: string | null
  actor_first: string | null
  actor_last: string | null
  target_email: string | null
  target_name: string | null
  org_name: string | null
}

// What the entry is about, in words: the course, price plan, venue or coupon by its name (the one it has now, or the one the
// entry saved when it was made), a date by its course, an account by its email. Never an IP address or the browser: they stay
// in the log for an investigation, but the page doesn't show them (UK GDPR: personal data, shown only where it is needed).
const TARGET_NAME = sql`case g.target_type
  when 'course' then coalesce((select c.title from public.courses c where c.id::text = g.target_id), g.metadata->>'title')
  when 'price_plan' then coalesce((select p.name from public.price_plans p where p.id::text = g.target_id), g.metadata->>'name')
  when 'venue' then coalesce((select v.name from public.venues v where v.id::text = g.target_id), g.metadata->>'name')
  when 'cohort' then coalesce((select c.title from public.cohorts d join public.courses c on c.id = d.course_id where d.id::text = g.target_id),
    (select c.title from public.courses c where c.id::text = g.metadata->>'courseId'))
  when 'coupon' then coalesce((select k.code from public.coupons k where k.id::text = g.target_id), g.metadata->>'code')
  when 'review' then g.metadata->>'name'
  when 'addon' then g.metadata->>'name'
end`

// An account that has since been deleted is named as such, never by its raw id; an order or payout by its reference; anything
// else without a name of its own by its provider or business.
const ACCOUNT = ['account', 'profile', 'user']
const REFERENCE = ['order', 'payout']
function targetLabel(r: Row) {
  if (r.target_email ?? r.target_name) return r.target_email ?? r.target_name
  if (ACCOUNT.includes(r.target_type ?? '')) return 'Deleted account'
  if (REFERENCE.includes(r.target_type ?? '')) return r.target_id
  return r.org_name ?? r.target_id
}

export const activityRouter = createTRPCRouter({
  list: adminProcedure('admin.activity.view')
    .input(
      z.object({
        q: z.string().trim().max(200).optional(), // a name, an email, or a reference (account id, organisation id, page…)
        kind: z.enum(['important', 'signin', 'account', 'organisations', 'admin', 'emails', 'denied', 'work']).optional(),
        from: day.optional(), // UK dates, both days included
        to: day.optional(),
        ...paging,
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = [NOT_DRAFT_WORK]
      const mine = seenBy(ctx.user.id, adminPermissions(ctx.actor.admin))
      if (mine) where.push(mine)
      if (input.kind) where.push(KINDS[input.kind])
      if (input.from) where.push(sql`l.at >= (${input.from}::date)::timestamp at time zone 'Europe/London'`)
      if (input.to) where.push(sql`l.at < (${input.to}::date + 1)::timestamp at time zone 'Europe/London'`)
      let joins = sql``
      if (input.q) {
        const like = `%${input.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
        joins = sql`
          left join auth.users au on au.id = l.actor_user_id
          left join public.profiles ap on ap.id = l.actor_user_id
          left join auth.users tu on l.target_type in ('account', 'profile', 'user') and tu.id::text = l.target_id
          left join public.organisations o on o.id::text = coalesce(l.organisation_id::text, case when l.target_type = 'organisation' then l.target_id end)`
        where.push(sql`(au.email ilike ${like} or concat_ws(' ', ap.first_name, ap.last_name) ilike ${like} or tu.email ilike ${like}
          or o.name ilike ${like} or l.actor_user_id::text = ${input.q} or l.target_id = ${input.q} or l.organisation_id::text = ${input.q})`)
      }
      const rows = await ctx.db.execute<Row>(sql`
        with matched as (
          select l.id, l.at, l.actor_user_id, l.actor_identity, l.action, l.target_type, l.target_id, l.organisation_id, l.metadata,
                 l.metadata->>'attempted' attempted,
                 case when l.at - lag(l.at) over (partition by ${SAME} order by l.at, l.id) <= ${REPEAT_GAP} then 0 else 1 end starts
          from public.activity_log l ${joins}
          where ${sql.join(where, sql` and `)}
        ), runs as (
          select m.*, sum(m.starts) over (partition by m.actor_user_id, m.actor_identity, m.action, m.target_type, m.target_id, m.organisation_id, m.attempted
                                          order by m.at, m.id rows unbounded preceding) run
          from matched m
        ), grouped as (
          select max(r.id) id, max(r.at) at, min(r.at) first_at, count(*)::int times, r.actor_user_id, r.actor_identity, r.action,
                 r.target_type, r.target_id, r.organisation_id, (array_agg(r.metadata order by r.at desc, r.id desc))[1] metadata
          from runs r
          group by r.actor_user_id, r.actor_identity, r.action, r.target_type, r.target_id, r.organisation_id, r.attempted, r.run
        ), page as (
          select g.*, ${total} total from grouped g
          order by ${orderBy(sql`g.at`, input.dir, sql`g.id`)}
          ${window(input.page, input.limit)}
        )
        select g.id, g.at, g.first_at, g.times, g.total, g.actor_user_id, g.actor_identity, g.action, g.target_type, g.target_id, g.metadata,
               au.email actor_email, ap.first_name actor_first, ap.last_name actor_last, tu.email target_email, o.name org_name,
               ${TARGET_NAME} target_name
        from page g
        left join auth.users au on au.id = g.actor_user_id
        left join public.profiles ap on ap.id = g.actor_user_id
        left join auth.users tu on g.target_type in ('account', 'profile', 'user') and tu.id::text = g.target_id
        left join public.organisations o on o.id::text = coalesce(g.organisation_id::text, case when g.target_type = 'organisation' then g.target_id end)
        order by ${orderBy(sql`g.at`, input.dir, sql`g.id`)}`)
      return {
        total: rows[0]?.total ?? 0,
        entries: rows.map((r) => ({
          id: Number(r.id),
          at: new Date(r.at).toISOString(),
          // a run of the same entry: how many, and when the first was (`at` is the latest)
          times: r.times,
          firstAt: new Date(r.first_at).toISOString(),
          identity: r.actor_identity,
          action: r.action,
          actor: r.actor_user_id
            ? { id: r.actor_user_id, email: r.actor_email, name: `${r.actor_first ?? ''} ${r.actor_last ?? ''}`.trim() || r.actor_email }
            : null,
          target: r.target_type ? { type: r.target_type, id: r.target_id, label: targetLabel(r) } : null,
          organisation: r.org_name,
          metadata: r.metadata ?? {},
        })),
      }
    }),
})
