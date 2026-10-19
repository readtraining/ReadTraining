import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { organisations, sql } from '@readtraining/db'
import { can } from '@readtraining/permissions'
import type { AdminAction } from '@readtraining/permissions'

import { renderEmail, wordsFor } from '../../emails/templates.mjs'
import { logActivity } from '../../lib/activity.mjs'
import { sendEmail } from '../../lib/email.mjs'
import { siteUrl } from '../../lib/supabase.mjs'
import { bps, defaultCommission, percent } from './commission.mjs'
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
  counts: adminProcedure('admin.panel.open').query(async ({ ctx }) => {
    const [r] = await ctx.db.execute<{ applications: number; active: number; suspended: number; rejected: number; all: number }>(sql`
      select count(*) filter (where status in ('pending', 'changes_requested'))::int applications, count(*) filter (where status = 'active')::int active,
             count(*) filter (where status = 'suspended')::int suspended, count(*) filter (where status = 'rejected')::int rejected, count(*)::int "all"
      from public.organisations where type = 'provider'`)
    return r
  }),

  // Newest first, a page at a time; search by provider name, web address, phone, or the owner's name or email.
  list: adminProcedure('admin.panel.open')
    .input(
      z.object({
        q: z.string().trim().max(200).optional(),
        tab: z.enum(['applications', 'active', 'suspended', 'rejected']).optional(),
        cursor: z.object({ at: z.string().datetime({ offset: true }), id: z.string().uuid() }).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = [sql`o.type = 'provider'`]
      if (input.tab) where.push(TABS[input.tab])
      if (input.cursor) where.push(sql`(o.created_at, o.id) < (${input.cursor.at}::timestamptz, ${input.cursor.id}::uuid)`)
      if (input.q) {
        const like = `%${input.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
        where.push(sql`(o.name ilike ${like} or o.slug ilike ${like} or o.mobile ilike ${like} or ow.email ilike ${like} or concat_ws(' ', ow.first_name, ow.last_name) ilike ${like} or o.id::text = ${input.q})`)
      }
      const rows = await ctx.db.execute<{ id: string; name: string; slug: string; status: Status; created_at: string; status_changed_at: string | null; commission_bps: number | null; owner_id: string | null; email: string | null; first_name: string | null; last_name: string | null; members: number }>(sql`
        select o.id, o.name, o.slug, o.status, o.created_at, o.status_changed_at, o.commission_bps, ow.user_id owner_id, ow.email, ow.first_name, ow.last_name,
               (select count(*)::int from public.organisation_members m where m.organisation_id = o.id) members
        from public.organisations o ${OWNER}
        where ${sql.join(where, sql` and `)}
        order by o.created_at desc, o.id desc
        limit ${input.limit + 1}`)
      const page = rows.slice(0, input.limit)
      const last = page[page.length - 1]
      const fallback = (await defaultCommission(ctx.db)).bps
      return {
        defaultBps: fallback,
        providers: page.map((r) => ({
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
        })),
        next: rows.length > input.limit ? { at: iso(last.created_at)!, id: last.id } : null,
      }
    }),

  // One provider: its details, why it has its status, its team. Its activity comes from admin.activity.list.
  get: adminProcedure('admin.panel.open')
    .input(z.object({ slug: z.string().max(80) }))
    .query(async ({ ctx, input }) => {
      const [o] = await ctx.db.execute<{ id: string; name: string; slug: string; mobile: string | null; status: Status; status_note: string | null; status_changed_at: string | null; commission_bps: number | null; terms_accepted_at: string | null; terms_version: string | null; created_by: string | null; created_at: string }>(sql`
        select o.id, o.name, o.slug, o.mobile, o.status, o.status_note, o.status_changed_at, o.commission_bps, o.terms_accepted_at, o.terms_version, o.created_by, o.created_at
        from public.organisations o where o.type = 'provider' and o.slug = ${input.slug}`)
      if (!o) throw new TRPCError({ code: 'NOT_FOUND', message: 'This provider was not found.' })
      const team = await ctx.db.execute<{ user_id: string; email: string; first_name: string | null; last_name: string | null; role: string; status: string; created_at: string }>(sql`
        select m.user_id, u.email, p.first_name, p.last_name, m.role, m.status, m.created_at
        from public.organisation_members m join auth.users u on u.id = m.user_id left join public.profiles p on p.id = m.user_id
        where m.organisation_id = ${o.id}::uuid order by (m.role = 'owner') desc, m.created_at`)
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
        // an admin never decides on a provider account they opened themselves
        ownRequest: o.created_by === ctx.user.id,
        team: team.map((m) => ({ userId: m.user_id, name: nameOf(m.first_name, m.last_name, m.email), email: m.email, role: m.role, status: m.status, joinedAt: iso(m.created_at)! })),
      }
    }),

  // Approve, ask for changes, reject, suspend or reinstate. The owner is emailed; an email that can't be sent doesn't undo
  // the decision (the answer says so).
  decide: adminProcedure('admin.panel.open')
    .input(z.object({ organisationId: z.string().uuid(), decision: z.enum(['approve', 'changes', 'reject', 'suspend', 'reinstate']), message: z.string().trim().max(2000).optional() }))
    .mutation(async ({ ctx, input, path }) => {
      const rule = DECISIONS[input.decision]
      const [o] = await ctx.db.execute<{ id: string; name: string; status: Status; created_by: string | null }>(sql`
        select id, name, status, created_by from public.organisations where id = ${input.organisationId}::uuid and type = 'provider'`)
      if (!o) throw new TRPCError({ code: 'NOT_FOUND', message: 'This provider was not found.' })
      if (!can(ctx.actor, rule.action, { createdBy: o.created_by ?? undefined })) await refuse(ctx, rule.action, o.id, path)
      if (!rule.from.includes(o.status)) throw new TRPCError({ code: 'CONFLICT', message: 'This provider’s status has changed. Reload the page to see it.' })
      const message = input.message?.trim() || null
      if (rule.message && !message) throw new TRPCError({ code: 'BAD_REQUEST', message: MESSAGE_ERROR[input.decision]!, cause: Object.assign(new Error(MESSAGE_ERROR[input.decision]), { field: 'message' }) })

      await ctx.db.transaction(async (tx) => {
        await tx.execute(sql`update ${organisations} set status = ${rule.to}, status_note = ${rule.message ? message : null}, status_changed_at = now(), updated_at = now() where id = ${o.id}::uuid`)
        await logActivity(tx, {
          actorUserId: ctx.user.id,
          actorIdentity: 'admin',
          organisationId: o.id,
          action: rule.log,
          targetType: 'organisation',
          targetId: o.id,
          metadata: { from: o.status, to: rule.to, ...(message ? { message } : {}) },
          ip: ctx.ip,
        })
      })

      const [owner] = await ctx.db.execute<{ email: string | null; first_name: string | null }>(sql`
        select u.email, p.first_name from public.organisation_members m join auth.users u on u.id = m.user_id
        left join public.profiles p on p.id = m.user_id where m.organisation_id = ${o.id}::uuid and m.role = 'owner' limit 1`)
      const emailed = owner?.email
        ? await sendEmail(renderEmail(DECISION_EMAIL[input.decision], await wordsFor(ctx.db, DECISION_EMAIL[input.decision]), { firstName: owner.first_name ?? '', provider: o.name, message: rule.message ? message ?? '' : '' }, siteUrl, owner.email))
        : false
      if (emailed) await logActivity(ctx.db, { actorUserId: null, actorIdentity: 'system', organisationId: o.id, action: 'email.provider_decision_sent', targetType: 'organisation', targetId: o.id, metadata: { decision: input.decision }, ip: null })
      return { status: rule.to, emailed }
    }),

  // A provider's own commission, or back to the platform default (null). Applies to bookings made after the change.
  setCommission: adminProcedure('admin.finance.settings')
    .input(z.object({ organisationId: z.string().uuid(), bps: bps.nullable() }))
    .mutation(async ({ ctx, input }) => {
      const [o] = await ctx.db.execute<{ commission_bps: number | null }>(sql`select commission_bps from public.organisations where id = ${input.organisationId}::uuid and type = 'provider'`)
      if (!o) throw new TRPCError({ code: 'NOT_FOUND', message: 'This provider was not found.' })
      if (o.commission_bps === input.bps) return { commissionBps: input.bps }
      await ctx.db.transaction(async (tx) => {
        await tx.execute(sql`update ${organisations} set commission_bps = ${input.bps}, updated_at = now() where id = ${input.organisationId}::uuid`)
        await logActivity(tx, {
          actorUserId: ctx.user.id,
          actorIdentity: 'admin',
          organisationId: input.organisationId,
          action: 'admin.provider_commission_changed',
          targetType: 'organisation',
          targetId: input.organisationId,
          metadata: { fromPercent: percent(o.commission_bps) ?? 'default', toPercent: percent(input.bps) ?? 'default' },
          ip: ctx.ip,
        })
      })
      return { commissionBps: input.bps }
    }),
})
