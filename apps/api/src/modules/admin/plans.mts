import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { and, eq, pricePlans, sql } from '@readtraining/db'
import { can } from '@readtraining/permissions'
import type { AdminAction } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import { OWN_REASON_ERROR, ownReasonOk, ownRequestRefused, soleApprover } from '../../lib/soleApprover.mjs'
import { adminProcedure, createTRPCRouter, refuse } from '../../trpc/trpc.mjs'
import { syncPlanPrices } from '../provider/plans.mjs'
import type { Tier } from '../provider/plans.mjs'

// Our team's check of providers' price plans (provider/plans.mts): a new plan, or a change to one, waits here. Approving makes the
// waiting packages the ones learners see and moves the price of every date and course on the plan to its cheapest package; asking
// for changes sends it back with a note (learners keep the approved packages meanwhile). Nobody decides on a plan they sent
// themselves, except a sole approver with a reason (lib/soleApprover.mts), as for courses.

const iso = (v: string | Date | null) => (v ? new Date(v).toISOString() : null)
const CHANGED = 'This plan has changed since you opened it. Reload the page to see the latest version, then decide.'

export const adminPlansRouter = createTRPCRouter({
  // Plans waiting for a decision, oldest first; or sent back for changes, latest first.
  queue: adminProcedure('admin.panel.open')
    .input(z.object({ tab: z.enum(['waiting', 'changes']) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute<{ id: string; name: string; submitted_at: string | null; decided_at: string | null; status_note: string | null; provider: string; provider_status: string; submitted_by: string | null; is_new: boolean; packages: number }>(sql`
        select p.id, p.name, p.submitted_at, p.decided_at, p.status_note, o.name provider, o.status provider_status, p.submitted_by, p.tiers is null is_new,
               jsonb_array_length(coalesce(p.draft, p.tiers)) packages
        from public.price_plans p join public.organisations o on o.id = p.organisation_id
        where p.status = ${input.tab === 'waiting' ? 'pending' : 'changes'}
        order by ${input.tab === 'waiting' ? sql`p.submitted_at asc` : sql`p.decided_at desc nulls last`}`)
      const sole = rows.some((r) => r.submitted_by === ctx.user.id) && (await soleApprover(ctx.db, ctx.actor, ctx.user.id, 'admin.approvals.decide'))
      return rows.map((r) => ({
        planId: r.id,
        name: r.name,
        provider: r.provider,
        providerStatus: r.provider_status,
        isNew: r.is_new,
        packages: r.packages,
        at: iso(input.tab === 'waiting' ? r.submitted_at : r.decided_at),
        note: r.status_note,
        own: r.submitted_by === ctx.user.id,
        soleApprover: r.submitted_by === ctx.user.id && sole,
      }))
    }),

  // One plan: the packages learners see now, the waiting ones, its provider and how many dates and courses use it.
  get: adminProcedure('admin.panel.open')
    .input(z.object({ planId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [p] = await ctx.db.execute<{ id: string; name: string; tiers: Tier[] | null; draft: Tier[] | null; status: string; status_note: string | null; submitted_at: string | null; submitted_by: string | null; updated_at: string; provider: string; provider_id: string; dates: number; courses: number }>(sql`
        select p.id, p.name, p.tiers, p.draft, p.status, p.status_note, p.submitted_at, p.submitted_by, p.updated_at, o.name provider, o.id provider_id,
               (select count(*)::int from public.cohorts k where k.plan_id = p.id and k.cancelled_at is null and k.ends_on >= current_date) dates,
               (select count(*)::int from public.courses c where c.plan_id = p.id) courses
        from public.price_plans p join public.organisations o on o.id = p.organisation_id where p.id = ${input.planId}::uuid`)
      if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'This price plan was not found.' })
      const own = p.submitted_by === ctx.user.id
      return {
        id: p.id,
        name: p.name,
        tiers: p.tiers,
        draft: p.draft,
        status: p.status,
        statusNote: p.status_note,
        submittedAt: iso(p.submitted_at),
        version: iso(p.updated_at),
        provider: { id: p.provider_id, name: p.provider },
        used: { dates: p.dates, courses: p.courses },
        own,
        soleApprover: own && (await soleApprover(ctx.db, ctx.actor, ctx.user.id, 'admin.approvals.decide')),
      }
    }),

  // Approve the waiting packages, or ask for changes (with a note the provider sees). `seen`: the version the admin looked at.
  decide: adminProcedure('admin.panel.open')
    .input(z.object({ planId: z.string().uuid(), decision: z.enum(['approve', 'changes']), message: z.string().trim().max(2000).optional(), ownReason: z.string().trim().max(500).optional(), seen: z.string().datetime() }))
    .mutation(async ({ ctx, input, path }) => {
      const [p] = await ctx.db.select().from(pricePlans).where(eq(pricePlans.id, input.planId))
      if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'This price plan was not found.' })
      const action: AdminAction = 'admin.approvals.decide'
      const own = p.submittedBy === ctx.user.id
      if (own ? !(await soleApprover(ctx.db, ctx.actor, ctx.user.id, action)) : !can(ctx.actor, action)) {
        const why = own && can(ctx.actor, action) ? new TRPCError({ code: 'FORBIDDEN', message: ownRequestRefused(ctx.actor) }) : null
        await refuse(ctx, action, p.organisationId, path).catch((error) => {
          throw why ?? error
        })
      }
      if (own && !ownReasonOk(input.ownReason)) throw new TRPCError({ code: 'BAD_REQUEST', message: OWN_REASON_ERROR, cause: Object.assign(new Error(OWN_REASON_ERROR), { field: 'ownReason' }) })
      const message = input.message?.trim() || null
      if (input.decision === 'changes' && !message) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Say what the provider needs to change.', cause: Object.assign(new Error('Say what the provider needs to change.'), { field: 'message' }) })
      const now = new Date()
      return ctx.db.transaction(async (tx) => {
        // the provider's saves lock this row too (provider/plans.mts lockPlan): whichever comes second sees the other
        const [locked] = await tx.select().from(pricePlans).where(and(eq(pricePlans.id, p.id))).for('update')
        if (!locked || locked.status !== 'pending' || !locked.draft) throw new TRPCError({ code: 'CONFLICT', message: 'This plan has already been decided, or has nothing waiting. Reload the page.' })
        if (locked.updatedAt.getTime() > new Date(input.seen).getTime()) throw new TRPCError({ code: 'CONFLICT', message: CHANGED })
        if (input.decision === 'approve') {
          await tx.update(pricePlans).set({ tiers: locked.draft, draft: null, status: 'approved', statusNote: null, decidedAt: now, decidedBy: ctx.user.id, updatedAt: now }).where(eq(pricePlans.id, p.id))
          await syncPlanPrices(tx, p.id)
        } else {
          await tx.update(pricePlans).set({ status: 'changes', statusNote: message, decidedAt: now, decidedBy: ctx.user.id, updatedAt: now }).where(eq(pricePlans.id, p.id))
        }
        const log = (a: string, metadata: Record<string, unknown>) =>
          logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: p.organisationId, action: a, targetType: 'price_plan', targetId: p.id, metadata, ip: ctx.ip })
        await log(input.decision === 'approve' ? 'admin.plan_approved' : 'admin.plan_changes_requested', { name: p.name, ...(message ? { message } : {}), ...(own ? { ownRequest: true, ownReason: input.ownReason!.trim() } : {}) })
        if (own) await log('admin.own_request_decided', { decision: input.decision, reason: input.ownReason!.trim() })
        return { status: input.decision === 'approve' ? 'approved' : 'changes' }
      })
    }),
})
