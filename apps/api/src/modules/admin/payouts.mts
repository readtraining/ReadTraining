import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { ledgerEntries, organisations, payouts, platformSettings, sql, type SQL } from '@readtraining/db'
import { can } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { payable } from '../../lib/money.mjs'
import { orderBy, paging, total, window } from '../../lib/paging.mjs'
import { adminProcedure, createTRPCRouter, refuse } from '../../trpc/trpc.mjs'
import { DEFAULT_FEES, FEES_KEY, fees, newRef } from './money.mjs'

// Payouts, the ledger and the fee settings (Part B, B4). A payout run works out, for each provider, what the ledger owes them up
// to a chosen day, less what is held back for their open refund requests and disputes and less payouts already waiting; it makes
// draft payouts. A second admin (never the one who made it) approves each one; then it is marked as sent, which writes the
// "payout" ledger entry. No money moves: until a payment provider is connected, "sent" records a payment made outside the
// platform (a bank transfer). Payouts can be held with a reason and released. Adjustments and charges put a correction on a
// provider's balance (the "adjustments" switch). The ledger itself never changes (append-only).

const fieldError = (field: string, message: string) => new TRPCError({ code: 'BAD_REQUEST', message, cause: Object.assign(new Error(message), { field }) })
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date, like 2026-11-30.')
const endOf = (d: string) => sql`((${d}::date + 1)::timestamp at time zone 'Europe/London')`
const who = (alias: string) => sql.raw(`(select nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '') from public.profiles p where p.id = ${alias})`)
const p = (n: number) => n / 100

// every provider with money in the ledger: balance up to the day, held back, already waiting in unsent payouts, and payable now
// the provider's share of open amounts on their orders (what they would lose if each went against them): open refund
// requests, or open disputes. Each order's own split is used, so a Klarna order's 6% fee and a card order's 3% both count.
const heldFrom = (open: SQL) => sql`(select coalesce(sum(round(x.amount_pence::numeric * lp.provider_pence / nullif(lp.gross_pence, 0))), 0)
  from (${open}) x
  join public.orders o on o.id = x.order_id
  join ${ledgerEntries} lp on lp.order_id = o.id and lp.type = 'purchase'
  where o.provider_id = g.id)::int`
async function owed(db: typeof Db, periodEnd: string) {
  const rows = await db.execute<{ id: string; name: string; slug: string; status: string; balance: number; held_refunds: number; held_disputes: number; waiting: number }>(sql`
    select g.id, g.name, g.slug, g.status,
      (select coalesce(sum(l.provider_pence), 0) from ${ledgerEntries} l where l.provider_id = g.id and l.at < ${endOf(periodEnd)})::int balance,
      ${heldFrom(sql`select r.order_id, r.amount_pence from public.refunds r where r.status = 'requested'`)} held_refunds,
      ${heldFrom(sql`select d.order_id, d.amount_pence from public.disputes d where d.status = 'open'`)} held_disputes,
      (select coalesce(sum(amount_pence), 0) from ${payouts} w where w.provider_id = g.id and w.status <> 'sent')::int waiting
    from ${organisations} g
    where g.type = 'provider' and exists (select 1 from ${ledgerEntries} l where l.provider_id = g.id)
    order by g.name`)
  return rows.map((r) => {
    const held = r.held_refunds + r.held_disputes
    return { ...r, held, payable: payable(r.balance - r.waiting, held) }
  })
}

const STATUS = ['draft', 'approved', 'held', 'sent'] as const
type PayoutRow = { id: string; ref: string; provider_id: string; status: string; created_by: string | null; approved_by: string | null; amount_pence: number }
const lockPayout = async (tx: Parameters<Parameters<typeof Db.transaction>[0]>[0], id: string) => {
  const [row] = await tx.execute<PayoutRow>(sql`select id, ref, provider_id, status, created_by, approved_by, amount_pence from ${payouts} where id = ${id}::uuid for update`)
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'That payout no longer exists.' })
  return row
}

