import { TRPCError } from '@trpc/server'

import { asc, courseExams, courseFaqs, courseImages, courseUnits, eq, sql } from '@readtraining/db'

import type { db as Db } from '../../lib/db.mjs'
import { mediaUrl } from '../../lib/media.mjs'
import { publicTiers } from '../provider/plans.mjs'
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
// One price a listing can be booked at: a date's (its way of study and venue, an index into the listing's `venues`; none online)
// or a self-paced course's. The search works out "From" from the ones that pass its filters (a classroom page, a town), so a
// card never shows a price that can't be booked there. Each price once per method and venue.
export type Price = { method: string; venue: number | null; pence: number; wasPence: number | null }
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
  prices: Price[]
  providers: number
  upcoming: number
  fromPence: number | null
  wasPence: number | null
  duration: string
  publishedAt: string | null
  imageUrl: string | null
  imageAlt: string
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

// The live offerings and their bookable dates (starting after today, the UK's date, so a course already under way isn't offered;
// not cancelled, taking bookings). A date or self-paced course on a price plan carries its packages (`plan_tiers`).
async function offeringsAndDates(db: typeof Db, where = sql`true`, anyStatus = false) {
  const offers = await db.execute<{ id: number; parent_id: number | null; slug: string; title: string; method: string | null; model: string; price_pence: number | null; skill_saver: boolean; is_public: boolean; listed: boolean; organisation_id: string; provider: string; provider_slug: string; logo_path: string | null; provider_city: string | null; plan_tiers: unknown }>(sql`
    select c.id, c.parent_id, c.slug, c.title, c.method, c.model, c.skill_saver, c.is_public, c.listed, c.organisation_id,
           c.price_pence, p.tiers plan_tiers,
           o.name provider, o.slug provider_slug, o.logo_path, o.city provider_city
    from public.courses c join public.organisations o on o.id = c.organisation_id left join public.price_plans p on p.id = c.plan_id
    where c.kind = 'provider' and ${anyStatus ? sql`true` : sql`c.status = 'live' and o.status = 'active'`} and ${where}`)
  const ids = offers.map((o) => o.id)
  const dates = ids.length
    ? await db.execute<{ id: string; course_id: number; method: string; sessions: Session[]; starts_on: string; ends_on: string; price_pence: number; was_price_pence: number | null; capacity: number; details: string | null; join_url: string | null; venue_name: string | null; street: string | null; city: string | null; postcode: string | null; lat: number | null; lng: number | null; plan_tiers: unknown }>(sql`
        select k.id, k.course_id, k.method, k.sessions, k.starts_on::text, k.ends_on::text, k.price_pence, k.was_price_pence, k.capacity, k.details, k.join_url,
               v.name venue_name, v.street, v.city, v.postcode, v.lat, v.lng, p.tiers plan_tiers
        from public.cohorts k left join public.venues v on v.id = k.venue_id left join public.price_plans p on p.id = k.plan_id
        where k.course_id in ${sql.raw(`(${ids.map((n) => Number(n)).filter(Number.isInteger).join(',')})`)} and k.cancelled_at is null and k.bookable and k.starts_on > (now() at time zone 'Europe/London')::date
        order by k.starts_on, k.price_pence`)
    : []
  return { offers, dates }
}

