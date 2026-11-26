import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { organisations, sql } from '@readtraining/db'
import { can } from '@readtraining/permissions'
import type { AdminAction } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import { emailOutbox } from '../../lib/email.mjs'
import { mediaUrl, removeMedia } from '../../lib/media.mjs'
import { notify, ownerOf } from '../../lib/notify.mjs'
import { OWN_REASON_ERROR, ownReasonOk, ownRequestRefused, soleApprover } from '../../lib/soleApprover.mjs'
import { bps, defaultCommission, percent } from './commission.mjs'
import { orderBy, paging, total, window } from '../../lib/paging.mjs'
import { adminProcedure, createTRPCRouter, refuse } from '../../trpc/trpc.mjs'

// Providers and approvals (Part B, B1): the real provider accounts. Every admin can see them; deciding on an application
// (approve, ask for changes, reject) needs the "approve" switch and is never done by the admin who opened that provider
// account; suspending and reinstating need "suspend". Each decision saves the status with its reason (the provider sees it in
// their workspace), is logged, and emails the provider's owner.

type Status = 'pending' | 'changes_requested' | 'active' | 'suspended' | 'rejected'

// what each decision needs, which statuses it can start from, where it leads, and whether a message is required
type ProviderDecision = 'approve' | 'changes' | 'reject' | 'suspend' | 'reinstate'
// the email each decision sends (emails/templates.mts)
const DECISION_EMAIL: Record<ProviderDecision, string> = { approve: 'provider-approved', changes: 'provider-changes', reject: 'provider-rejected', suspend: 'provider-suspended', reinstate: 'provider-reinstated' }
const DECISIONS: Record<ProviderDecision, { action: AdminAction; from: Status[]; to: Status; message: boolean; log: string }> = {
  approve: { action: 'admin.approvals.decide', from: ['pending', 'changes_requested'], to: 'active', message: false, log: 'admin.provider_approved' },
  changes: { action: 'admin.approvals.decide', from: ['pending'], to: 'changes_requested', message: true, log: 'admin.provider_changes_requested' },
  reject: { action: 'admin.approvals.decide', from: ['pending', 'changes_requested'], to: 'rejected', message: true, log: 'admin.provider_rejected' },
  suspend: { action: 'admin.accounts.suspend', from: ['active'], to: 'suspended', message: true, log: 'admin.provider_suspended' },
  reinstate: { action: 'admin.accounts.suspend', from: ['suspended'], to: 'active', message: false, log: 'admin.provider_reinstated' },
}
// a decision the provider's status no longer allows: already made (a double click, or another admin at the same moment), or
// the status moved on some other way
const STATUS_WORDS: Record<Status, string> = { pending: 'waiting for review', changes_requested: 'waiting for changes', active: 'approved', suspended: 'suspended', rejected: 'not approved' }
const statusConflict = (now: Status, to: Status) =>
  new TRPCError({ code: 'CONFLICT', message: now === to ? `This decision has already been made: the provider is ${STATUS_WORDS[now]}. Reload the page to see it.` : 'This provider’s status has changed. Reload the page to see it.' })

const MESSAGE_ERROR: Partial<Record<ProviderDecision, string>> = {
  changes: 'Enter what the provider needs to change.',
  reject: 'Enter why the provider is not approved.',
  suspend: 'Enter why the provider is suspended.',
}

const TABS = {
  applications: sql`o.status in ('pending', 'changes_requested')`,
  active: sql`o.status = 'active'`,
  suspended: sql`o.status = 'suspended'`,
  rejected: sql`o.status = 'rejected'`,
} as const

const iso = (t: string | Date | null) => (t ? new Date(t).toISOString() : null)
const nameOf = (first: string | null, last: string | null, email: string | null) => `${first ?? ''} ${last ?? ''}`.trim() || email || ''

// the owner's details, joined the same way everywhere
const OWNER = sql`left join lateral (
    select m.user_id, u.email, p.first_name, p.last_name from public.organisation_members m
    join auth.users u on u.id = m.user_id left join public.profiles p on p.id = m.user_id
    where m.organisation_id = o.id and m.role = 'owner' limit 1) ow on true`

