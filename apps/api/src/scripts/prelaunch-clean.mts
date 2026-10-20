// Before launch only: makes the live database clean for the client. It deletes the test accounts you name (through Supabase's
// admin API), the organisations only those accounts belong to, and every activity log row written while testing. Nothing else.
// Without --yes it only lists what it would do. It refuses as soon as the database has any order: from then on the activity
// log is the platform's audit trail and must be kept, and accounts are real customers.
//
//   pnpm live prelaunch:clean --account test@example.com                list only
//   pnpm live prelaunch:clean --account test@example.com --yes          do it
import { sql } from '@readtraining/db'

import { db } from '../lib/db.mjs'

const env = process.env
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.DATABASE_URL) {
  console.error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL are needed.')
  process.exit(1)
}
const args = process.argv.slice(2)
const accounts = args.flatMap((a, i) => (args[i - 1] === '--account' ? [a.trim().toLowerCase()] : []))
const go = args.includes('--yes')
if (!accounts.length) {
  console.error('Name each test account to remove with --account <email>.')
  process.exit(1)
}
console.log(`Database: ${new URL(env.NEXT_PUBLIC_SUPABASE_URL).host}${env.NEXT_PUBLIC_SUPABASE_URL === env.LIVE_SUPABASE_URL ? ' (LIVE)' : ''}`)

const [{ orders }] = (await db.execute(sql`select count(*)::int as orders from public.orders`)) as unknown as { orders: number }[]
if (orders > 0) {
  console.error(`Refusing: there are ${orders} orders, so the site is in use. The activity log and accounts must be kept.`)
  process.exit(1)
}
const users = (await db.execute(sql`select id, email from auth.users`)) as unknown as { id: string; email: string }[]
const going = users.filter((u) => accounts.includes((u.email ?? '').toLowerCase()))
const unknown = accounts.filter((a) => !going.some((u) => u.email.toLowerCase() === a))
if (unknown.length) {
  console.error(`No account with: ${unknown.join(', ')}. Nothing done.`)
  process.exit(1)
}
const ids = going.map((u) => u.id)
const list = (xs: string[]) => sql.join(xs.map((x) => sql`${x}::uuid`), sql`, `)
// organisations whose members are all accounts being removed
const orgs = (await db.execute(sql`select o.id, o.type, o.name from public.organisations o
  where exists (select 1 from public.organisation_members m where m.organisation_id = o.id)
    and not exists (select 1 from public.organisation_members m where m.organisation_id = o.id and m.user_id not in (${list(ids)}))`)) as unknown as { id: string; type: string; name: string }[]
const [{ log }] = (await db.execute(sql`select count(*)::int as log from public.activity_log`)) as unknown as { log: number }[]

console.log(`Accounts to delete (${going.length}): ${going.map((u) => u.email).join(', ')}`)
console.log(`Organisations to delete (${orgs.length}): ${orgs.map((o) => `${o.type} "${o.name}"`).join(', ') || 'none'}`)
console.log(`Activity log rows to clear: ${log} (and the few the deletions write)`)
console.log(`Accounts kept: ${users.filter((u) => !ids.includes(u.id)).map((u) => u.email).join(', ') || 'none'}`)
if (!go) {
  console.log('\nNothing changed. Add --yes to do it.')
  process.exit(0)
}

if (orgs.length) await db.execute(sql`delete from public.organisations where id in (${list(orgs.map((o) => o.id))})`)
for (const u of going) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
    method: 'DELETE',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  console.log(`${u.email}: ${res.ok ? 'deleted' : `NOT deleted (${res.status})`}`)
}
// the log last, so the rows the deletions just wrote go too; the lock is back on in the same transaction
await db.transaction(async (tx) => {
  await tx.execute(sql.raw('alter table public.activity_log disable trigger user'))
  await tx.execute(sql.raw('delete from public.activity_log'))
  await tx.execute(sql.raw('alter table public.activity_log enable trigger user'))
})
const off = (await db.execute(sql`select tgname from pg_trigger where not tgisinternal and tgenabled = 'D'`)) as unknown as { tgname: string }[]
const [left] = (await db.execute(sql`select (select count(*) from auth.users)::int as accounts, (select count(*) from public.organisations)::int as organisations, (select count(*) from public.activity_log)::int as log`)) as unknown as Record<string, number>[]
console.log(`Locks switched off now: ${off.length ? off.map((r) => r.tgname).join(', ') : 'none'}. Left: ${JSON.stringify(left)}`)
process.exit(0)