export const payoutsRouter = createTRPCRouter({
  // What a run up to `periodEnd` would pay each provider.
  preview: adminProcedure('admin.orders.view')
    .input(z.object({ periodEnd: day }))
    .query(async ({ ctx, input }) => {
      const list = await owed(ctx.db, input.periodEnd)
      return list.map((r) => ({ providerId: r.id, name: r.name, slug: r.slug, status: r.status, balance: p(r.balance), held: p(r.held), heldRefunds: p(r.held_refunds), heldDisputes: p(r.held_disputes), waiting: p(r.waiting), payable: p(r.payable) }))
    }),

  list: adminProcedure('admin.orders.view')
    .input(z.object({ status: z.enum(STATUS).optional(), providerId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const where = [sql`true`]
      if (input.status) where.push(sql`w.status = ${input.status}`)
      if (input.providerId) where.push(sql`w.provider_id = ${input.providerId}::uuid`)
      const rows = await ctx.db.execute<{ id: string; ref: string; amount_pence: number; held_back_pence: number; status: string; hold_reason: string | null; period_end: string; created_at: string; approved_at: string | null; sent_at: string | null; provider: string; slug: string; created_by_id: string | null; created_by: string | null; approved_by: string | null; sent_by: string | null }>(sql`
        select w.id, w.ref, w.amount_pence, w.held_back_pence, w.status, w.hold_reason, to_char(w.period_end, 'YYYY-MM-DD') period_end, w.created_at, w.approved_at, w.sent_at,
               g.name provider, g.slug, w.created_by created_by_id, ${who('w.created_by')} created_by, ${who('w.approved_by')} approved_by, ${who('w.sent_by')} sent_by
        from ${payouts} w join ${organisations} g on g.id = w.provider_id
        where ${sql.join(where, sql` and `)}
        order by (w.status = 'sent'), w.created_at desc limit 300`)
      const [counts] = await ctx.db.execute<Record<(typeof STATUS)[number], number>>(sql`
        select count(*) filter (where status = 'draft')::int draft, count(*) filter (where status = 'approved')::int approved,
               count(*) filter (where status = 'held')::int held, count(*) filter (where status = 'sent')::int sent from ${payouts}`)
      return {
        counts,
        payouts: rows.map((w) => ({ id: w.id, ref: w.ref, amount: p(w.amount_pence), heldBack: p(w.held_back_pence), status: w.status, holdReason: w.hold_reason, periodEnd: w.period_end, at: new Date(w.created_at).toISOString(), approvedAt: w.approved_at && new Date(w.approved_at).toISOString(), sentAt: w.sent_at && new Date(w.sent_at).toISOString(), provider: w.provider, providerSlug: w.slug, createdBy: w.created_by, mine: w.created_by_id === ctx.user.id, approvedBy: w.approved_by, sentBy: w.sent_by })),
      }
    }),

  // One payout and the ledger entries it covers (since the provider's last sent payout, up to its day).
  get: adminProcedure('admin.orders.view')
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [w] = await ctx.db.execute<{ id: string; ref: string; provider_id: string; period_end: string; amount_pence: number; status: string; provider: string }>(sql`
        select w.id, w.ref, w.provider_id, to_char(w.period_end, 'YYYY-MM-DD') period_end, w.amount_pence, w.status, g.name provider from ${payouts} w join ${organisations} g on g.id = w.provider_id where w.id = ${input.id}::uuid`)
      if (!w) throw new TRPCError({ code: 'NOT_FOUND', message: 'That payout no longer exists.' })
      const [prev] = await ctx.db.execute<{ period_end: string }>(sql`select to_char(max(period_end), 'YYYY-MM-DD') period_end from ${payouts} where provider_id = ${w.provider_id}::uuid and status = 'sent' and id <> ${w.id}::uuid and period_end < ${w.period_end}::date`)
      const entries = await ctx.db.execute<{ id: number; at: string; type: string; gross_pence: number; provider_pence: number; note: string | null; ref: string | null }>(sql`
        select l.id, l.at, l.type, l.gross_pence, l.provider_pence, l.note, o.ref from ${ledgerEntries} l left join public.orders o on o.id = l.order_id
        where l.provider_id = ${w.provider_id}::uuid and l.type <> 'payout' and l.at < ${endOf(w.period_end)} ${prev?.period_end ? sql`and l.at >= ${endOf(prev.period_end)}` : sql``}
        order by l.at, l.id`)
      return { id: w.id, ref: w.ref, provider: w.provider, periodEnd: w.period_end, amount: p(w.amount_pence), status: w.status, entries: entries.map((e) => ({ id: Number(e.id), at: new Date(e.at).toISOString(), type: e.type, gross: p(e.gross_pence), provider: p(e.provider_pence), note: e.note, ref: e.ref })) }
    }),

  // Draft payouts for every provider with something payable up to the day (none twice: what is already waiting is subtracted).
  run: adminProcedure('admin.payouts.manage')
    .input(z.object({ periodEnd: day }))
    .mutation(async ({ ctx, input }) => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' })
      if (input.periodEnd > today) throw fieldError('periodEnd', 'Choose today or an earlier day.')
      const list = (await owed(ctx.db, input.periodEnd)).filter((r) => r.payable > 0 && r.status !== 'rejected')
      const made: string[] = []
      for (const r of list) {
        const ref = await newRef(ctx.db, 'PO')
        await ctx.db.transaction(async (tx) => {
          await tx.insert(payouts).values({ ref, providerId: r.id, periodEnd: input.periodEnd, amountPence: r.payable, heldBackPence: r.held, createdBy: ctx.user.id, status: r.status === 'suspended' ? 'held' : 'draft', holdReason: r.status === 'suspended' ? 'The provider is suspended.' : null })
          await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: r.id, action: 'admin.payout_created', targetType: 'payout', targetId: ref, metadata: { pounds: (r.payable / 100).toFixed(2) }, ip: ctx.ip })
        })
        made.push(ref)
      }
      return { created: made.length }
    }),

  // The second admin's approval: never the admin who made the payout.
  approve: adminProcedure('admin.payouts.approve')
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input, path }) => {
      return ctx.db.transaction(async (tx) => {
        const w = await lockPayout(tx, input.id)
        if (!can(ctx.actor, 'admin.payouts.approve', { createdBy: w.created_by })) await refuse(ctx, 'admin.payouts.approve', w.provider_id, path)
        if (w.status !== 'draft') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only a payout waiting for approval can be approved.' })
        await tx.execute(sql`update ${payouts} set status = 'approved', approved_by = ${ctx.user.id}::uuid, approved_at = now() where id = ${w.id}::uuid`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: w.provider_id, action: 'admin.payout_approved', targetType: 'payout', targetId: w.ref, metadata: { pounds: (w.amount_pence / 100).toFixed(2) }, ip: ctx.ip })
        return { ok: true }
      })
    }),

  hold: adminProcedure('admin.payouts.manage')
    .input(z.object({ id: z.string().uuid(), reason: z.string().trim().min(3, 'Enter why the payout is held.').max(500) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const w = await lockPayout(tx, input.id)
        if (w.status === 'sent' || w.status === 'held') throw new TRPCError({ code: 'BAD_REQUEST', message: w.status === 'sent' ? 'This payout has been sent.' : 'This payout is already held.' })
        await tx.execute(sql`update ${payouts} set status = 'held', hold_reason = ${input.reason} where id = ${w.id}::uuid`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: w.provider_id, action: 'admin.payout_held', targetType: 'payout', targetId: w.ref, metadata: { reason: input.reason }, ip: ctx.ip })
        return { ok: true }
      })
    }),

  // Released, it goes back to where it was: approved if a second admin had approved it, otherwise waiting for approval.
  release: adminProcedure('admin.payouts.manage')
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const w = await lockPayout(tx, input.id)
        if (w.status !== 'held') throw new TRPCError({ code: 'BAD_REQUEST', message: 'This payout is not held.' })
        await tx.execute(sql`update ${payouts} set status = ${w.approved_by ? 'approved' : 'draft'}, hold_reason = null where id = ${w.id}::uuid`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: w.provider_id, action: 'admin.payout_released', targetType: 'payout', targetId: w.ref, metadata: {}, ip: ctx.ip })
        return { ok: true }
      })
    }),

  // Record that an approved payout was paid (outside the platform until a payment provider is connected): the ledger's
  // "payout" entry takes it off the provider's balance.
  markSent: adminProcedure('admin.payouts.manage')
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const w = await lockPayout(tx, input.id)
        if (w.status !== 'approved') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only an approved payout can be marked as sent.' })
        await tx.execute(sql`update ${payouts} set status = 'sent', sent_by = ${ctx.user.id}::uuid, sent_at = now() where id = ${w.id}::uuid`)
        await tx.insert(ledgerEntries).values({ type: 'payout', providerId: w.provider_id, payoutId: w.id, providerPence: -w.amount_pence, note: `Payout ${w.ref}`, createdBy: ctx.user.id })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: w.provider_id, action: 'admin.payout_sent', targetType: 'payout', targetId: w.ref, metadata: { pounds: (w.amount_pence / 100).toFixed(2) }, ip: ctx.ip })
        return { ok: true }
      })
    }),
})

