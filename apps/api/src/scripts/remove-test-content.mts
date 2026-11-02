// Removes test and sample content made on a real database while it was being tried out: providers (with their team, venues,
// courses, dates, pictures and logo) and single provider courses, each named on the command line. Nothing is ever removed by
// guessing: run it first without names to see the candidates, then with names to see exactly what would go, then add --confirm.
//
//   pnpm live --filter @readtraining/api remove:test-content                                   list the candidates (no change)
//   pnpm live --filter @readtraining/api remove:test-content --provider apexr-training-group --course test-course-44
//                                                                                              what would go (no change)
//   ... the same with --confirm                                                                remove it
//
// It refuses anything with an order or a payout (money records are kept), shared course pages (seed:courses --remove takes the
// client-review samples off) and a course another course sits on. Login accounts are never removed: the people behind a test
// provider are listed so they can be removed in Supabase if they are test logins too. Each removal is written to the activity log.
import { sql } from '@readtraining/db'

import { logActivity } from '../lib/activity.mjs'
import { db } from '../lib/db.mjs'
import { removeMedia } from '../lib/media.mjs'

const args = process.argv.slice(2)
const named = (flag: string) => args.flatMap((a, i) => (args[i - 1] === flag ? [a.trim()] : []))
const providers = named('--provider')
const courseRefs = named('--course')
const confirm = args.includes('--confirm')
const TEST_WORDS = /\b(test|testing|sample|demo|dummy|qa)\b/i

type Org = { id: string; name: string; slug: string; status: string; logo_path: string | null }
type Course = { id: number; title: string; slug: string; kind: string; status: string; organisation_id: string | null; provider: string | null }

const ordersFor = async (where: ReturnType<typeof sql>) => Number((await db.execute<{ n: number }>(sql`select count(*)::int n from public.orders where ${where}`))[0]?.n ?? 0)

// ---- 1. no names: list the candidates -------------------------------------------------------------------------------------
if (!providers.length && !courseRefs.length) {
  const orgs = await db.execute<Org & { live: number; courses: number; orders: number; people: string | null }>(sql`
    select o.id, o.name, o.slug, o.status, o.logo_path,
           (select count(*)::int from public.courses c where c.organisation_id = o.id and c.status = 'live') live,
           (select count(*)::int from public.courses c where c.organisation_id = o.id) courses,
           (select count(*)::int from public.orders r where r.provider_id = o.id) orders,
           (select string_agg(u.email, ', ') from public.organisation_members m join auth.users u on u.id = m.user_id where m.organisation_id = o.id) people
    from public.organisations o where o.type = 'provider' order by o.created_at`)
  console.log('PROVIDERS (slug · status · live/all courses · orders · people)')
  for (const o of orgs) {
    const hint = TEST_WORDS.test(o.name) ? '  <- name says test/sample' : o.live === 0 ? '  <- no live course' : ''
    console.log(`  ${o.slug} · "${o.name}" · ${o.status} · ${o.live}/${o.courses} · ${o.orders} orders · ${o.people ?? 'no team'}${hint}`)
  }
  const cs = await db.execute<Course & { orders: number }>(sql`
    select c.id, c.title, c.slug, c.kind, c.status, c.organisation_id, o.name provider,
           (select count(*)::int from public.orders r where r.course_id = c.id) orders
    from public.courses c left join public.organisations o on o.id = c.organisation_id
    where c.kind = 'provider' order by c.created_at`)
  console.log('\nPROVIDER COURSES (slug · status · provider · orders)')
  for (const c of cs) console.log(`  ${c.slug} · "${c.title}" · ${c.status} · ${c.provider ?? '-'} · ${c.orders} orders${TEST_WORDS.test(c.title) || TEST_WORDS.test(c.slug) ? '  <- says test' : ''}`)
  console.log('\nNothing was changed. Name what should go with --provider <slug> and --course <slug>, check the list, then add --confirm.')
  process.exit(0)
}

