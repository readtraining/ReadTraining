import { randomInt } from 'node:crypto'

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { disputes, ledgerEntries, orders, organisations, platformSettings, refunds, sql } from '@readtraining/db'
import { can } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { reversalOf, splitOf, type Split } from '../../lib/money.mjs'
import { orderBy, paging, total, window } from '../../lib/paging.mjs'
import { adminProcedure, createTRPCRouter, refuse } from '../../trpc/trpc.mjs'
import { defaultCommission } from './commission.mjs'

// Orders, refunds and disputes (Part B, B4), real in the database, with no payment provider yet. Orders come from staff bookings
// (invoice, payment link or free, as Hurak's staff do) and test data; every money movement is a ledger entry (lib/money.mts does
// the maths). Refunds and lost disputes are RECORDED: the ledger and the order change, but no money moves until a payment
// provider is connected (the screens say so).
// Rules: anyone who can see orders can ask for a refund; deciding needs the "refunds" switch, never on your own request, and
// above your own limit only a Full admin can approve. Disputes need the "disputes" switch. Everything is logged.

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0]
type Writer = typeof Db | Tx
const fieldError = (field: string, message: string) => new TRPCError({ code: 'BAD_REQUEST', message, cause: Object.assign(new Error(message), { field }) })
const notFound = (what: string) => new TRPCError({ code: 'NOT_FOUND', message: `That ${what} no longer exists.` })
const pence = z.number().int().positive('Enter an amount above £0.').max(100_000_00, 'Enter a smaller amount.')
const text = (min: number, max: number, what: string) => z.string().trim().min(min, `Enter ${what}.`).max(max, `Keep it to ${max} characters or fewer.`)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date, like 2026-11-30.')

// ---- fees: the payment fee each method pays (platform setting `fees`; Hurak's 3% card and 6% Klarna until changed) -----------
export const FEES_KEY = 'fees'
export const DEFAULT_FEES = { cardBps: 300, bnplBps: 600, payoutDay: 28 }
export async function fees(db: Writer) {
  const [row] = await db.execute<{ value: typeof DEFAULT_FEES; updated_at: string }>(sql`select value, updated_at from ${platformSettings} where key = ${FEES_KEY}`)
  return { ...DEFAULT_FEES, ...(row?.value ?? {}), changedAt: row ? new Date(row.updated_at).toISOString() : null }
}
const feeFor = (method: string, f: typeof DEFAULT_FEES) => (method === 'card' || method === 'payment_link' ? f.cardBps : method === 'bnpl' ? f.bnplBps : 0)

// a new reference no order or payout has: RT-2026-123456 / PO-2026-1234
export async function newRef(db: Writer, prefix: 'RT' | 'PO') {
  for (;;) {
    const ref = `${prefix}-${new Date().getUTCFullYear()}-${prefix === 'RT' ? randomInt(100000, 999999) : randomInt(1000, 9999)}`
    const table = prefix === 'RT' ? sql`public.orders` : sql`public.payouts`
    const [hit] = await db.execute(sql`select 1 from ${table} where ref = ${ref}`)
    if (!hit) return ref
  }
}