const TYPES = ['purchase', 'refund', 'cancel', 'dispute', 'charge', 'adjust', 'payout'] as const
export const ledgerRouter = createTRPCRouter({
  // Every entry in numbered pages, newest or oldest first by date (an entry can be dated earlier than it was saved, like a
  // payout up to a past day); by provider and type. Totals for everything that matches, and how many of each type.
  list: adminProcedure('admin.orders.view')
    .input(z.object({ providerId: z.string().uuid().optional(), type: z.enum(TYPES).optional(), ...paging }))
    .query(async ({ ctx, input }) => {
      const where = [sql`true`]
      if (input.providerId) where.push(sql`l.provider_id = ${input.providerId}::uuid`)
      if (input.type) where.push(sql`l.type = ${input.type}`)
      const totalsWhere = sql.join(where, sql` and `)
      const rows = await ctx.db.execute<{ id: number; total: number; at: string; type: string; gross_pence: number; fee_pence: number; commission_pence: number; provider_pence: number; note: string | null; ref: string | null; payout_ref: string | null; provider: string | null; by: string | null }>(sql`
        select l.id, ${total} total, l.at, l.type, l.gross_pence, l.fee_pence, l.commission_pence, l.provider_pence, l.note, o.ref, w.ref payout_ref, g.name provider, ${who('l.created_by')} as "by"
        from ${ledgerEntries} l left join public.orders o on o.id = l.order_id left join ${payouts} w on w.id = l.payout_id left join ${organisations} g on g.id = l.provider_id
        where ${sql.join(where, sql` and `)} order by ${orderBy(sql`l.at`, input.dir, sql`l.id`)} ${window(input.page, input.limit)}`)
      const [t] = await ctx.db.execute<{ gross: number; fee: number; commission: number; provider: number }>(sql`
        select coalesce(sum(gross_pence), 0)::int gross, coalesce(sum(fee_pence), 0)::int fee, coalesce(sum(commission_pence), 0)::int commission, coalesce(sum(provider_pence), 0)::int provider
        from ${ledgerEntries} l where ${totalsWhere}`)
      const byType = await ctx.db.execute<{ type: (typeof TYPES)[number]; n: number }>(sql`
        select l.type, count(*)::int n from ${ledgerEntries} l where ${input.providerId ? sql`l.provider_id = ${input.providerId}::uuid` : sql`true`} group by l.type`)
      const counts: Record<(typeof TYPES)[number] | 'all', number> = { all: 0, purchase: 0, refund: 0, cancel: 0, dispute: 0, charge: 0, adjust: 0, payout: 0 }
      for (const r of byType) (counts[r.type] = r.n), (counts.all += r.n)
      return {
        counts,
        total: rows[0]?.total ?? 0,
        totals: { gross: p(t.gross), fee: p(t.fee), commission: p(t.commission), provider: p(t.provider) },
        entries: rows.map((e) => ({ id: Number(e.id), at: new Date(e.at).toISOString(), type: e.type, gross: p(e.gross_pence), fee: p(e.fee_pence), commission: p(e.commission_pence), provider: p(e.provider_pence), note: e.note, orderRef: e.ref, payoutRef: e.payout_ref, providerName: e.provider, by: e.by })),
      }
    }),

  // A correction on a provider's balance: an adjustment (either way, e.g. a goodwill credit or a fix) or a charge (Hurak's
  // retrospective commission when a provider was paid outside the platform). Always with a note.
  adjust: adminProcedure('admin.adjustments.create')
    .input(z.object({ providerId: z.string().uuid('Choose a provider.'), type: z.enum(['adjust', 'charge']), amountPence: z.number().int().refine((n) => n !== 0, 'Enter an amount.').refine((n) => Math.abs(n) <= 100_000_00, 'Enter a smaller amount.'), note: z.string().trim().min(3, 'Enter what this is for.').max(500) }))
    .mutation(async ({ ctx, input }) => {
      if (input.type === 'charge' && input.amountPence < 0) throw fieldError('amountPence', 'A charge is an amount the provider owes: enter it without a minus sign.')
      const [g] = await ctx.db.execute<{ id: string }>(sql`select id from ${organisations} where id = ${input.providerId}::uuid and type = 'provider'`)
      if (!g) throw fieldError('providerId', 'Choose a provider.')
      const providerPence = input.type === 'charge' ? -input.amountPence : input.amountPence
      await ctx.db.transaction(async (tx) => {
        await tx.insert(ledgerEntries).values({ type: input.type, providerId: g.id, providerPence, commissionPence: input.type === 'charge' ? input.amountPence : 0, note: input.note, createdBy: ctx.user.id })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: g.id, action: input.type === 'charge' ? 'admin.provider_charged' : 'admin.balance_adjusted', targetType: 'organisation', targetId: g.id, metadata: { pounds: (providerPence / 100).toFixed(2), note: input.note }, ip: ctx.ip })
      })
      return { ok: true }
    }),
})

