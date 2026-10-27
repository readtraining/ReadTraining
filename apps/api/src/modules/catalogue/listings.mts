import { TRPCError } from '@trpc/server'

import { asc, courseExams, courseFaqs, courseImages, courseUnits, eq, sql } from '@readtraining/db'

import type { db as Db } from '../../lib/db.mjs'
import { mediaUrl } from '../../lib/media.mjs'
import { formatPostcode, POSTCODE } from '../../lib/postcode.mjs'

// The public catalogue (Milestone 2): what learners see on the search, category and course pages, read from the real courses.
//
// A listing is one public course page. It is either a live shared course page (written by ReadTraining's team) that has at
// least one live provider course on it, or a live provider course with its own page (not under a shared page). An offering is a
// provider's live course that learners can book: a shared page's offerings are the providers' courses on it; a provider
// course's only offering is itself. A course shows only while its provider is active; private courses (is_public false) and
// unlisted ones are left out of search but their page still opens from its address. Prices include VAT, in pence here.

type Row = Record<string, unknown>
type Session = { date: string; end: string; from: string; to: string }

export type Venue = { city: string; postcode: string | null; lat: number | null; lng: number | null }
export type Listing = {
  id: number
  slug: string
  kind: 'shared' | 'provider'
  title: string
  summary: string
  category: string | null
  subcategory: string | null
  topic: string | null
  level: string | null
  methods: string[]
  venues: Venue[]
  providers: number
  upcoming: number
  fromPence: number | null
  wasPence: number | null
  duration: string
  publishedAt: string | null
  imageUrl: string | null
  skillSaver: boolean
  nextDate: { method: string; date: string; city: string | null } | null
  popularity: number
}