// ---- an order's money: its purchase split, what has been given back, and what is still open ---------------------------------
type OrderRow = { id: string; ref: string; provider_id: string; gross_pence: number; method: string; status: string; fee_bps: number; commission_bps: number; buyer_name: string; course_title: string }
export async function moneyOf(db: Writer, o: OrderRow) {
  const [r] = await db.execute<{ gross: number; fee: number; commission: number; provider: number }>(sql`
    select coalesce(sum(gross_pence), 0)::int gross, coalesce(sum(fee_pence), 0)::int fee, coalesce(sum(commission_pence), 0)::int commission,
           coalesce(sum(provider_pence), 0)::int provider
    from ${ledgerEntries} where order_id = ${o.id}::uuid and type in ('refund', 'cancel', 'dispute')`)
  const [open] = await db.execute<{ requested: number; disputed: number }>(sql`
    select (select coalesce(sum(amount_pence), 0) from ${refunds} where order_id = ${o.id}::uuid and status = 'requested')::int requested,
           (select coalesce(sum(amount_pence), 0) from ${disputes} where order_id = ${o.id}::uuid and status = 'open')::int disputed`)
  const purchase = splitOf(o.gross_pence, o.fee_bps, o.commission_bps)
  const back: Split = { grossPence: r.gross, feePence: r.fee, commissionPence: r.commission, providerPence: r.provider }
  // what can still be asked for: the gross, less what was given back and what is already asked for or disputed
  return { purchase, back, openRefunds: open.requested, openDisputes: open.disputed, left: o.gross_pence + back.grossPence - open.requested - open.disputed }
}
const lockOrder = async (tx: Tx, id: string) => {
  const [o] = await tx.execute<OrderRow>(sql`select id, ref, provider_id, gross_pence, method, status, fee_bps, commission_bps, buyer_name, course_title from ${orders} where id = ${id}::uuid for update`)
  if (!o) throw notFound('order')
  return o
}
// a reversal into the ledger, and the order's status from what has now been given back
async function giveBack(tx: Tx, o: OrderRow, type: 'refund' | 'cancel' | 'dispute', amount: number, link: { refundId?: string; disputeId?: string }, note: string | null, by: string) {
  const m = await moneyOf(tx, o)
  const r = reversalOf(m.purchase, amount, m.back)
  await tx.insert(ledgerEntries).values({ type, providerId: o.provider_id, orderId: o.id, ...link, ...r, note, createdBy: by })
  const backNow = -(m.back.grossPence + r.grossPence)
  const status = type === 'cancel' ? 'cancelled' : backNow >= o.gross_pence ? 'refunded' : 'part_refunded'
  await tx.execute(sql`update ${orders} set status = ${status}, updated_at = now() where id = ${o.id}::uuid`)
  return r
}

const ORDER_STATUS = ['paid', 'part_refunded', 'refunded', 'cancelled'] as const
const ORDER_SORT = { booked: sql`o.created_at`, ref: sql`o.ref`, buyer: sql`lower(o.buyer_name)`, total: sql`o.gross_pence`, status: sql`o.status::text` }
const who = (alias: string) => sql.raw(`(select nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '') from public.profiles p where p.id = ${alias})`)