// Every listing, most popular first. (Popularity counts providers and upcoming dates until there are bookings to count.)
export async function loadListings(db: typeof Db): Promise<Listing[]> {
  const pages = await db.execute<{ id: number; kind: 'shared' | 'provider'; slug: string; title: string; summary: string | null; parent_id: number | null; organisation_id: string | null; level: string | null; published_at: string | null; category: string | null; subcategory: string | null; topic: string | null; cover: string | null; cover_alt: string | null; is_public: boolean; listed: boolean; provider_active: boolean | null }>(sql`
    select c.id, c.kind, c.slug, c.title, c.summary, c.parent_id, c.organisation_id, c.level, c.published_at, c.is_public, c.listed,
           (select slug from public.categories where id = c.category_id) category,
           (select slug from public.subcategories where id = c.subcategory_id) subcategory,
           (select slug from public.topics where id = c.topic_id) topic,
           (select i.path from public.course_images i where i.course_id = c.id order by i.position limit 1) cover,
           (select i.alt from public.course_images i where i.course_id = c.id order by i.position limit 1) cover_alt,
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
    const venueAt = [...venues.keys()]
    const priceList = new Map<string, Price>()
    for (const x of [
      ...ds.map((d) => ({ method: d.method, venue: d.city ? venueAt.indexOf(`${d.city}|${d.postcode}`) : null, pence: d.price_pence, wasPence: d.was_price_pence })),
      ...selfPaced.map((o) => ({ method: 'self-paced', venue: null, pence: o.price_pence as number, wasPence: null })),
    ]) {
      const key = `${x.method}|${x.venue}`
      const had = priceList.get(key)
      if (!had || x.pence < had.pence) priceList.set(key, x)
    }
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
      prices: [...priceList.values()],
      providers,
      upcoming: ds.length,
      fromPence: cheapest?.p ?? null,
      wasPence: cheapest?.was ?? null,
      duration: first ? lengthText(runLength(first.sessions)) : methods.length === 1 && methods[0] === 'self-paced' ? 'Self-paced' : '',
      publishedAt: p.published_at ? new Date(p.published_at).toISOString() : null,
      imageUrl: mediaUrl(p.cover),
      // what the cover shows, as the provider described it (ALT text), or the course's name
      imageAlt: p.cover_alt || p.title,
      skillSaver: mine.some((o) => o.skill_saver),
      nextDate: first ? { method: first.method, date: first.starts_on, city: first.city } : null,
      popularity: providers * 100 + ds.length,
    })
  }
  return out.sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title))
}

// One course page by its address: the course as written, its images and lists, and its offerings with their providers and dates.
// A shared page's offerings are the providers' courses on it; a provider course's page shows its own dates (and names the shared
// page it is on). Null when there is no such live page, and for a shared page no provider lists a course on (yet, or any more): it
// isn't a listing either, so it never opens with nothing to book. A course number (an old numeric link, /course/1012) finds its
// course too; the page then sends the visitor on to its address. `isPublic` and `listed`: a private or unlisted course still
// opens from its address but is kept out of search engines (the website's app/course/[slug]).
// `preview` (the editors' Preview, provider.courses.preview / admin.courses.preview): the course by its id whatever its status, a
// provider course with its own dates even before it is live, and a change still waiting for approval (`pending`) shown as if
// approved, so the page is the one learners will see. The caller checks who may see it.
export type CoursePreview = { id: number; pending?: Record<string, unknown> | null }
const PREVIEWED = ['title', 'summary', 'description', 'audience', 'entryRequirements', 'outcomes', 'features', 'category', 'subcategory', 'topic', 'level', 'videoUrl', 'units', 'exams', 'faqs'] as const
export async function loadCoursePage(db: typeof Db, slug: string, preview: CoursePreview | null = null) {
  const id = /^\d{1,9}$/.test(slug) ? Number(slug) : null
  const [c] = await db.execute<Row & { id: number; kind: 'shared' | 'provider'; parent_id: number | null; organisation_id: string | null; method: string | null; price_pence: number | null }>(sql`
    select c.id, c.kind, c.slug, c.title, c.summary, c.description, c.audience, c.entry_requirements, c.outcomes, c.features, c.level, c.method, c.model,
           c.price_pence, c.skill_saver, c.video_url, c.seo_title, c.seo_description, c.seo_keywords, c.published_at, c.updated_at, c.parent_id, c.organisation_id, c.is_public, c.listed,
           (select slug from public.categories where id = c.category_id) category,
           (select slug from public.subcategories where id = c.subcategory_id) subcategory,
           (select slug from public.topics where id = c.topic_id) topic
    from public.courses c
    where ${preview ? sql`c.id = ${preview.id}` : sql`${id === null ? sql`c.slug = ${slug}` : sql`c.id = ${id} and c.is_public`} and c.status = 'live'
      and (c.kind = 'shared' or exists (select 1 from public.organisations o where o.id = c.organisation_id and o.status = 'active'))`}`)
  if (!c) return null
  const [units, exams, faqs, images] = await Promise.all([
    db.select().from(courseUnits).where(eq(courseUnits.courseId, c.id)).orderBy(asc(courseUnits.position)),
    db.select().from(courseExams).where(eq(courseExams.courseId, c.id)).orderBy(asc(courseExams.position)),
    db.select().from(courseFaqs).where(eq(courseFaqs.courseId, c.id)).orderBy(asc(courseFaqs.position)),
    db.select().from(courseImages).where(eq(courseImages.courseId, c.id)).orderBy(asc(courseImages.position)),
  ])
  // a shared page lists the providers' public, listed courses on it; a provider course is its own offering
  const { offers, dates } = await offeringsAndDates(db, c.kind === 'shared' ? sql`c.parent_id = ${c.id} and c.is_public and c.listed` : sql`c.id = ${c.id}`, Boolean(preview) && c.kind === 'provider')
  if (!preview && c.kind === 'shared' && !offers.length) return null
  const [parent] = c.parent_id ? await db.execute<{ slug: string; title: string }>(sql`select slug, title from public.courses where id = ${c.parent_id} and status = 'live'`) : []
  const [provider] = c.kind === 'provider'
    ? await db.execute<{ name: string; slug: string; logo_path: string | null; headline: string | null; city: string | null; booking_terms: string | null; cancellation_policy: string | null }>(sql`
        select name, slug, logo_path, headline, city, booking_terms, cancellation_policy from public.organisations where id = ${c.organisation_id}::uuid`)
    : []
  const page = {
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
    isPublic: c.is_public as boolean,
    listed: c.listed as boolean,
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
      selfPacedPlan: o.method === 'self-paced' ? publicTiers(o.plan_tiers) : null, // its packages, when sold in packages
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
          plan: publicTiers(d.plan_tiers), // the packages to choose between (Tiered pricing), or null (Flat)
          details: d.details ?? '',
          venue: d.city ? { name: d.venue_name ?? '', street: d.street ?? '', city: d.city, postcode: d.postcode, lat: d.lat, lng: d.lng } : null,
        })),
    })),
  }
  if (!preview?.pending) return page
  // a waiting change, shown as if approved (the same names as the page's fields)
  const pending = Object.fromEntries(PREVIEWED.filter((k) => preview.pending![k] !== undefined).map((k) => [k, preview.pending![k]]))
  return { ...page, ...pending } as typeof page
}

// ---- where learners are: a town, place or postcode on the map (postcodes.io, Open Government Licence; only the words typed are sent)

const OUTCODE = /^[A-Z]{1,2}\d[A-Z\d]?$/i
// a postcode area on its own (L, M, LS, NE): looked up by its first district, the area's centre (L1 Liverpool, LS1 Leeds)
const AREA = /^[A-Z]{1,2}$/i
type Place = { lat: number; lng: number; label: string; area: string | null }
const located = new Map<string, Place | null>()

type PlaceRow = { name_1?: string; name_2?: string | null; name_2_lang?: string | null; local_type?: string; latitude?: number; longitude?: number; district_borough?: string | null; county_unitary?: string | null; region?: string | null; country?: string | null }
// a place's English name (a Welsh place's name_1 is in Welsh: Casnewydd, name_2 Newport) and the English half of "Casnewydd - Newport"
const english = (p: PlaceRow) => (p.name_2_lang === 'eng' && p.name_2 ? p.name_2 : p.name_1 ?? '')
const englishPart = (v: string | null | undefined) => (v ? v.split(' - ').pop()!.trim() : '')
// how big a place is, for picking one of several with the same name: a city first, then a town, then the rest
const SIZE = ['city', 'town', 'suburban area', 'village', 'other settlement', 'hamlet']
const size = (p: PlaceRow) => {
  const i = SIZE.indexOf((p.local_type ?? '').toLowerCase())
  return i < 0 ? SIZE.length : i
}

// Where a typed town, place, postcode area or postcode is, with the name the site shows for it (`label`) and, for a place, where
// it is (`area`: its district, county or region), so the visitor can tell which Newport was used. Of several places with the
// name, the biggest (a city before a town) wins.
export async function locate(q: string) {
  const key = q.trim().toLowerCase()
  if (!key) return null
  if (located.has(key)) return located.get(key)!
  // a 404 (no such postcode) is an answer; a timeout, a network error or a server error is not: it throws, so nothing is cached and
  // the caller can tell "not found" from "couldn't ask" (a town page doesn't 404, the search doesn't say "we couldn't find it")
  const get = async (path: string) => {
    const res = await fetch(`https://api.postcodes.io${path}`, { signal: AbortSignal.timeout(4000) }).catch(() => null)
    if (res?.status === 404) return null
    if (!res?.ok) throw new TRPCError({ code: 'SERVICE_UNAVAILABLE', message: "We can't look places up right now. Please try again in a moment." })
    return ((await res.json()) as { result?: unknown }).result
  }
  type Outcode = { latitude?: number; longitude?: number; admin_district?: string[] }
  let found: Place | null = null
  if (POSTCODE.test(key)) {
    const r = (await get(`/postcodes/${encodeURIComponent(key.replace(/\s+/g, ''))}`)) as { latitude?: number; longitude?: number } | null
    if (r?.latitude != null && r.longitude != null) found = { lat: r.latitude, lng: r.longitude, label: formatPostcode(key), area: null }
  } else if (OUTCODE.test(key)) {
    const r = (await get(`/outcodes/${encodeURIComponent(key)}`)) as Outcode | null
    if (r?.latitude != null && r.longitude != null) found = { lat: r.latitude, lng: r.longitude, label: key.toUpperCase(), area: null }
  } else if (AREA.test(key)) {
    // most areas' centre is district 1; a few start at 10 (AB10) or split district 1 (WC1A)
    for (const district of ['1', '10', '1A']) {
      const r = (await get(`/outcodes/${encodeURIComponent(key + district)}`)) as Outcode | null
      if (r?.latitude != null && r.longitude != null) {
        found = { lat: r.latitude, lng: r.longitude, label: `${key.toUpperCase()} postcode area`, area: r.admin_district?.[0] ?? null }
        break
      }
    }
  } else {
    const r = (await get(`/places?q=${encodeURIComponent(key)}&limit=50`)) as PlaceRow[] | null
    const words = (v: string) => v.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
    const same = (p: PlaceRow) => [p.name_1, p.name_2].some((n) => n && words(n) === words(key))
    // the biggest place with exactly that name; with none, the biggest whose name starts with the words (as the API lists them)
    const pick = (list: PlaceRow[]) => list.reduce<PlaceRow | undefined>((best, p) => (!best || size(p) < size(best) ? p : best), undefined)
    const best = pick((r ?? []).filter(same)) ?? pick(r ?? [])
    if (best?.latitude != null && best.longitude != null) {
      const label = english(best) || q.trim()
      const isCity = size(best) === 0
      const area = (isCity ? [englishPart(best.county_unitary), best.region, best.country] : [best.district_borough, englishPart(best.county_unitary), best.region]).find((a) => a && words(a) !== words(label)) ?? null
      found = { lat: best.latitude, lng: best.longitude, label, area }
    }
  }
  if (located.size > 2000) located.clear()
  located.set(key, found)
  return found
}

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

// Every active provider with at least one live course (public and listed) for the directory, A to Z: where it is, its headline
// and logo, how many courses it runs and in which categories. A provider with nothing to book (new, or only drafts) stays out,
// and so out of the sitemap, which lists the same providers.
export async function loadProviderDirectory(db: typeof Db) {
  const rows = await db.execute<{ id: string; name: string; slug: string; city: string | null; headline: string | null; logo_path: string | null; courses: number; categories: string[] | null }>(sql`
    select o.id, o.name, o.slug, o.city, o.headline, o.logo_path,
           count(c.id)::int courses,
           array_remove(array_agg(distinct (select slug from public.categories where id = c.category_id)), null) categories
    from public.organisations o
    join public.courses c on c.organisation_id = o.id and c.kind = 'provider' and c.status = 'live' and c.is_public and c.listed
    where o.type = 'provider' and o.status = 'active'
    group by o.id order by o.name`)
  return rows.map((r) => ({ name: r.name, slug: r.slug, city: r.city ?? '', headline: r.headline ?? '', logoUrl: mediaUrl(r.logo_path), courseCount: r.courses, categories: r.categories ?? [] }))
}