export const providersRouter = createTRPCRouter({
  // How many providers are in each tab (the tabs, the menu badge and the dashboard).
  counts: adminProcedure('admin.providers.view').query(async ({ ctx }) => {
    const [r] = await ctx.db.execute<{ applications: number; active: number; suspended: number; rejected: number; all: number }>(sql`
      select count(*) filter (where status in ('pending', 'changes_requested'))::int applications, count(*) filter (where status = 'active')::int active,
             count(*) filter (where status = 'suspended')::int suspended, count(*) filter (where status = 'rejected')::int rejected, count(*)::int "all"
      from public.organisations where type = 'provider'`)
    return r
  }),

  // Newest first, a page at a time; search by provider name, web address, phone, or the owner's name or email.
  list: adminProcedure('admin.providers.view')
    .input(
      z.object({
        q: z.string().trim().max(200).optional(),
        tab: z.enum(['applications', 'active', 'suspended', 'rejected']).optional(),
        sort: z.enum(['applied', 'name', 'status', 'commission']).default('applied'),
        ...paging,
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = [sql`o.type = 'provider'`]
      if (input.tab) where.push(TABS[input.tab])
      if (input.q) {
        const like = `%${input.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
        where.push(sql`(o.name ilike ${like} or o.slug ilike ${like} or o.mobile ilike ${like} or ow.email ilike ${like} or concat_ws(' ', ow.first_name, ow.last_name) ilike ${like} or o.id::text = ${input.q})`)
      }
      const fallback = (await defaultCommission(ctx.db)).bps
      const sortBy = { applied: sql`o.created_at`, name: sql`lower(o.name)`, status: sql`o.status::text`, commission: sql`coalesce(o.commission_bps, ${fallback})` }[input.sort]
      const rows = await ctx.db.execute<{ id: string; name: string; slug: string; status: Status; created_at: string; total: number; status_changed_at: string | null; commission_bps: number | null; created_by: string | null; owner_id: string | null; email: string | null; first_name: string | null; last_name: string | null; members: number }>(sql`
        select o.id, o.name, o.slug, o.status, o.created_at, ${total} total, o.status_changed_at, o.commission_bps, o.created_by, ow.user_id owner_id, ow.email, ow.first_name, ow.last_name,
               (select count(*)::int from public.organisation_members m where m.organisation_id = o.id) members
        from public.organisations o ${OWNER}
        where ${sql.join(where, sql` and `)}
        order by ${orderBy(sortBy, input.dir, sql`o.id`)}
        ${window(input.page, input.limit)}`)
      // the row menu's decisions follow the provider page's: not on an account the admin opened, unless they are the only one who can
      const sole = rows.some((r) => r.created_by === ctx.user.id) && (await soleApprover(ctx.db, ctx.actor, ctx.user.id, 'admin.approvals.decide'))
      return {
        total: rows[0]?.total ?? 0,
        defaultBps: fallback,
        providers: rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          status: r.status,
          appliedAt: iso(r.created_at)!,
          statusChangedAt: iso(r.status_changed_at),
          owner: r.owner_id ? { id: r.owner_id, name: nameOf(r.first_name, r.last_name, r.email), email: r.email } : null,
          members: r.members,
          commissionBps: r.commission_bps ?? fallback,
          ownCommission: r.commission_bps !== null,
          ownRequest: r.created_by === ctx.user.id,
          soleApprover: r.created_by === ctx.user.id && sole,
        })),
      }
    }),

  // One provider: its details, why it has its status, its team and its courses (newest change first). Its activity comes from
  // admin.activity.list.
  get: adminProcedure('admin.providers.read')
    .input(z.object({ slug: z.string().max(80) }))
    .query(async ({ ctx, input }) => {
      const [o] = await ctx.db.execute<{ id: string; name: string; slug: string; mobile: string | null; status: Status; status_note: string | null; status_changed_at: string | null; commission_bps: number | null; terms_accepted_at: string | null; terms_version: string | null; created_by: string | null; created_at: string; logo_path: string | null; headline: string | null; bio: string | null; city: string | null; socials: { facebook?: string; linkedin?: string; youtube?: string } | null; cancellation_policy: string | null; booking_terms: string | null; vat_registered: boolean; vat_number: string | null; order_email: string | null; refund_email: string | null; dispute_email: string | null }>(sql`
        select o.id, o.name, o.slug, o.mobile, o.status, o.status_note, o.status_changed_at, o.commission_bps, o.terms_accepted_at, o.terms_version, o.created_by, o.created_at,
          o.logo_path, o.headline, o.bio, o.city, o.socials, o.cancellation_policy, o.booking_terms,
          o.vat_registered, o.vat_number, o.order_email, o.refund_email, o.dispute_email
        from public.organisations o where o.type = 'provider' and o.slug = ${input.slug}`)
      if (!o) throw new TRPCError({ code: 'NOT_FOUND', message: 'This provider was not found.' })
      const team = await ctx.db.execute<{ user_id: string; email: string; first_name: string | null; last_name: string | null; role: string; status: string; created_at: string }>(sql`
        select m.user_id, u.email, p.first_name, p.last_name, m.role, m.status, m.created_at
        from public.organisation_members m join auth.users u on u.id = m.user_id left join public.profiles p on p.id = m.user_id
        where m.organisation_id = ${o.id}::uuid order by (m.role = 'owner') desc, m.created_at`)
      const courses = await ctx.db.execute<{ id: number; title: string; status: string; method: string | null; methods: string[]; closed_methods: string[]; pending_change: boolean }>(sql`
        select c.id, c.title, c.status, c.method, c.methods, c.closed_methods, exists (select 1 from public.course_revisions r where r.course_id = c.id and r.status = 'pending') pending_change
        from public.courses c where c.organisation_id = ${o.id}::uuid and c.kind = 'provider' and c.status <> 'draft' order by c.updated_at desc limit 50`)
      const [{ n: courseCount }] = await ctx.db.execute<{ n: number }>(sql`select count(*)::int n from public.courses where organisation_id = ${o.id}::uuid and kind = 'provider' and status <> 'draft'`)
      return {
        id: o.id,
        name: o.name,
        slug: o.slug,
        mobile: o.mobile,
        status: o.status,
        statusNote: o.status_note,
        statusChangedAt: iso(o.status_changed_at),
        // their own rate, or null for the platform default
        commissionBps: o.commission_bps,
        defaultCommissionBps: (await defaultCommission(ctx.db)).bps,
        termsAcceptedAt: iso(o.terms_accepted_at),
        termsVersion: o.terms_version,
        appliedAt: iso(o.created_at)!,
        // their settings as they filled them in (read only here): VAT, and where their order, refund and dispute notices go (null:
        // not set yet, so the owner's email is used)
        vat: { registered: o.vat_registered, number: o.vat_number },
        noticeEmails: { order: o.order_email, refund: o.refund_email, dispute: o.dispute_email },
        // what learners will see about them (their public profile and the terms shown before booking), so a decision is made on it
        profile: {
          logoUrl: mediaUrl(o.logo_path),
          headline: o.headline ?? '',
          bio: o.bio ?? '',
          city: o.city ?? '',
          socials: o.socials ?? {},
          cancellationPolicy: o.cancellation_policy ?? '',
          bookingTerms: o.booking_terms ?? '',
        },
        // an admin doesn't decide on a provider account they opened themselves, unless no other admin can (lib/soleApprover.mts:
        // a Full admin, with a written reason)
        ownRequest: o.created_by === ctx.user.id,
        soleApprover: o.created_by === ctx.user.id && (await soleApprover(ctx.db, ctx.actor, ctx.user.id, 'admin.approvals.decide')),
        team: team.map((m) => ({ userId: m.user_id, name: nameOf(m.first_name, m.last_name, m.email), email: m.email, role: m.role, status: m.status, joinedAt: iso(m.created_at)! })),
        // up to 50 of its courses (`courseCount`: all of them), not its drafts (unfinished work, not sent to us yet)
        courses: courses.map((c) => ({ id: c.id, title: c.title, status: c.status, method: c.method, methods: c.methods, closedMethods: c.closed_methods, pendingChange: c.pending_change })),
        courseCount,
      }
    }),

  // Approve, ask for changes, reject, suspend or reinstate. The owner is emailed; an email that can't be sent doesn't undo
  // the decision (the answer says so).
  decide: adminProcedure('admin.panel.open')
    .input(z.object({ organisationId: z.string().uuid(), decision: z.enum(['approve', 'changes', 'reject', 'suspend', 'reinstate']), message: z.string().trim().max(2000).optional(), ownReason: z.string().trim().max(500).optional() }))
    .mutation(async ({ ctx, input, path }) => {
      const rule = DECISIONS[input.decision]
      const [o] = await ctx.db.execute<{ id: string; name: string; status: Status; created_by: string | null }>(sql`
        select id, name, status, created_by from public.organisations where id = ${input.organisationId}::uuid and type = 'provider'`)
      if (!o) throw new TRPCError({ code: 'NOT_FOUND', message: 'This provider was not found.' })
      // their own request: only as the sole approver, with a reason (lib/soleApprover.mts)
      const own = rule.action === 'admin.approvals.decide' && Boolean(o.created_by) && o.created_by === ctx.user.id
      if (own ? !(await soleApprover(ctx.db, ctx.actor, ctx.user.id, rule.action)) : !can(ctx.actor, rule.action, { createdBy: o.created_by ?? undefined })) {
        // logged as refused either way; an admin who may approve but opened this account themselves is told why (a sole approver may
        // have lost the exception since the page loaded: another admin can approve now)
        const why = own && can(ctx.actor, rule.action) ? new TRPCError({ code: 'FORBIDDEN', message: ownRequestRefused(ctx.actor) }) : null
        await refuse(ctx, rule.action, o.id, path).catch((error) => {
          throw why ?? error
        })
      }
      if (own && !ownReasonOk(input.ownReason)) throw new TRPCError({ code: 'BAD_REQUEST', message: OWN_REASON_ERROR, cause: Object.assign(new Error(OWN_REASON_ERROR), { field: 'ownReason' }) })
      if (!rule.from.includes(o.status)) throw statusConflict(o.status, rule.to)
      const message = input.message?.trim() || null
      if (rule.message && !message) throw new TRPCError({ code: 'BAD_REQUEST', message: MESSAGE_ERROR[input.decision]!, cause: Object.assign(new Error(MESSAGE_ERROR[input.decision]), { field: 'message' }) })

      await ctx.db.transaction(async (tx) => {
        // checked again under the row lock: of two decisions at the same moment (two admins, or a double click) only the first is
        // made and emailed; the second is told it has been made
        const [locked] = await tx.execute<{ status: Status }>(sql`select status from public.organisations where id = ${o.id}::uuid for update`)
        if (!locked || !rule.from.includes(locked.status)) throw statusConflict(locked?.status ?? o.status, rule.to)
        await tx.execute(sql`update ${organisations} set status = ${rule.to}, status_note = ${rule.message ? message : null}, status_changed_at = now(), updated_at = now() where id = ${o.id}::uuid`)
        await logActivity(tx, {
          actorUserId: ctx.user.id,
          actorIdentity: 'admin',
          organisationId: o.id,
          action: rule.log,
          targetType: 'organisation',
          targetId: o.id,
          metadata: { from: locked.status, to: rule.to, ...(message ? { message } : {}), ...(own ? { ownRequest: true, ownReason: input.ownReason!.trim() } : {}) },
          ip: ctx.ip,
        })
        // a decision on their own request gets its own line in the log, so it is never missed
        if (own) await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: o.id, action: 'admin.own_request_decided', targetType: 'organisation', targetId: o.id, metadata: { decision: input.decision, reason: input.ownReason!.trim() }, ip: ctx.ip })
      })

      // after the commit, through lib/notify.mts: an email that can't be sent (or an owner who can't be looked up) never fails the
      // decision; `emailed` says whether the owner was told, `outbox` that this copy of the site saves emails instead of sending them
      let emailed = false
      try {
        const { to } = await ownerOf(ctx.db, o.id)
        emailed = await notify(ctx.db, DECISION_EMAIL[input.decision], to, { provider: o.name, message: rule.message ? message ?? '' : '' }, { organisationId: o.id, targetType: 'organisation', targetId: o.id, action: 'email.provider_decision_sent' })
      } catch (error) {
        console.error('provider decision email: could not find the owner', error instanceof Error ? error.message : error)
      }
      return { status: rule.to, emailed, outbox: emailOutbox() }
    }),

  // Delete a provider our team didn't approve (rejected), with everything it made: its team access, venues, courses with their
  // dates, price plans, FAQs, pictures and logo. Only a rejected one: a suspended provider is never deleted (it stays suspended,
  // with its reason and history), and anyone else is rejected or suspended first. Never one with records that must be kept (an
  // order, payout, ledger entry or review of it or its courses, or another provider's date at its venue): it stays not approved.
  // The people on its team keep their logins (they can still sign in as learners). The admin confirms in a pop-up; everything
  // is checked again under the row lock (two clicks or two admins delete it once), logged, and its files removed after the commit.
  remove: adminProcedure('admin.providers.remove')
    .input(z.object({ organisationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const gone = await ctx.db.transaction(async (tx) => {
        const [o] = await tx.execute<{ id: string; name: string; slug: string; status: Status; logo_path: string | null }>(sql`
          select id, name, slug, status, logo_path from public.organisations where id = ${input.organisationId}::uuid and type = 'provider' for update`)
        if (!o) throw new TRPCError({ code: 'NOT_FOUND', message: 'This provider has already been deleted. Reload the page.' })
        if (o.status !== 'rejected') throw new TRPCError({ code: 'CONFLICT', message: `Only a provider that wasn’t approved can be deleted. This one is ${STATUS_WORDS[o.status]}. Reload the page to see it.` })
        const mine = sql`(select c.id from public.courses c where c.organisation_id = ${o.id}::uuid)`
        const [r] = await tx.execute<{ orders: number; payouts: number; ledger: number; reviews: number; borrowed: number }>(sql`
          select
            (select count(*)::int from public.orders x where x.provider_id = ${o.id}::uuid or x.course_id in ${mine}) orders,
            (select count(*)::int from public.payouts x where x.provider_id = ${o.id}::uuid) payouts,
            (select count(*)::int from public.ledger_entries x where x.provider_id = ${o.id}::uuid) ledger,
            (select count(*)::int from public.reviews x where x.provider_id = ${o.id}::uuid or x.course_id in ${mine}) reviews,
            (select count(*)::int from public.cohorts h join public.venues v on v.id = h.venue_id
              where v.organisation_id = ${o.id}::uuid and h.course_id not in ${mine}) borrowed`)
        const kept = [
          r.orders && `${r.orders} ${r.orders === 1 ? 'order' : 'orders'}`,
          r.payouts && `${r.payouts} ${r.payouts === 1 ? 'payout' : 'payouts'}`,
          r.ledger && `${r.ledger} money ${r.ledger === 1 ? 'record' : 'records'}`,
          r.reviews && `${r.reviews} ${r.reviews === 1 ? 'review' : 'reviews'}`,
          r.borrowed && `${r.borrowed} other ${r.borrowed === 1 ? 'course’s date' : 'courses’ dates'} at its venues`,
        ].filter(Boolean)
        if (kept.length) throw new TRPCError({ code: 'CONFLICT', message: `${o.name} has ${kept.join(', ')}. Those records are kept, so it can’t be deleted: it stays not approved.` })

        const images = await tx.execute<{ path: string }>(sql`select i.path from public.course_images i where i.course_id in ${mine}`)
        // its courses take their dates, changes, units, exams, FAQs and picture rows with them (cascade); its team, staff visits and
        // FAQs go with the provider (cascade)
        const courses = await tx.execute<{ id: number }>(sql`delete from public.courses where organisation_id = ${o.id}::uuid returning id`)
        const venues = await tx.execute<{ id: string }>(sql`delete from public.venues where organisation_id = ${o.id}::uuid returning id`)
        await tx.execute(sql`delete from public.price_plans where organisation_id = ${o.id}::uuid`)
        await tx.execute(sql`delete from public.organisations where id = ${o.id}::uuid`)
        await logActivity(tx, {
          actorUserId: ctx.user.id,
          actorIdentity: 'admin',
          organisationId: o.id,
          action: 'admin.provider_deleted',
          targetType: 'organisation',
          targetId: o.id,
          metadata: { name: o.name, slug: o.slug, courses: courses.length, venues: venues.length },
          ip: ctx.ip,
        })
        return { name: o.name, files: [...images.map((i) => i.path), ...(o.logo_path ? [o.logo_path] : [])] }
      })
      await removeMedia(gone.files)
      return { name: gone.name }
    }),

  // A provider's own commission, or back to the platform default (null). Applies to bookings made after the change.
  setCommission: adminProcedure('admin.finance.settings')
    .input(z.object({ organisationId: z.string().uuid(), bps: bps.nullable() }))
    .mutation(async ({ ctx, input }) => {
      const [o] = await ctx.db.execute<{ commission_bps: number | null }>(sql`select commission_bps from public.organisations where id = ${input.organisationId}::uuid and type = 'provider'`)
      if (!o) throw new TRPCError({ code: 'NOT_FOUND', message: 'This provider was not found.' })
      if (o.commission_bps === input.bps) return { commissionBps: input.bps, unchanged: true }
      const changed = await ctx.db.transaction(async (tx) => {
        // under the row lock: two saves at the same moment change (and log) it once, and the log shows the rate it really replaced
        const [locked] = await tx.execute<{ commission_bps: number | null }>(sql`select commission_bps from public.organisations where id = ${input.organisationId}::uuid for update`)
        if (locked.commission_bps === input.bps) return false
        await tx.execute(sql`update ${organisations} set commission_bps = ${input.bps}, updated_at = now() where id = ${input.organisationId}::uuid`)
        await logActivity(tx, {
          actorUserId: ctx.user.id,
          actorIdentity: 'admin',
          organisationId: input.organisationId,
          action: 'admin.provider_commission_changed',
          targetType: 'organisation',
          targetId: input.organisationId,
          metadata: { fromPercent: percent(locked.commission_bps) ?? 'default', toPercent: percent(input.bps) ?? 'default' },
          ip: ctx.ip,
        })
        return true
      })
      return { commissionBps: input.bps, unchanged: !changed }
    }),
})
