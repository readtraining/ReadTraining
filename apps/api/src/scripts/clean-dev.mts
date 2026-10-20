// Empties a DEVELOPMENT database of everything made while building and testing, so seed:demo can start it again cleanly:
// every account except the one(s) named with --keep (deleted through Supabase's admin API, which also removes their profiles,
// memberships and admin rows), and all orders, refunds, disputes, payouts, ledger entries, activity log rows, organisations
// and admin rows. The catalogue settings (categories, levels, delivery methods), coupons and site content stay.
// The ledger and the activity log are append-only: their locks are switched off for this delete only and back on in the same
// transaction. Refuses to run on the live project (pnpm live sets DATABASE_URL to the live one, which this checks).
//
//   pnpm --filter @readtraining/api clean:dev --keep readtrainingwebsite@gmail.com
import { sql } from '@readtraining/db'

import { db } from '../lib/db.mjs'

const env = process.env
const live =
  !env.DATABASE_URL ||
  env.DATABASE_URL === env.LIVE_DATABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL === env.LIVE_SUPABASE_URL ||
  /readtraining-live/.test(env.DATABASE_URL) ||
  env.VERCEL_ENV === 'production'
if (live) {
  console.error('clean:dev is for the development database only.')
  process.exit(1)
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed in .env.')
  process.exit(1)
}
const args = process.argv.slice(2)
const keep = args.flatMap((a, i) => (args[i - 1] === '--keep' ? [a.trim().toLowerCase()] : []))

const users = (await db.execute(sql`select id, email from auth.users`)) as unknown as { id: string; email: string }[]
const going = users.filter((u) => !keep.includes((u.email ?? '').toLowerCase()))
console.log(`Keeping: ${keep.join(', ') || 'nobody'}. Deleting ${going.length} accounts: ${going.map((u) => u.email).join(', ')}`)

await db.transaction(async (tx) => {
  for (const t of ['disputes', 'refunds', 'orders', 'payouts']) await tx.execute(sql.raw(`delete from public.${t}`))
  for (const t of ['ledger_entries', 'activity_log']) {
    await tx.execute(sql.raw(`alter table public.${t} disable trigger user`))
    await tx.execute(sql.raw(`delete from public.${t}`))
    await tx.execute(sql.raw(`alter table public.${t} enable trigger user`))
  }
  for (const t of ['organisation_members', 'organisations', 'admin_users']) await tx.execute(sql.raw(`delete from public.${t}`))
})
const off = (await db.execute(sql`select tgrelid::regclass::text as t, tgname from pg_trigger where not tgisinternal and tgenabled = 'D'`)) as unknown as { t: string; tgname: string }[]
console.log(`Locks switched off now: ${off.length ? off.map((r) => `${r.t}.${r.tgname}`).join(', ') : 'none'}`)

for (const u of going) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
    method: 'DELETE',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  console.log(`${u.email}: ${res.ok ? 'deleted' : `not deleted (${res.status})`}`)
}
const [left] = (await db.execute(sql`select (select count(*) from auth.users)::int as accounts, (select count(*) from public.organisations)::int as organisations, (select count(*) from public.orders)::int as orders, (select count(*) from public.activity_log)::int as log`)) as unknown as Record<string, number>[]
console.log('Left:', JSON.stringify(left))
process.exit(0)
