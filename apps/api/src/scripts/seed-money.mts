// Made-up money records for a DEVELOPMENT or test database, so the admin's money screens have something to show before real
// bookings exist: three test providers ("… (test)"), about twenty orders over the last six weeks, refunds (decided and waiting),
// a dispute, and a sent payout. Never part of the migrations and refuses to run on the live project.
//
//   pnpm --filter @readtraining/api seed:money            add the records (once; it stops if they are already there)
//
// The ledger is append-only, so to remove them use a fresh database (or the test clean-up scripts).
import { randomInt } from 'node:crypto'

import { disputes, ledgerEntries, orders, organisations, payouts, refunds, sql } from '@readtraining/db'

import { db } from '../lib/db.mjs'
import { reversalOf, splitOf } from '../lib/money.mjs'

if (/LIVE_|readtraining-live/.test(process.env.DATABASE_URL ?? '') || process.env.VERCEL_ENV === 'production') {
  console.error('seed:money is for development and test databases only.')
  process.exit(1)
}
const DAY = 86400000
const PROVIDERS = [
  { name: 'Harbour Training Group (test)', slug: 'harbour-training-group-test' },
  { name: 'Kestrel Safety Training (test)', slug: 'kestrel-safety-training-test' },
  { name: 'Apex Training (test)', slug: 'apex-training-test' },
]
const [done] = await db.execute(sql`select 1 from ${organisations} where slug = ${PROVIDERS[0].slug}`)
if (done) {
  console.log('The test money records are already there.')
  process.exit(0)
}
const BUYERS = [['Sophie Turner', null], ['Priya Shah', 'Brightwell Facilities Ltd'], ['Chloe Evans', null], ['Aisha Begum', null], ['Amelia Clarke', null], ['Ryan Patel', 'Cityguard Security'], ['Daniel Okafor', null], ['Grace Walsh', 'Harbourside Hotels'], ['Liam Hughes', null], ['Emily Ward', null]] as const
const COURSES = [[1, 'SIA Door Supervisor Training', 19302], [5, 'Emergency First Aid at Work', 9195], [3, 'SIA CCTV Operator Training', 16900], [9, 'CSCS Green Card Course', 8995], [13, 'IOSH Managing Safely', 49500], [16, 'Fire Marshal Training', 2909]] as const
const methods = ['card', 'card', 'card', 'bnpl', 'payment_link', 'invoice'] as const
const FEES = { card: 300, bnpl: 600, payment_link: 300, invoice: 0, free: 0 } as const

const provIds: string[] = []
for (const p of PROVIDERS) {
  const [row] = await db.insert(organisations).values({ type: 'provider', name: p.name, slug: p.slug, status: 'active' }).returning({ id: organisations.id })
  provIds.push(row.id)
}
const made: { id: string; providerId: string; gross: number; feeBps: number; at: Date; method: string }[] = []
for (let i = 0; i < 20; i++) {
  const [buyer, company] = BUYERS[i % BUYERS.length]
  const [courseId, title, unit] = COURSES[(i * 5) % COURSES.length]
  const method = i === 7 ? 'free' : methods[i % methods.length]
  const qty = company ? 2 + (i % 3) : 1
  const gross = method === 'free' ? 0 : unit * qty
  const feeBps = FEES[method]
  const providerId = provIds[i % provIds.length]
  const at = new Date(Date.now() - (40 - i * 2) * DAY - randomInt(0, 8) * 3600000)
  const [o] = await db
    .insert(orders)
    .values({ ref: `RT-${at.getUTCFullYear()}-${String(200000 + i * 7919).slice(0, 6)}`, buyerName: buyer, buyerEmail: `${buyer.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`, buyerCompany: company, providerId, courseId, courseTitle: title, startsOn: new Date(at.getTime() + 21 * DAY).toISOString().slice(0, 10), quantity: qty, unitPence: method === 'free' ? 0 : unit, grossPence: gross, method, feeBps, commissionBps: 3000, note: 'Test data (seed:money)', createdAt: at })
    .returning({ id: orders.id })
  await db.insert(ledgerEntries).values({ type: 'purchase', providerId, orderId: o.id, ...splitOf(gross, feeBps, 3000), note: 'Test data', at })
  made.push({ id: o.id, providerId, gross, feeBps, at, method })
}
// an approved part refund, a waiting refund, an open dispute
const part = made[2]
const [r1] = await db.insert(refunds).values({ orderId: part.id, amountPence: 5000, reason: 'Could only attend the first day', status: 'approved', decidedAt: new Date(), decisionNote: 'Agreed with the provider', createdAt: new Date(part.at.getTime() + 3 * DAY) }).returning({ id: refunds.id })
await db.insert(ledgerEntries).values({ type: 'refund', providerId: part.providerId, orderId: part.id, refundId: r1.id, ...reversalOf(splitOf(part.gross, part.feeBps, 3000), 5000), note: 'Test data' })
await db.execute(sql`update ${orders} set status = 'part_refunded' where id = ${part.id}::uuid`)
await db.insert(refunds).values({ orderId: made[15].id, amountPence: made[15].gross, reason: 'Booked the wrong date and the provider has no other date this month' })
await db.insert(disputes).values({ orderId: made[18].id, amountPence: made[18].gross, reason: 'Card holder says they did not make this payment', evidenceDue: new Date(Date.now() + 5 * DAY).toISOString().slice(0, 10) })
// last month's payout for the first provider, already sent
const cutoff = new Date(Date.now() - 20 * DAY)
const [owed] = await db.execute<{ n: number }>(sql`select coalesce(sum(provider_pence), 0)::int n from ${ledgerEntries} where provider_id = ${provIds[0]}::uuid and at < ${cutoff.toISOString()}::timestamptz`)
if (owed.n > 0) {
  const [w] = await db.insert(payouts).values({ ref: `PO-${cutoff.getUTCFullYear()}-0001`, providerId: provIds[0], periodEnd: cutoff.toISOString().slice(0, 10), amountPence: owed.n, status: 'sent', approvedAt: cutoff, sentAt: cutoff }).returning({ id: payouts.id })
  await db.insert(ledgerEntries).values({ type: 'payout', providerId: provIds[0], payoutId: w.id, providerPence: -owed.n, note: 'Test data', at: cutoff })
}
console.log(`Added 3 test providers and ${made.length} orders with refunds, a dispute and a payout.`)
process.exit(0)