export const ordersRouter = createTRPCRouter({
  // Newest first, a page at a time; search by reference, buyer or course; filter by status or provider.
  list: adminProcedure('admin.orders.view')
    .input(
      z.object({
        q: z.string().trim().max(120).optional(),
        status: z.enum(ORDER_STATUS).optional(),
        providerId: z.string().uuid().optional(),
        sort: z.enum(['booked', 'ref', 'buyer', 'total', 'status']).default('booked'),
        ...paging,
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = [sql`true`]
      if (input.status) where.push(sql`o.status = ${input.status}`)
      if (input.providerId) where.push(sql`o.provider_id = ${input.providerId}::uuid`)
      if (input.q) {
        const like = `%${input.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
        where.push(sql`(o.ref ilike ${like} or o.buyer_name ilike ${like} or o.buyer_email ilike ${like} or o.course_title ilike ${like} or coalesce(o.buyer_company, '') ilike ${like})`)
      }
      const rows = await ctx.db.execute<{ id: string; ref: string; total: number; buyer_name: string; buyer_email: string; buyer_company: string | null; course_title: string; starts_on: string | null; quantity: number; gross_pence: number; method: string; status: string; created_at: string; provider: string; booked_by: string | null }>(sql`
        select o.id, o.ref, ${total} total, o.buyer_name, o.buyer_email, o.buyer_company, o.course_title, to_char(o.starts_on, 'YYYY-MM-DD') starts_on, o.quantity,
               o.gross_pence, o.method, o.status, o.created_at, g.name provider, ${who('o.booked_by')} booked_by
        from ${orders} o join ${organisations} g on g.id = o.provider_id
        where ${sql.join(where, sql` and `)}
        order by ${orderBy(ORDER_SORT[input.sort], input.dir, sql`o.id`)} ${window(input.page, input.limit)}`)
      const [counts] = await ctx.db.execute<Record<(typeof ORDER_STATUS)[number] | 'all', number>>(sql`
        select count(*)::int "all", count(*) filter (where status = 'paid')::int paid, count(*) filter (where status = 'part_refunded')::int part_refunded,
               count(*) filter (where status = 'refunded')::int refunded, count(*) filter (where status = 'cancelled')::int cancelled from ${orders}`)
      return {
        counts,
        total: rows[0]?.total ?? 0,
        orders: rows.map((r) => ({ id: r.id, ref: r.ref, buyer: { name: r.buyer_name, email: r.buyer_email, company: r.buyer_company }, course: r.course_title, startsOn: r.starts_on, quantity: r.quantity, gross: r.gross_pence / 100, method: r.method, status: r.status, at: new Date(r.created_at).toISOString(), provider: r.provider, bookedBy: r.booked_by })),
      }
    }),

  // The dashboard's money numbers: orders and sales in the last 7 days, and what waits for a decision.
  summary: adminProcedure('admin.orders.view').query(async ({ ctx }) => {
    const [r] = await ctx.db.execute<{ orders: number; sales: number; refunds: number; disputes: number; overdue: number; payouts: number }>(sql`
      select (select count(*) from ${orders} where created_at > now() - interval '7 days')::int orders,
             (select coalesce(sum(gross_pence), 0) from ${orders} where created_at > now() - interval '7 days')::int sales,
             (select count(*) from ${refunds} where status = 'requested')::int refunds,
             (select count(*) from ${disputes} where status = 'open')::int disputes,
             (select count(*) from ${disputes} where status = 'open' and evidence_due < (now() at time zone 'Europe/London')::date)::int overdue,
             (select count(*) from public.payouts where status = 'draft')::int payouts`)
    return { orders: r.orders, sales: r.sales / 100, refunds: r.refunds, disputes: r.disputes, disputesOverdue: r.overdue, payoutsToApprove: r.payouts }
  }),

  // One order with everything about its money: the split, every ledger entry, refunds and disputes.
  get: adminProcedure('admin.orders.view')
    .input(z.object({ ref: z.string().max(40) }))
    .query(async ({ ctx, input }) => {
      const [o] = await ctx.db.execute<OrderRow & { buyer_email: string; buyer_company: string | null; buyer_user_id: string | null; course_id: number; starts_on: string | null; quantity: number; unit_pence: number; note: string | null; created_at: string; provider: string; provider_slug: string; booked_by: string | null }>(sql`
        select o.*, to_char(o.starts_on, 'YYYY-MM-DD') starts_on, g.name provider, g.slug provider_slug, ${who('o.booked_by')} booked_by
        from ${orders} o join ${organisations} g on g.id = o.provider_id where o.ref = ${input.ref}`)
      if (!o) throw notFound('order')
      const m = await moneyOf(ctx.db, o)
      const ledger = await ctx.db.execute<{ id: number; at: string; type: string; gross_pence: number; fee_pence: number; commission_pence: number; provider_pence: number; note: string | null; by: string | null }>(sql`
        select l.id, l.at, l.type, l.gross_pence, l.fee_pence, l.commission_pence, l.provider_pence, l.note, ${who('l.created_by')} as "by"
        from ${ledgerEntries} l where l.order_id = ${o.id}::uuid order by l.at, l.id`)
      const refundRows = await ctx.db.execute<{ id: string; amount_pence: number; reason: string; status: string; created_at: string; decided_at: string | null; decision_note: string | null; requested_by_id: string | null; requested_by: string | null; decided_by: string | null }>(sql`
        select r.id, r.amount_pence, r.reason, r.status, r.created_at, r.decided_at, r.decision_note, r.requested_by requested_by_id, ${who('r.requested_by')} requested_by, ${who('r.decided_by')} decided_by
        from ${refunds} r where r.order_id = ${o.id}::uuid order by r.created_at desc`)
      const disputeRows = await ctx.db.execute<{ id: string; amount_pence: number; reason: string; status: string; evidence_due: string; created_at: string; closed_at: string | null }>(sql`
        select id, amount_pence, reason, status, to_char(evidence_due, 'YYYY-MM-DD') evidence_due, created_at, closed_at from ${disputes} where order_id = ${o.id}::uuid order by created_at desc`)
      const p = (n: number) => n / 100
      return {
        id: o.id,
        ref: o.ref,
        status: o.status,
        method: o.method,
        at: new Date(o.created_at).toISOString(),
        buyer: { name: o.buyer_name, email: o.buyer_email, company: o.buyer_company, accountId: o.buyer_user_id },
        course: { id: o.course_id, title: o.course_title, startsOn: o.starts_on },
        provider: { id: o.provider_id, name: o.provider, slug: o.provider_slug },
        quantity: o.quantity,
        unit: p(o.unit_pence),
        rates: { feePercent: o.fee_bps / 100, commissionPercent: o.commission_bps / 100 },
        split: { gross: p(m.purchase.grossPence), fee: p(m.purchase.feePence), commission: p(m.purchase.commissionPence), provider: p(m.purchase.providerPence) },
        given: { gross: p(-m.back.grossPence), provider: p(-m.back.providerPence) },
        left: p(m.left),
        bookedBy: o.booked_by,
        note: o.note,
        ledger: ledger.map((l) => ({ id: Number(l.id), at: new Date(l.at).toISOString(), type: l.type, gross: p(l.gross_pence), fee: p(l.fee_pence), commission: p(l.commission_pence), provider: p(l.provider_pence), note: l.note, by: l.by })),
        refunds: refundRows.map((r) => ({ id: r.id, amount: p(r.amount_pence), reason: r.reason, status: r.status, at: new Date(r.created_at).toISOString(), decidedAt: r.decided_at && new Date(r.decided_at).toISOString(), decisionNote: r.decision_note, requestedBy: r.requested_by, mine: r.requested_by_id === ctx.user.id, decidedBy: r.decided_by })),
        disputes: disputeRows.map((d) => ({ id: d.id, amount: p(d.amount_pence), reason: d.reason, status: d.status, evidenceDue: d.evidence_due, at: new Date(d.created_at).toISOString(), closedAt: d.closed_at && new Date(d.closed_at).toISOString() })),
      }
    }),

  // A staff booking (Hurak's "Booked by" staff sales): invoice or payment link, or free with the "free bookings" switch. The order
  // takes today's payment fee and the provider's commission rate, and its purchase goes into the ledger.
  book: adminProcedure('admin.orders.book')
    .input(
      z.object({
        buyerName: text(2, 120, 'the buyer’s name'),
        buyerEmail: z.string().trim().toLowerCase().email('Enter a valid email address.'),
        buyerCompany: z.string().trim().max(120).optional(),
        providerId: z.string().uuid('Choose a training provider.'),
        courseId: z.number().int().positive('Choose a course.'),
        courseTitle: text(2, 200, 'the course'),
        startsOn: day.nullable(),
        quantity: z.number().int('Enter a whole number.').min(1, 'Enter 1 or more.').max(500, 'Enter 500 or fewer.'),
        unitPence: z.number().int().min(0).max(5_000_00, 'Enter £5,000 or less a place.'),
        method: z.enum(['invoice', 'payment_link', 'free']),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input, path }) => {
      if (input.method === 'free' && !can(ctx.actor, 'admin.orders.bookFree')) await refuse(ctx, 'admin.orders.bookFree', null, path)
      if (input.method === 'free' && input.unitPence !== 0) throw fieldError('unitPence', 'A free booking has a price of £0.')
      if (input.method !== 'free' && input.unitPence === 0) throw fieldError('unitPence', 'Enter the price a place, or choose a free booking.')
      const [prov] = await ctx.db.execute<{ id: string; status: string; commission_bps: number | null }>(sql`select id, status, commission_bps from ${organisations} where id = ${input.providerId}::uuid and type = 'provider'`)
      if (!prov) throw fieldError('providerId', 'Choose a training provider.')
      if (prov.status !== 'active') throw fieldError('providerId', 'This provider is not active, so it can’t take bookings.')
      const f = await fees(ctx.db)
      const commissionBps = prov.commission_bps ?? (await defaultCommission(ctx.db)).bps
      const feeBps = feeFor(input.method, f)
      const gross = input.unitPence * input.quantity
      const [buyer] = await ctx.db.execute<{ id: string }>(sql`select id from auth.users where lower(email) = ${input.buyerEmail} and deleted_at is null limit 1`)
      const ref = await newRef(ctx.db, 'RT')
      const id = await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(orders)
          .values({ ref, buyerUserId: buyer?.id ?? null, buyerName: input.buyerName, buyerEmail: input.buyerEmail, buyerCompany: input.buyerCompany || null, providerId: prov.id, courseId: input.courseId, courseTitle: input.courseTitle, startsOn: input.startsOn, quantity: input.quantity, unitPence: input.unitPence, grossPence: gross, method: input.method, feeBps, commissionBps, bookedBy: ctx.user.id, note: input.note || null })
          .returning({ id: orders.id })
        await tx.insert(ledgerEntries).values({ type: 'purchase', providerId: prov.id, orderId: row.id, ...splitOf(gross, feeBps, commissionBps), note: `Staff booking (${input.method.replace('_', ' ')})`, createdBy: ctx.user.id })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: prov.id, action: 'admin.order_booked', targetType: 'order', targetId: ref, metadata: { pounds: (gross / 100).toFixed(2), method: input.method }, ip: ctx.ip })
        return row.id
      })
      return { id, ref }
    }),

  // Cancel the whole booking: whatever has not been given back is reversed ("cancel" in the ledger). Like a refund, it needs the
  // "refunds" switch and your limit covers the amount.
  cancel: adminProcedure('admin.panel.open')
    .input(z.object({ orderId: z.string().uuid(), reason: text(3, 500, 'why the booking is cancelled') }))
    .mutation(async ({ ctx, input, path }) => {
      return ctx.db.transaction(async (tx) => {
        const o = await lockOrder(tx, input.orderId)
        if (o.status === 'cancelled' || o.status === 'refunded') throw new TRPCError({ code: 'BAD_REQUEST', message: 'This booking has nothing left to cancel.' })
        const m = await moneyOf(tx, o)
        if (m.openRefunds || m.openDisputes) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Decide the open refund request or dispute first.' })
        const amount = o.gross_pence + m.back.grossPence
        if (!can(ctx.actor, 'admin.refunds.decide', { amountPence: amount })) await refuse(ctx, 'admin.refunds.decide', o.provider_id, path)
        if (amount > 0) await giveBack(tx, o, 'cancel', amount, {}, input.reason, ctx.user.id)
        else await tx.execute(sql`update ${orders} set status = 'cancelled', updated_at = now() where id = ${o.id}::uuid`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: o.provider_id, action: 'admin.order_cancelled', targetType: 'order', targetId: o.ref, metadata: { pounds: (amount / 100).toFixed(2), reason: input.reason }, ip: ctx.ip })
        return { ok: true }
      })
    }),
})

const REFUND_STATUS = ['requested', 'approved', 'declined'] as const
export const refundsRouter = createTRPCRouter({
  list: adminProcedure('admin.orders.view')
    .input(z.object({ status: z.enum(REFUND_STATUS).optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute<{ id: string; amount_pence: number; reason: string; status: string; created_at: string; decided_at: string | null; decision_note: string | null; ref: string; buyer_name: string; course_title: string; gross_pence: number; provider: string; requested_by_id: string | null; requested_by: string | null; decided_by: string | null }>(sql`
        select r.id, r.amount_pence, r.reason, r.status, r.created_at, r.decided_at, r.decision_note, o.ref, o.buyer_name, o.course_title, o.gross_pence, g.name provider,
               r.requested_by requested_by_id, ${who('r.requested_by')} requested_by, ${who('r.decided_by')} decided_by
        from ${refunds} r join ${orders} o on o.id = r.order_id join ${organisations} g on g.id = o.provider_id
        ${input.status ? sql`where r.status = ${input.status}` : sql``}
        order by (r.status = 'requested') desc, r.created_at desc limit 300`)
      const [counts] = await ctx.db.execute<Record<(typeof REFUND_STATUS)[number], number>>(sql`
        select count(*) filter (where status = 'requested')::int requested, count(*) filter (where status = 'approved')::int approved, count(*) filter (where status = 'declined')::int declined from ${refunds}`)
      return {
        counts,
        limitPence: ctx.actor.admin?.preset === 'full' ? null : ctx.actor.admin?.refundLimitPence ?? 0,
        refunds: rows.map((r) => ({ id: r.id, amount: r.amount_pence / 100, reason: r.reason, status: r.status, at: new Date(r.created_at).toISOString(), decidedAt: r.decided_at && new Date(r.decided_at).toISOString(), decisionNote: r.decision_note, order: { ref: r.ref, buyer: r.buyer_name, course: r.course_title, gross: r.gross_pence / 100 }, provider: r.provider, requestedBy: r.requested_by, mine: r.requested_by_id === ctx.user.id, decidedBy: r.decided_by })),
      }
    }),

  // Ask for a refund on an order (support can): up to what is left on it.
  request: adminProcedure('admin.orders.view')
    .input(z.object({ orderId: z.string().uuid(), amountPence: pence, reason: text(3, 500, 'why the refund is asked for') }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const o = await lockOrder(tx, input.orderId)
        if (o.status === 'cancelled' || o.method === 'free') throw new TRPCError({ code: 'BAD_REQUEST', message: 'This booking has nothing to refund.' })
        const m = await moneyOf(tx, o)
        if (input.amountPence > m.left) throw fieldError('amountPence', m.left > 0 ? `Enter £${(m.left / 100).toFixed(2)} or less: that is what is left on this order.` : 'Nothing is left to refund on this order.')
        const [row] = await tx.insert(refunds).values({ orderId: o.id, amountPence: input.amountPence, reason: input.reason, requestedBy: ctx.user.id }).returning({ id: refunds.id })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: o.provider_id, action: 'admin.refund_requested', targetType: 'order', targetId: o.ref, metadata: { pounds: (input.amountPence / 100).toFixed(2), reason: input.reason }, ip: ctx.ip })
        return { id: row.id }
      })
    }),

  // Approve (the ledger records the refund; no money moves yet) or decline (with a reason). Not your own request; above your
  // limit only a Full admin.
  decide: adminProcedure('admin.refunds.decide')
    .input(z.object({ id: z.string().uuid(), decision: z.enum(['approve', 'decline']), note: z.string().trim().max(500).optional() }))
    .mutation(async ({ ctx, input, path }) => {
      if (input.decision === 'decline' && !input.note) throw fieldError('note', 'Enter why the refund is declined. The person who asked will see it.')
      return ctx.db.transaction(async (tx) => {
        const [r] = await tx.execute<{ id: string; order_id: string; amount_pence: number; status: string; requested_by: string | null }>(sql`select id, order_id, amount_pence, status, requested_by from ${refunds} where id = ${input.id}::uuid for update`)
        if (!r) throw notFound('refund request')
        if (r.status !== 'requested') throw new TRPCError({ code: 'BAD_REQUEST', message: 'This refund has already been decided.' })
        const o = await lockOrder(tx, r.order_id)
        if (!can(ctx.actor, 'admin.refunds.decide', { amountPence: r.amount_pence, createdBy: r.requested_by })) await refuse(ctx, 'admin.refunds.decide', o.provider_id, path)
        if (input.decision === 'approve') await giveBack(tx, o, 'refund', r.amount_pence, { refundId: r.id }, input.note || null, ctx.user.id)
        await tx.execute(sql`update ${refunds} set status = ${input.decision === 'approve' ? 'approved' : 'declined'}, decided_by = ${ctx.user.id}::uuid, decided_at = now(), decision_note = ${input.note ?? null} where id = ${r.id}::uuid`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: o.provider_id, action: input.decision === 'approve' ? 'admin.refund_approved' : 'admin.refund_declined', targetType: 'order', targetId: o.ref, metadata: { pounds: (r.amount_pence / 100).toFixed(2), ...(input.note ? { reason: input.note } : {}) }, ip: ctx.ip })
        return { ok: true }
      })
    }),
})

const DISPUTE_STATUS = ['open', 'won', 'lost'] as const
export const disputesRouter = createTRPCRouter({
  list: adminProcedure('admin.orders.view')
    .input(z.object({ status: z.enum(DISPUTE_STATUS).optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute<{ id: string; amount_pence: number; reason: string; status: string; evidence_due: string; created_at: string; closed_at: string | null; ref: string; buyer_name: string; course_title: string; provider: string }>(sql`
        select d.id, d.amount_pence, d.reason, d.status, to_char(d.evidence_due, 'YYYY-MM-DD') evidence_due, d.created_at, d.closed_at, o.ref, o.buyer_name, o.course_title, g.name provider
        from ${disputes} d join ${orders} o on o.id = d.order_id join ${organisations} g on g.id = o.provider_id
        ${input.status ? sql`where d.status = ${input.status}` : sql``}
        order by (d.status = 'open') desc, d.evidence_due, d.created_at desc limit 300`)
      const [counts] = await ctx.db.execute<Record<(typeof DISPUTE_STATUS)[number], number>>(sql`
        select count(*) filter (where status = 'open')::int open, count(*) filter (where status = 'won')::int won, count(*) filter (where status = 'lost')::int lost from ${disputes}`)
      return { counts, disputes: rows.map((d) => ({ id: d.id, amount: d.amount_pence / 100, reason: d.reason, status: d.status, evidenceDue: d.evidence_due, at: new Date(d.created_at).toISOString(), closedAt: d.closed_at && new Date(d.closed_at).toISOString(), order: { ref: d.ref, buyer: d.buyer_name, course: d.course_title }, provider: d.provider })) }
    }),

  // A card dispute (chargeback) on an order: the amount is held back from the provider's payout until it is won or lost.
  open: adminProcedure('admin.disputes.manage')
    .input(z.object({ orderId: z.string().uuid(), amountPence: pence, reason: text(3, 500, 'what the dispute is about'), evidenceDue: day }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const o = await lockOrder(tx, input.orderId)
        if (o.method === 'free' || o.method === 'invoice') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only card payments can be disputed.' })
        const m = await moneyOf(tx, o)
        if (input.amountPence > m.left) throw fieldError('amountPence', `Enter £${(m.left / 100).toFixed(2)} or less: that is what is left on this order.`)
        const [row] = await tx.insert(disputes).values({ orderId: o.id, amountPence: input.amountPence, reason: input.reason, evidenceDue: input.evidenceDue, openedBy: ctx.user.id }).returning({ id: disputes.id })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: o.provider_id, action: 'admin.dispute_opened', targetType: 'order', targetId: o.ref, metadata: { pounds: (input.amountPence / 100).toFixed(2), reason: input.reason }, ip: ctx.ip })
        return { id: row.id }
      })
    }),

  // Won: nothing changes. Lost: the amount is reversed in the ledger ("dispute") and the order shows it.
  close: adminProcedure('admin.disputes.manage')
    .input(z.object({ id: z.string().uuid(), outcome: z.enum(['won', 'lost']) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [d] = await tx.execute<{ id: string; order_id: string; amount_pence: number; status: string }>(sql`select id, order_id, amount_pence, status from ${disputes} where id = ${input.id}::uuid for update`)
        if (!d) throw notFound('dispute')
        if (d.status !== 'open') throw new TRPCError({ code: 'BAD_REQUEST', message: 'This dispute is already closed.' })
        const o = await lockOrder(tx, d.order_id)
        await tx.execute(sql`update ${disputes} set status = ${input.outcome}, closed_by = ${ctx.user.id}::uuid, closed_at = now() where id = ${d.id}::uuid`)
        if (input.outcome === 'lost') await giveBack(tx, o, 'dispute', d.amount_pence, { disputeId: d.id }, 'Dispute lost', ctx.user.id)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: o.provider_id, action: input.outcome === 'won' ? 'admin.dispute_won' : 'admin.dispute_lost', targetType: 'order', targetId: o.ref, metadata: { pounds: (d.amount_pence / 100).toFixed(2) }, ip: ctx.ip })
        return { ok: true }
      })
    }),
})