// ---- 2. names: work out exactly what would go ----------------------------------------------------------------------------
const problems: string[] = []
const orgs: Org[] = []
for (const slug of providers) {
  const [o] = await db.execute<Org>(sql`select id, name, slug, status, logo_path from public.organisations where slug = ${slug} and type = 'provider'`)
  if (!o) { problems.push(`No provider "${slug}".`); continue }
  const orders = await ordersFor(sql`provider_id = ${o.id}::uuid`)
  const [p] = await db.execute<{ n: number }>(sql`select count(*)::int n from public.payouts where provider_id = ${o.id}::uuid`)
  if (orders || p.n) problems.push(`"${o.name}" has ${orders} orders and ${p.n} payouts: money records are kept, so it can't be removed.`)
  orgs.push(o)
}
const orgIds = orgs.map((o) => o.id)
const courses: Course[] = []
const seen = new Set<number>()
const addCourse = (c: Course) => { if (!seen.has(c.id)) { seen.add(c.id); courses.push(c) } }
for (const ref of courseRefs) {
  const [c] = await db.execute<Course>(sql`
    select c.id, c.title, c.slug, c.kind, c.status, c.organisation_id, o.name provider
    from public.courses c left join public.organisations o on o.id = c.organisation_id
    where c.slug = ${ref} or c.id::text = ${ref}`)
  if (!c) { problems.push(`No course "${ref}".`); continue }
  if (c.kind !== 'provider') { problems.push(`"${c.title}" is a shared course page: seed:courses --remove or Admin › Catalogue looks after those.`); continue }
  addCourse(c)
}
if (orgIds.length) {
  const owned = await db.execute<Course>(sql`
    select c.id, c.title, c.slug, c.kind, c.status, c.organisation_id, o.name provider
    from public.courses c join public.organisations o on o.id = c.organisation_id
    where c.organisation_id in ${sql.raw(`(${orgIds.map((id) => `'${id}'`).join(',')})`)}`)
  owned.forEach(addCourse)
}
for (const c of courses) {
  const orders = await ordersFor(sql`course_id = ${c.id}`)
  if (orders) problems.push(`"${c.title}" has ${orders} orders: money records are kept, so it can't be removed.`)
  const [kids] = await db.execute<{ n: number }>(sql`select count(*)::int n from public.courses where parent_id = ${c.id}`)
  if (kids.n) problems.push(`"${c.title}" has ${kids.n} courses listed on it, so it can't be removed.`)
}
const ids = courses.map((c) => c.id)
const idList = sql.raw(`(${ids.length ? ids.join(',') : 'null'})`)
const images = ids.length ? await db.execute<{ path: string }>(sql`select path from public.course_images where course_id in ${idList}`) : []
const [dates] = ids.length ? await db.execute<{ n: number }>(sql`select count(*)::int n from public.cohorts where course_id in ${idList}`) : [{ n: 0 }]
const orgList = sql.raw(`(${orgIds.length ? orgIds.map((id) => `'${id}'`).join(',') : 'null'})`)
const venues = orgIds.length ? await db.execute<{ id: string }>(sql`select id from public.venues where organisation_id in ${orgList}`) : []
const people = orgIds.length
  ? await db.execute<{ email: string; name: string }>(sql`select u.email, o.name from public.organisation_members m join auth.users u on u.id = m.user_id join public.organisations o on o.id = m.organisation_id where m.organisation_id in ${orgList}`)
  : []
// another dated course on one of these venues (a provider not being removed) would lose its venue: refuse
if (venues.length) {
  const [other] = await db.execute<{ n: number }>(sql`select count(*)::int n from public.cohorts h where h.venue_id in ${sql.raw(`(${venues.map((v) => `'${v.id}'`).join(',')})`)} and h.course_id not in ${idList}`)
  if (other.n) problems.push(`${other.n} dates of other courses use these providers' venues, so they can't be removed.`)
}

console.log('WOULD REMOVE')
for (const o of orgs) console.log(`  provider "${o.name}" (${o.slug}, ${o.status}) with its team${o.logo_path ? ' and logo' : ''}`)
for (const c of courses) console.log(`  course "${c.title}" (${c.slug}, ${c.status}${c.provider ? `, ${c.provider}` : ''})`)
console.log(`  ${dates.n} dates, ${venues.length} venues, ${images.length} pictures`)
if (people.length) console.log(`  Login accounts are kept: ${people.map((p) => `${p.email} (${p.name})`).join(', ')}. Remove them in Supabase if they are test logins too.`)
if (problems.length) {
  console.log(`\nNOT POSSIBLE:\n  ${problems.join('\n  ')}\nNothing was changed.`)
  process.exit(1)
}
if (!confirm) {
  console.log('\nNothing was changed. Run the same command with --confirm to remove the above.')
  process.exit(0)
}

// ---- 3. --confirm: remove it, in one transaction ---------------------------------------------------------------------------
await db.transaction(async (tx) => {
  // courses take their dates, revisions, units, exams, FAQs and picture rows with them (cascade)
  for (const c of courses) {
    await tx.execute(sql`delete from public.courses where id = ${c.id}`)
    await logActivity(tx, { actorIdentity: 'system', organisationId: c.organisation_id, action: 'system.test_content_removed', targetType: 'course', targetId: String(c.id), metadata: { title: c.title, slug: c.slug, by: 'remove:test-content' } })
  }
  for (const o of orgs) {
    await tx.execute(sql`delete from public.venues where organisation_id = ${o.id}::uuid`)
    await tx.execute(sql`delete from public.organisations where id = ${o.id}::uuid`) // its team rows go with it (cascade)
    await logActivity(tx, { actorIdentity: 'system', organisationId: o.id, action: 'system.test_content_removed', targetType: 'organisation', targetId: o.id, metadata: { name: o.name, slug: o.slug, by: 'remove:test-content' } })
  }
})
await removeMedia([...images.map((i) => i.path), ...orgs.flatMap((o) => (o.logo_path ? [o.logo_path] : []))])
console.log(`\nRemoved ${orgs.length} providers and ${courses.length} courses.`)
process.exit(0)