// how long a run takes: its days, counting every day of each session
export function runLength(sessions: Session[]) {
  const days = new Set<string>()
  for (const s of sessions) {
    for (let d = new Date(`${s.date}T00:00:00Z`); d <= new Date(`${(s.end || s.date)}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) days.add(d.toISOString().slice(0, 10))
  }
  return days.size
}
const lengthText = (n: number) => (n ? `${n} ${n === 1 ? 'day' : 'days'}` : '')

// The live offerings and their bookable dates (starting today or later, not cancelled, taking bookings).
async function offeringsAndDates(db: typeof Db, where = sql`true`) {
  const offers = await db.execute<{ id: number; parent_id: number | null; slug: string; title: string; method: string | null; model: string; price_pence: number | null; skill_saver: boolean; is_public: boolean; listed: boolean; organisation_id: string; provider: string; provider_slug: string; logo_path: string | null; provider_city: string | null }>(sql`
    select c.id, c.parent_id, c.slug, c.title, c.method, c.model, c.price_pence, c.skill_saver, c.is_public, c.listed, c.organisation_id,
           o.name provider, o.slug provider_slug, o.logo_path, o.city provider_city
    from public.courses c join public.organisations o on o.id = c.organisation_id
    where c.kind = 'provider' and c.status = 'live' and o.status = 'active' and ${where}`)
  const ids = offers.map((o) => o.id)
  const dates = ids.length
    ? await db.execute<{ id: string; course_id: number; method: string; sessions: Session[]; starts_on: string; ends_on: string; price_pence: number; was_price_pence: number | null; capacity: number; details: string | null; join_url: string | null; venue_name: string | null; street: string | null; city: string | null; postcode: string | null; lat: number | null; lng: number | null }>(sql`
        select k.id, k.course_id, k.method, k.sessions, k.starts_on::text, k.ends_on::text, k.price_pence, k.was_price_pence, k.capacity, k.details, k.join_url,
               v.name venue_name, v.street, v.city, v.postcode, v.lat, v.lng
        from public.cohorts k left join public.venues v on v.id = k.venue_id
        where k.course_id in ${sql.raw(`(${ids.map((n) => Number(n)).filter(Number.isInteger).join(',')})`)} and k.cancelled_at is null and k.bookable and k.starts_on >= current_date
        order by k.starts_on, k.price_pence`)
    : []
  return { offers, dates }
}

// Every listing, most popular first. (Popularity counts providers and upcoming dates until there are bookings to count.)
export async function loadListings(db: typeof Db): Promise<Listing[]> {
  const pages = await db.execute<{ id: number; kind: 'shared' | 'provider'; slug: string; title: string; summary: string | null; parent_id: number | null; organisation_id: string | null; level: string | null; published_at: string | null; category: string | null; subcategory: string | null; topic: string | null; cover: string | null; is_public: boolean; listed: boolean; provider_active: boolean | null }>(sql`
    select c.id, c.kind, c.slug, c.title, c.summary, c.parent_id, c.organisation_id, c.level, c.published_at, c.is_public, c.listed,
           (select slug from public.categories where id = c.category_id) category,
           (select slug from public.subcategories where id = c.subcategory_id) subcategory,
           (select slug from public.topics where id = c.topic_id) topic,
           (select i.path from public.course_images i where i.course_id = c.id order by i.position limit 1) cover,
           (select o.status = 'active' from public.organisations o where o.id = c.organisation_id) provider_active
    from public.courses c
    where c.status = 'live' and c.listed and (c.kind = 'shared' or (c.parent_id is null and c.is_public))`)
  const { offers, dates } = await offeringsAndDates(db, sql`c.is_public and c.listed`)
  const datesOf = new Map<number, (typeof dates)[number][]>()
  for (const d of dates) datesOf.set(d.course_id, [...(datesOf.get(d.course_id) ?? []), d])

  const out: Listing[] = []
  for (const p of pages) {
    if (p.kind === 'provider' && !p.provider_active) continue
    const mine = p.kind === 'shared' ? offers.filter((o) => o.parent_id === p.id) : offers.filter((o) => o.id === p.id)
    if (!mine.length) continue
    const ds = mine.flatMap((o) => datesOf.get(o.id) ?? [])
    const selfPaced = mine.filter((o) => o.method === 'self-paced' && o.price_pence !== null)
    const prices = [...ds.map((d) => ({ p: d.price_pence, was: d.was_price_pence })), ...selfPaced.map((o) => ({ p: o.price_pence as number, was: null }))]
    const cheapest = prices.sort((a, b) => a.p - b.p)[0]
    const venues = new Map<string, Venue>()
    for (const d of ds) if (d.city) venues.set(`${d.city}|${d.postcode}`, { city: d.city, postcode: d.postcode, lat: d.lat, lng: d.lng })
    const first = ds[0]
    const methods = [...new Set(mine.map((o) => o.method).filter((m): m is string => Boolean(m)))]
    const providers = new Set(mine.map((o) => o.organisation_id)).size
    out.push({
      id: p.id,
      slug: p.slug,
      kind: p.kind,
      title: p.title,
      summary: p.summary ?? '',
      category: p.category,
      subcategory: p.subcategory,
      topic: p.topic,
      level: p.level,
      methods,
      venues: [...venues.values()],
      providers,
      upcoming: ds.length,
      fromPence: cheapest?.p ?? null,
      wasPence: cheapest?.was ?? null,
      duration: first ? lengthText(runLength(first.sessions)) : methods.length === 1 && methods[0] === 'self-paced' ? 'Self-paced' : '',
      publishedAt: p.published_at ? new Date(p.published_at).toISOString() : null,
      imageUrl: mediaUrl(p.cover),
      skillSaver: mine.some((o) => o.skill_saver),
      nextDate: first ? { method: first.method, date: first.starts_on, city: first.city } : null,
      popularity: providers * 100 + ds.length,
    })
  }
  return out.sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title))
}

// One course page by its address: the course as written, its images and lists, and its offerings with their providers and dates.
// A shared page's offerings are the providers' courses on it; a provider course's page shows its own dates (and names the shared
// page it is on). Null when there is no such live page. A course number (an old numeric link, /course/1012) finds its course too;
// the page then sends the visitor on to its address.
export async function loadCoursePage(db: typeof Db, slug: string) {
  const id = /^\d{1,9}$/.test(slug) ? Number(slug) : null
  const [c] = await db.execute<Row & { id: number; kind: 'shared' | 'provider'; parent_id: number | null; organisation_id: string | null; method: string | null; price_pence: number | null }>(sql`
    select c.id, c.kind, c.slug, c.title, c.summary, c.description, c.audience, c.entry_requirements, c.outcomes, c.features, c.level, c.method, c.model,
           c.price_pence, c.skill_saver, c.video_url, c.seo_title, c.seo_description, c.seo_keywords, c.published_at, c.updated_at, c.parent_id, c.organisation_id, c.is_public, c.listed,
           (select slug from public.categories where id = c.category_id) category,
           (select slug from public.subcategories where id = c.subcategory_id) subcategory,
           (select slug from public.topics where id = c.topic_id) topic
    from public.courses c
    where ${id === null ? sql`c.slug = ${slug}` : sql`c.id = ${id} and c.is_public`} and c.status = 'live'
      and (c.kind = 'shared' or exists (select 1 from public.organisations o where o.id = c.organisation_id and o.status = 'active'))`)
  if (!c) return null
  const [units, exams, faqs, images] = await Promise.all([
    db.select().from(courseUnits).where(eq(courseUnits.courseId, c.id)).orderBy(asc(courseUnits.position)),
    db.select().from(courseExams).where(eq(courseExams.courseId, c.id)).orderBy(asc(courseExams.position)),
    db.select().from(courseFaqs).where(eq(courseFaqs.courseId, c.id)).orderBy(asc(courseFaqs.position)),
    db.select().from(courseImages).where(eq(courseImages.courseId, c.id)).orderBy(asc(courseImages.position)),
  ])
  // a shared page lists the providers' public, listed courses on it; a provider course is its own offering
  const { offers, dates } = await offeringsAndDates(db, c.kind === 'shared' ? sql`c.parent_id = ${c.id} and c.is_public and c.listed` : sql`c.id = ${c.id}`)
  const [parent] = c.parent_id ? await db.execute<{ slug: string; title: string }>(sql`select slug, title from public.courses where id = ${c.parent_id} and status = 'live'`) : []
  const [provider] = c.kind === 'provider'
    ? await db.execute<{ name: string; slug: string; logo_path: string | null; headline: string | null; city: string | null; booking_terms: string | null; cancellation_policy: string | null }>(sql`
        select name, slug, logo_path, headline, city, booking_terms, cancellation_policy from public.organisations where id = ${c.organisation_id}::uuid`)
    : []
  return {
    id: c.id,
    kind: c.kind,
    slug: c.slug as string,
    title: c.title as string,
    summary: (c.summary as string | null) ?? '',
    description: (c.description as string | null) ?? '',
    audience: (c.audience as string | null) ?? '',
    entryRequirements: (c.entry_requirements as string | null) ?? '',
    outcomes: (c.outcomes as string[]) ?? [],
    features: (c.features as string[]) ?? [],
    category: c.category as string | null,
    subcategory: c.subcategory as string | null,
    topic: c.topic as string | null,
    level: c.level as string | null,
    videoUrl: (c.video_url as string | null) ?? null,
    seoTitle: (c.seo_title as string | null) ?? null,
    seoDescription: (c.seo_description as string | null) ?? null,
    publishedAt: c.published_at ? new Date(c.published_at as string).toISOString() : null,
    updatedAt: c.updated_at ? new Date(c.updated_at as string).toISOString() : null,
    images: images.map((i) => ({ url: mediaUrl(i.path)!, alt: i.alt ?? '' })),
    units: units.map((u) => ({ title: u.title, body: u.body ?? '' })),
    exams: exams.map((e) => ({ unit: e.unit, passMark: e.passMark ?? '', duration: e.duration ?? '' })),
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    parent: parent ?? null,
    provider: provider
      ? { name: provider.name, slug: provider.slug, logoUrl: mediaUrl(provider.logo_path), headline: provider.headline ?? '', city: provider.city ?? '', bookingTerms: provider.booking_terms ?? '', cancellationPolicy: provider.cancellation_policy ?? '' }
      : null,
    offerings: offers.map((o) => ({
      courseId: o.id,
      slug: o.slug,
      title: o.title,
      method: o.method,
      model: o.model,
      skillSaver: o.skill_saver,
      selfPacedPence: o.method === 'self-paced' ? o.price_pence : null,
      provider: { name: o.provider, slug: o.provider_slug, logoUrl: mediaUrl(o.logo_path), city: o.provider_city ?? '' },
      dates: dates
        .filter((d) => d.course_id === o.id)
        .map((d) => ({
          id: d.id,
          method: d.method,
          sessions: d.sessions,
          startsOn: d.starts_on,
          endsOn: d.ends_on,
          days: runLength(d.sessions),
          pricePence: d.price_pence,
          wasPricePence: d.was_price_pence,
          capacity: d.capacity,
          details: d.details ?? '',
          venue: d.city ? { name: d.venue_name ?? '', street: d.street ?? '', city: d.city, postcode: d.postcode, lat: d.lat, lng: d.lng } : null,
        })),
    })),
  }
}

// ---- where learners are: a town, place or postcode on the map (postcodes.io, Open Government Licence; only the words typed are sent)

const OUTCODE = /^[A-Z]{1,2}\d[A-Z\d]?$/i
const located = new Map<string, { lat: number; lng: number; label: string } | null>()

export async function locate(q: string) {
  const key = q.trim().toLowerCase()
  if (!key) return null
  if (located.has(key)) return located.get(key)!
  const get = async (path: string) => {
    try {
      const res = await fetch(`https://api.postcodes.io${path}`, { signal: AbortSignal.timeout(4000) })
      return res.ok ? ((await res.json()) as { result?: unknown }).result : null
    } catch {
      return null
    }
  }
  let found: { lat: number; lng: number; label: string } | null = null
  if (POSTCODE.test(key)) {
    const r = (await get(`/postcodes/${encodeURIComponent(key.replace(/\s+/g, ''))}`)) as { latitude?: number; longitude?: number } | null
    if (r?.latitude != null && r.longitude != null) found = { lat: r.latitude, lng: r.longitude, label: formatPostcode(key) }
  } else if (OUTCODE.test(key)) {
    const r = (await get(`/outcodes/${encodeURIComponent(key)}`)) as { latitude?: number; longitude?: number } | null
    if (r?.latitude != null && r.longitude != null) found = { lat: r.latitude, lng: r.longitude, label: key.toUpperCase() }
  } else {
    const r = (await get(`/places?q=${encodeURIComponent(key)}&limit=5`)) as { name_1?: string; latitude?: number; longitude?: number; local_type?: string }[] | null
    // a town or city first, if one matches; otherwise the first place
    const best = r?.find((p) => /city|town/i.test(p.local_type ?? '')) ?? r?.[0]
    if (best?.latitude != null && best.longitude != null) found = { lat: best.latitude, lng: best.longitude, label: best.name_1 ?? q.trim() }
  }
  if (located.size > 2000) located.clear()
  located.set(key, found)
  return found
}

export const notFoundCourse = () => new TRPCError({ code: 'NOT_FOUND', message: 'This course was not found.' })

// ---- providers' public pages ------------------------------------------------------------------------------------------------

export type ProviderCourse = { slug: string; title: string; imageUrl: string | null; duration: string; category: string | null; methods: string[]; cities: string[]; fromPence: number | null; wasPence: number | null }

// A provider's live, public and listed courses (its own pages: a course on a shared page links to the provider's page for it),
// A to Z, each with its length, how it runs, its venue towns and its lowest upcoming price.
export async function loadProviderCourses(db: typeof Db, organisationId: string): Promise<ProviderCourse[]> {
  const { offers, dates } = await offeringsAndDates(db, sql`c.organisation_id = ${organisationId}::uuid and c.is_public and c.listed`)
  if (!offers.length) return []
  const extra = await db.execute<{ id: number; category: string | null; cover: string | null }>(sql`
    select c.id, (select slug from public.categories where id = c.category_id) category,
           (select i.path from public.course_images i where i.course_id = c.id order by i.position limit 1) cover
    from public.courses c where c.id in ${sql.raw(`(${offers.map((o) => Number(o.id)).filter(Number.isInteger).join(',')})`)}`)
  return offers
    .map((o) => {
      const ds = dates.filter((d) => d.course_id === o.id)
      const prices = [...ds.map((d) => ({ p: d.price_pence, was: d.was_price_pence })), ...(o.method === 'self-paced' && o.price_pence != null ? [{ p: o.price_pence, was: null }] : [])].sort((a, b) => a.p - b.p)
      const x = extra.find((e) => e.id === o.id)
      return {
        slug: o.slug,
        title: o.title,
        imageUrl: mediaUrl(x?.cover),
        duration: ds[0] ? lengthText(runLength(ds[0].sessions)) : o.method === 'self-paced' ? 'Self-paced' : '',
        category: x?.category ?? null,
        methods: o.method ? [o.method] : [],
        cities: [...new Set(ds.map((d) => d.city).filter((c): c is string => Boolean(c)))].sort(),
        fromPence: prices[0]?.p ?? null,
        wasPence: prices[0]?.was ?? null,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

// Every active provider for the directory, A to Z: where it is, its headline and logo, how many courses it runs and in which
// categories.
export async function loadProviderDirectory(db: typeof Db) {
  const rows = await db.execute<{ id: string; name: string; slug: string; city: string | null; headline: string | null; logo_path: string | null; courses: number; categories: string[] | null }>(sql`
    select o.id, o.name, o.slug, o.city, o.headline, o.logo_path,
           count(c.id)::int courses,
           array_remove(array_agg(distinct (select slug from public.categories where id = c.category_id)), null) categories
    from public.organisations o
    left join public.courses c on c.organisation_id = o.id and c.kind = 'provider' and c.status = 'live' and c.is_public and c.listed
    where o.type = 'provider' and o.status = 'active'
    group by o.id order by o.name`)
  return rows.map((r) => ({ name: r.name, slug: r.slug, city: r.city ?? '', headline: r.headline ?? '', logoUrl: mediaUrl(r.logo_path), courseCount: r.courses, categories: r.categories ?? [] }))
}