export const feesRouter = createTRPCRouter({
  get: adminProcedure('admin.panel.open').query(async ({ ctx }) => {
    const f = await fees(ctx.db)
    return { cardPercent: f.cardBps / 100, bnplPercent: f.bnplBps / 100, payoutDay: f.payoutDay, changedAt: f.changedAt }
  }),
  // The payment fees taken from new orders, and the payout day; existing orders keep the fee they were booked with.
  set: adminProcedure('admin.finance.settings')
    .input(z.object({ cardBps: z.number().int().min(0, 'Enter 0% to 10%.').max(1000, 'Enter 0% to 10%.'), bnplBps: z.number().int().min(0, 'Enter 0% to 15%.').max(1500, 'Enter 0% to 15%.'), payoutDay: z.number().int().min(1, 'Enter a day from 1 to 28.').max(28, 'Enter a day from 1 to 28.') }))
    .mutation(async ({ ctx, input }) => {
      const before = await fees(ctx.db)
      const value = { cardBps: input.cardBps, bnplBps: input.bnplBps, payoutDay: input.payoutDay }
      await ctx.db.transaction(async (tx) => {
        await tx.insert(platformSettings).values({ key: FEES_KEY, value, updatedBy: ctx.user.id }).onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedBy: ctx.user.id, updatedAt: new Date() } })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.fees_changed', targetType: 'setting', targetId: FEES_KEY, metadata: { from: { card: before.cardBps / 100, bnpl: before.bnplBps / 100, payoutDay: before.payoutDay }, to: { card: input.cardBps / 100, bnpl: input.bnplBps / 100, payoutDay: input.payoutDay } }, ip: ctx.ip })
      })
      return { ok: true, defaults: DEFAULT_FEES }
    }),
})
