import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { and, asc, cohorts, courses, eq, gte, isNull, ne, organisationMembers, profiles, sql, venues } from '@readtraining/db'
import { can } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import { formatPostcode, lookupDown, placeVenue, POSTCODE } from '../../lib/postcode.mjs'
import { createTRPCRouter, orgProcedure } from '../../trpc/trpc.mjs'
import { ownCourse, ukToday as today } from './courses.mjs'
import { usablePlan } from './plans.mjs'

// A provider's venues and course dates (cohorts). Dates are part of the course's prices and timetable, so they change straight
// away, without approval. A tutor sees only the cohorts they teach.

// a refusal, on the date form's field when it is about one (`field` as the form names it)
const bad = (message: string, field?: string) => new TRPCError({ code: 'BAD_REQUEST', message, cause: field ? Object.assign(new Error(message), { field }) : undefined })

const log = (tx: Parameters<typeof logActivity>[0], ctx: { user: { id: string }; ip: string | null }, organisationId: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) =>
  logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'provider', organisationId, action, targetType, targetId, metadata, ip: ctx.ip })

// A live online date's joining link: the https address of one Zoom, Microsoft Teams or Google Meet meeting, so learners are never
// sent to some other page (a sign-up or download page, or a link with a login in it). The cohort form checks the same
// (ProviderCohorts.jsx isMeetingLink): keep the two the same.
const MEETINGS: [RegExp, RegExp][] = [
  // Zoom: a meeting or webinar number (/j/, /w/) or a personal room (/my/), on zoom.us or a company's own zoom.us address
  [/^(?:[a-z0-9-]+\.)*zoom\.(?:us|com)$/, /^\/(?:(?:j|w)\/\d{9,13}|my\/[\w.-]+)\/?$/],
  // Microsoft Teams: a meeting's join link (/l/meetup-join/…) or its short form (/meet/…)
  [/^teams\.(?:microsoft|live)\.com$/, /^\/(?:l\/meetup-join\/.+|meet\/[\w-]+\/?)$/],
  // Google Meet: a meeting code, like abc-defg-hij
  [/^meet\.google\.com$/, /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/],
]
export function isMeetingLink(v: string) {
  try {
    const u = new URL(v)
    if (u.protocol !== 'https:' || u.username || u.password) return false
    const host = u.hostname.toLowerCase()
    return MEETINGS.some(([h, path]) => h.test(host) && path.test(u.pathname))
  } catch {
    return false
  }
}
const MEETING_LINK_ERROR = 'Use the https link to one Zoom, Microsoft Teams or Google Meet meeting, like https://zoom.us/j/1234567890.'

// ---- venues -------------------------------------------------------------------------------------------------------------

// a venue's words are saved with single spaces ("Unit  4" is "Unit 4"), so the same place typed twice is seen as the same
const oneSpace = (v: string) => v.replace(/\s+/g, ' ')
const venueFields = z.object({
  name: z.string().trim().min(2, 'Enter the venue name.').max(100, 'Keep the venue name to 100 characters or fewer.').transform(oneSpace),
  street: z.string().trim().min(3, 'Enter the street address.').max(160, 'Keep the address to 160 characters or fewer.').transform(oneSpace),
  // one town: the whole name is checked as a UK place near the postcode and becomes a public town page ("Leeds, Islamabad" would
  // be checked as Leeds but shown as both)
  city: z.string().trim().min(2, 'Enter the town or city.').max(60, 'Keep the town or city to 60 characters or fewer.').refine((v) => !v.includes(','), 'Enter one town or city, without a comma (like Stoke-on-Trent).').transform(oneSpace),
  postcode: z.string().trim().regex(POSTCODE, 'Enter a full UK postcode, like M1 1AE.'),
})

async function ownVenue(db: Parameters<typeof ownCourse>[0], organisationId: string, venueId: string) {
  const [v] = await db.select().from(venues).where(and(eq(venues.id, venueId), eq(venues.organisationId, organisationId)))
  if (!v) throw new TRPCError({ code: 'NOT_FOUND', message: 'This venue was not found.' })
  return v
}

// A venue's or a date's row as it stands now, locked until the transaction ends: an action checks the state again under the
// lock, so of two at the same moment (a double click, or two people) one acts and the other is told it has been done.
type Tx = Parameters<Parameters<Parameters<typeof ownCourse>[0]['transaction']>[0]>[0]
async function lockVenue(tx: Tx, venueId: string) {
  const [v] = await tx.select({ active: venues.active }).from(venues).where(eq(venues.id, venueId)).for('update')
  return v ?? null
}
async function lockCohort(tx: Tx, cohortId: string) {
  const [c] = await tx.select({ cancelledAt: cohorts.cancelledAt, bookable: cohorts.bookable, endsOn: cohorts.endsOn, updatedAt: cohorts.updatedAt, method: cohorts.method, joinUrl: cohorts.joinUrl }).from(cohorts).where(eq(cohorts.id, cohortId)).for('update')
  return c ?? null
}
// Two people (or two tabs) editing the same dates: the form sends the version it was filled from (`seen`, the dates' updatedAt), and
// a save over a newer one is refused, so neither person's change is silently overwritten.
const DATES_CHANGED =
  'These dates were changed somewhere else (in another tab, or by someone else) since you opened them. Your changes are not saved. Copy anything you want to keep, then close this form and open the dates again.'
const VENUE_GONE = 'This venue has already been deleted. Reload the page.'
const DATES_GONE = 'These dates have already been deleted. Reload the page.'

// A venue saved while postcodes.io couldn't be asked has no map point, so no public town page or menu uses its town until it is
// checked. It is looked up again when the provider opens their venues or saves dates there (a few at a time, and not while
// postcodes.io is known to be down). A venue whose town or postcode now proves wrong stays without a point, and the venue list
// says why (remembered for a while, so the list doesn't ask again on every visit). Returns the problems, by venue id.
const PROBLEM_MS = 10 * 60_000
const venueProblems = new Map<string, { message: string; at: number }>() // by "postcode|town"
async function recheckVenues(db: Parameters<typeof ownCourse>[0], organisationId: string, venueId?: string) {
  const problems = new Map<string, string>()
  const rows = await db
    .select({ id: venues.id, postcode: venues.postcode, city: venues.city })
    .from(venues)
    .where(and(eq(venues.organisationId, organisationId), isNull(venues.lat), venueId ? eq(venues.id, venueId) : undefined))
    .limit(5)
  await Promise.all(
    rows.map(async (v) => {
      if (!v.postcode) return
      const key = `${v.postcode}|${v.city.trim().toLowerCase()}`
      const known = venueProblems.get(key)
      if (known && Date.now() - known.at < PROBLEM_MS) return problems.set(v.id, known.message)
      if (lookupDown()) return
      const place = await placeVenue(v.postcode, v.city)
      if (place.problem) {
        venueProblems.set(key, { message: place.problem.message, at: Date.now() })
        problems.set(v.id, place.problem.message)
      } else if (place.at) {
        // only if the venue is still as it was looked up (an edit at the same moment does its own check)
        await db.update(venues).set({ lat: place.at.lat, lng: place.at.lng }).where(and(eq(venues.id, v.id), isNull(venues.lat), eq(venues.postcode, v.postcode), eq(venues.city, v.city)))
      }
    }),
  )
  return problems
}

export const providerVenuesRouter = createTRPCRouter({
  // `located`: on the map (its town checked); `problem`: why a venue not on the map can't be placed, when that is known
  list: orgProcedure('provider.cohorts.view').query(async ({ ctx, input }) => {
    const problems = await recheckVenues(ctx.db, input.organisationId).catch(() => new Map<string, string>())
    // `used`: dates that have ever used the venue (any, past or cancelled): such a venue can be archived but not deleted
    const rows = await ctx.db.execute<{ id: string; name: string; street: string; city: string; postcode: string | null; active: boolean; located: boolean; upcoming: number; used: number }>(sql`
      select v.id, v.name, v.street, v.city, v.postcode, v.active, v.lat is not null located,
             (select count(*)::int from public.cohorts k where k.venue_id = v.id and k.cancelled_at is null and k.ends_on >= ${today()}::date) upcoming,
             (select count(*)::int from public.cohorts k where k.venue_id = v.id) used
      from public.venues v where v.organisation_id = ${input.organisationId}::uuid order by v.active desc, v.name`)
    return rows.map((r) => ({ ...r, problem: r.located ? null : (problems.get(r.id) ?? null) }))
  }),

  save: orgProcedure('provider.cohorts.edit')
    .input(venueFields.extend({ venueId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const postcode = formatPostcode(input.postcode)
      const before = input.venueId ? await ownVenue(ctx.db, input.organisationId, input.venueId) : null
      // the same place twice (same postcode, and the same name or street) would show twice in every venue list: refused. Checked
      // first for a quick answer, and again inside the save under a lock on the provider's venues, so two saves at the same moment
      // can't both pass.
      const refuseTwin = async (db: Pick<typeof ctx.db, 'execute'>) => {
        const [twin] = await db.execute<{ name: string }>(sql`
          select name from public.venues
          where organisation_id = ${input.organisationId}::uuid and ${before ? sql`id <> ${before.id}::uuid` : sql`true`}
            and upper(replace(coalesce(postcode, ''), ' ', '')) = ${postcode.replace(/\s/g, '').toUpperCase()}
            and (lower(regexp_replace(trim(name), '\\s+', ' ', 'g')) = ${input.name.toLowerCase()} or lower(regexp_replace(trim(street), '\\s+', ' ', 'g')) = ${input.street.toLowerCase()})
          limit 1`)
        if (twin) throw new TRPCError({ code: 'BAD_REQUEST', message: `You already have this venue: ${twin.name}, ${postcode}. Edit that one instead.`, cause: Object.assign(new Error('duplicate venue'), { field: 'name' }) })
      }
      await refuseTwin(ctx.db)
      // look the place up when the postcode or the town is new or changed: the postcode must be in use and the town a UK place near
      // it (lib/postcode.mts placeVenue), since the town becomes a public town page
      // If postcodes.io can't be asked, the venue is saved without a map point (`unchecked`): its town is checked again later
      // (recheckVenues), and until then no public town page uses it.
      const same = before && before.postcode === postcode && before.city.trim().toLowerCase() === input.city.trim().toLowerCase() && before.lat !== null
      const place = same ? { at: { lat: before.lat!, lng: before.lng! }, problem: null, unchecked: false } : await placeVenue(postcode, input.city)
      if (place.problem) throw new TRPCError({ code: 'BAD_REQUEST', message: place.problem.message, cause: Object.assign(new Error('venue place'), { field: place.problem.field }) })
      const where = place.unchecked ? null : place.at
      const values = { name: input.name, street: input.street, city: input.city, postcode, lat: where?.lat ?? null, lng: where?.lng ?? null, updatedAt: new Date() }
      return ctx.db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`readtraining.venues:${input.organisationId}`}))`)
        await refuseTwin(tx)
        const [v] = before
          ? await tx.update(venues).set(values).where(eq(venues.id, before.id)).returning({ id: venues.id })
          : await tx.insert(venues).values({ ...values, organisationId: input.organisationId }).returning({ id: venues.id })
        await log(tx, ctx, input.organisationId, before ? 'venue.updated' : 'venue.created', 'venue', v.id, { name: input.name })
        return { id: v.id, located: Boolean(where), unchecked: place.unchecked }
      })
    }),

  // Hide a venue from new dates (its past and booked dates keep it), or bring it back.
  setActive: orgProcedure('provider.cohorts.edit')
    .input(z.object({ venueId: z.string().uuid(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ownVenue(ctx.db, input.organisationId, input.venueId)
      return ctx.db.transaction(async (tx) => {
        const now = await lockVenue(tx, input.venueId)
        if (!now) throw new TRPCError({ code: 'CONFLICT', message: VENUE_GONE })
        if (now.active === input.active) throw new TRPCError({ code: 'CONFLICT', message: input.active ? 'This venue is already in use again.' : 'This venue is already archived.' })
        await tx.update(venues).set({ active: input.active, updatedAt: new Date() }).where(eq(venues.id, input.venueId))
        await log(tx, ctx, input.organisationId, input.active ? 'venue.restored' : 'venue.archived', 'venue', input.venueId)
        return { ok: true }
      })
    }),

  // Delete a venue no date has ever used.
  remove: orgProcedure('provider.cohorts.edit')
    .input(z.object({ venueId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const v = await ownVenue(ctx.db, input.organisationId, input.venueId)
      return ctx.db.transaction(async (tx) => {
        // under the lock, a date being added to this venue at the same moment waits (or is counted here)
        if (!(await lockVenue(tx, v.id))) throw new TRPCError({ code: 'CONFLICT', message: VENUE_GONE })
        const [n] = await tx.select({ n: sql<number>`count(*)::int` }).from(cohorts).where(eq(cohorts.venueId, v.id))
        if (n.n) throw new TRPCError({ code: 'CONFLICT', message: 'Dates use this venue, so it can’t be deleted. Archive it instead.' })
        await tx.delete(venues).where(eq(venues.id, v.id))
        await log(tx, ctx, input.organisationId, 'venue.deleted', 'venue', v.id, { name: v.name })
        return { ok: true }
      })
    }),
})

// ---- cohorts ------------------------------------------------------------------------------------------------------------

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), 'Choose a real date.')
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a time, like 09:00.')
const DAY_MS = 864e5
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS)
// one session is a day or a short block (a residential week): never longer than a month; and dates at most 3 years ahead
const MAX_SESSION_DAYS = 31
const MAX_AHEAD_DAYS = 3 * 366
const session = z
  .object({ date: day, end: day, from: time, to: time })
  .refine((s) => s.end >= s.date, { message: 'A session can’t end before it starts.', path: ['end'] })
  .refine((s) => s.end > s.date || s.to > s.from, { message: 'The finish time must be after the start time.', path: ['to'] })
  .refine((s) => daysBetween(s.date, s.end) <= MAX_SESSION_DAYS, { message: `A session can last up to ${MAX_SESSION_DAYS} days. Add longer courses as several sessions.`, path: ['end'] })
// two sessions of one run can't overlap (the same session twice, or one starting before the other ends)
const overlapping = (list: z.infer<typeof session>[]) => {
  const sorted = [...list].sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from))
  return sorted.some((s, i) => i > 0 && `${s.date} ${s.from}` < `${sorted[i - 1].end} ${sorted[i - 1].to}`)
}

const cohortFields = z.object({
  sessions: z
    .array(session)
    .min(1, 'Add at least one session.')
    .max(60, 'Add up to 60 sessions.')
    .refine((list) => !overlapping(list), 'Two sessions overlap. Change the dates or times so each starts after the one before ends.'),
  venueId: z.string().uuid().nullable().optional(),
  joinUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === '' || isMeetingLink(v), MEETING_LINK_ERROR)
    .nullable()
    .optional(),
  capacity: z.number().int().min(1, 'Allow at least 1 place.').max(200, 'Allow up to 200 places.'),
  // "Flat": the date's own price (and an optional higher "was" price); "Tiered": a price plan (planId), whose cheapest package
  // becomes the date's price
  pricePence: z.number().int().min(1, 'Enter a price.').max(10000000, 'Enter a price of £100,000 or less.').optional(),
  wasPricePence: z.number().int().max(10000000, 'Enter a “was” price of £100,000 or less.').nullable().optional(),
  planId: z.string().uuid().nullable().optional(),
  details: z.string().trim().max(500, 'Keep the details to 500 characters or fewer.').nullable().optional(),
  tutorUserId: z.string().uuid().nullable().optional(),
  bookable: z.boolean().optional(),
})

type CohortInput = z.infer<typeof cohortFields>
type Session = z.infer<typeof session>

// Another active run of the same course at the same venue, at the same time, is a duplicate: the venue double-booked and learners
// offered two identical sessions. It is refused. Different courses at one venue at once are allowed (centres run several rooms).
// A session runs from its start day and time to its end day and time, as `overlapping` reads it. Checked inside the transaction,
// after the course row is locked, so two people adding the same dates at the same moment can't both get through.
const UK_DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
async function refuseClash(tx: Tx, courseId: number, venueId: string | null, sessions: Session[], exceptId: string | null = null) {
  if (!venueId) return
  await tx.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId)).for('update')
  const others = await tx
    .select({ sessions: cohorts.sessions })
    .from(cohorts)
    .where(and(eq(cohorts.courseId, courseId), eq(cohorts.venueId, venueId), isNull(cohorts.cancelledAt), gte(cohorts.endsOn, sessions[0].date), exceptId ? ne(cohorts.id, exceptId) : undefined))
  const start = (s: Session) => `${s.date} ${s.from}`
  const end = (s: Session) => `${s.end} ${s.to}`
  for (const other of others)
    for (const o of other.sessions)
      if (sessions.some((s) => start(s) < end(o) && start(o) < end(s))) {
        const [v] = await tx.select({ name: venues.name }).from(venues).where(eq(venues.id, venueId))
        const when = `${UK_DAY.format(new Date(`${o.date}T00:00:00Z`))}${o.end !== o.date ? ` to ${UK_DAY.format(new Date(`${o.end}T00:00:00Z`))}` : ''}, ${o.from} to ${o.to}`
        const message = `You already have dates for this course at ${v?.name ?? 'this venue'} on ${when}. Change the dates or times, or edit those dates instead.`
        throw new TRPCError({ code: 'CONFLICT', message, cause: Object.assign(new Error(message), { field: 'sessions' }) })
      }
}

// a date's tutor is someone on the provider's team who has joined
async function refuseNotOnTeam(db: Parameters<typeof ownCourse>[0], organisationId: string, userId: string) {
  const [m] = await db
    .select({ userId: organisationMembers.userId })
    .from(organisationMembers)
    .where(and(eq(organisationMembers.organisationId, organisationId), eq(organisationMembers.userId, userId), eq(organisationMembers.status, 'active')))
  if (!m) throw bad('Choose a tutor from your team (someone who has joined).', 'tutorUserId')
}

// checks a cohort against its course and provider; returns the values to save
// keepVenueId / keepPlanId: the venue and price plan the dates already have (they stay allowed if since archived)
async function cohortValues(db: Parameters<typeof ownCourse>[0], organisationId: string, method: string | null, input: CohortInput, keepVenueId: string | null = null, keepPlanId: string | null = null) {
  if (method !== 'classroom' && method !== 'live-online') throw bad('Only classroom and live online courses have dates. Self-paced courses start any time.')
  const sessions = [...input.sessions].sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from))
  if (sessions.some((s) => daysBetween(today(), s.end) > MAX_AHEAD_DAYS)) throw bad('Dates can be up to 3 years ahead.', 'sessions')
  // the price: a plan's cheapest package (Tiered), or the date's own (Flat)
  const plan = input.planId ? await usablePlan(db, organisationId, input.planId, keepPlanId) : null
  if (!plan && input.pricePence == null) throw bad('Enter a price.', 'price')
  if (!plan && input.wasPricePence != null && input.wasPricePence <= input.pricePence!) throw bad('The “was” price must be higher than the price.', 'wasPrice')
  let venueId: string | null = null
  if (method === 'classroom') {
    if (!input.venueId) throw bad('Choose the venue.', 'venueId')
    const [v] = await db.select({ id: venues.id, active: venues.active }).from(venues).where(and(eq(venues.id, input.venueId), eq(venues.organisationId, organisationId)))
    if (!v) throw bad('Choose one of your venues.', 'venueId')
    if (!v.active && input.venueId !== keepVenueId) throw bad('This venue is archived. Choose another, or bring it back in Settings › Venues.', 'venueId')
    venueId = v.id
  }
  // a live online date needs its joining link, as a classroom date needs its venue: learners can't take part without it
  if (method === 'live-online' && !input.joinUrl) throw bad('Enter the joining link for these dates.', 'joinUrl')
  if (input.tutorUserId) await refuseNotOnTeam(db, organisationId, input.tutorUserId)
  return {
    method,
    sessions,
    startsOn: sessions[0].date,
    endsOn: sessions.reduce((max, s) => (s.end > max ? s.end : max), sessions[0].end),
    venueId,
    joinUrl: method === 'live-online' ? input.joinUrl || null : null,
    capacity: input.capacity,
    pricePence: plan ? plan.from.pricePence : input.pricePence!,
    wasPricePence: plan ? plan.from.wasPricePence : (input.wasPricePence ?? null),
    planId: plan?.id ?? null,
    details: input.details || null,
    tutorUserId: input.tutorUserId ?? null,
    bookable: input.bookable ?? true,
  }
}

async function ownCohort(db: Parameters<typeof ownCourse>[0], organisationId: string, cohortId: string) {
  const [row] = await db
    .select({ cohort: cohorts, course: { id: courses.id, method: courses.method } })
    .from(cohorts)
    .innerJoin(courses, eq(courses.id, cohorts.courseId))
    .where(and(eq(cohorts.id, cohortId), eq(courses.organisationId, organisationId)))
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'These dates were not found.' })
  return row
}

export const providerCohortsRouter = createTRPCRouter({
  // A course's dates (or every course's, without courseId): upcoming and running ones soonest first, past ones latest first, or all.
  // A tutor gets only the ones they teach.
  list: orgProcedure('provider.workspace.open')
    .input(z.object({ courseId: z.number().int().positive().optional(), when: z.enum(['upcoming', 'past', 'all']).default('upcoming') }))
    .query(async ({ ctx, input }) => {
      const all = can(ctx.actor, 'provider.cohorts.view', { organisationId: input.organisationId })
      const own = !all && can(ctx.actor, 'provider.cohorts.view', { organisationId: input.organisationId, tutorUserId: ctx.user.id })
      if (!all && !own) throw new TRPCError({ code: 'FORBIDDEN' })
      if (input.courseId) await ownCourse(ctx.db, input.organisationId, input.courseId)
      const rows = await ctx.db
        .select({ cohort: cohorts, courseTitle: courses.title, venueName: venues.name, venueCity: venues.city })
        .from(cohorts)
        .innerJoin(courses, eq(courses.id, cohorts.courseId))
        .leftJoin(venues, eq(venues.id, cohorts.venueId))
        .where(
          and(
            eq(courses.organisationId, input.organisationId),
            input.courseId ? eq(cohorts.courseId, input.courseId) : undefined,
            input.when === 'past' ? sql`${cohorts.endsOn} < ${today()}::date` : input.when === 'upcoming' ? sql`${cohorts.endsOn} >= ${today()}::date` : undefined,
            own ? eq(cohorts.tutorUserId, ctx.user.id) : undefined,
          ),
        )
        .orderBy(input.when === 'past' ? sql`${cohorts.startsOn} desc` : asc(cohorts.startsOn))
        .limit(1000)
      return rows.map((r) => ({ ...r.cohort, courseTitle: r.courseTitle, venue: r.venueName ? { name: r.venueName, city: r.venueCity } : null }))
    }),

  // One date with its course, venue and tutor. A tutor can open only the dates they teach.
  get: orgProcedure('provider.workspace.open')
    .input(z.object({ cohortId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { cohort, course } = await ownCohort(ctx.db, input.organisationId, input.cohortId)
      if (!can(ctx.actor, 'provider.cohorts.view', { organisationId: input.organisationId, tutorUserId: cohort.tutorUserId })) throw new TRPCError({ code: 'NOT_FOUND', message: 'These dates were not found.' })
      const [[c], [venue], [tutor]] = await Promise.all([
        ctx.db.select({ title: courses.title, status: courses.status }).from(courses).where(eq(courses.id, course.id)),
        cohort.venueId ? ctx.db.select({ name: venues.name, street: venues.street, city: venues.city, postcode: venues.postcode }).from(venues).where(eq(venues.id, cohort.venueId)) : Promise.resolve([]),
        cohort.tutorUserId ? ctx.db.select({ firstName: profiles.firstName, lastName: profiles.lastName }).from(profiles).where(eq(profiles.id, cohort.tutorUserId)) : Promise.resolve([]),
      ])
      return { ...cohort, courseTitle: c.title, courseStatus: c.status, venue: venue ?? null, tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}`.trim() || 'Team member' : null }
    }),

  // The team members who can be a date's tutor (everyone on the team), A to Z.
  tutors: orgProcedure('provider.cohorts.view').query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select({ userId: organisationMembers.userId, role: organisationMembers.role, firstName: profiles.firstName, lastName: profiles.lastName })
      .from(organisationMembers)
      .innerJoin(profiles, eq(profiles.id, organisationMembers.userId))
      .where(and(eq(organisationMembers.organisationId, input.organisationId), eq(organisationMembers.status, 'active')))
    return rows
      .map((r) => ({ userId: r.userId, role: r.role, name: `${r.firstName} ${r.lastName}`.trim() || 'Team member' }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }),

  // Turn new bookings on or off without changing anything else.
  setBookable: orgProcedure('provider.cohorts.edit')
    .input(z.object({ cohortId: z.string().uuid(), bookable: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { cohort } = await ownCohort(ctx.db, input.organisationId, input.cohortId)
      return ctx.db.transaction(async (tx) => {
        const now = await lockCohort(tx, cohort.id)
        if (!now) throw new TRPCError({ code: 'CONFLICT', message: DATES_GONE })
        if (now.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates are cancelled.' })
        if (now.bookable === input.bookable) throw new TRPCError({ code: 'CONFLICT', message: input.bookable ? 'Bookings are already on for these dates.' : 'Bookings are already off for these dates.' })
        // (dates saved before the joining link was required may have none)
        if (input.bookable && now.method === 'live-online' && !now.joinUrl) throw bad('Add the joining link to these dates before turning bookings on: choose Edit.')
        await tx.update(cohorts).set({ bookable: input.bookable, updatedAt: new Date() }).where(eq(cohorts.id, cohort.id))
        await log(tx, ctx, input.organisationId, input.bookable ? 'cohort.bookings_on' : 'cohort.bookings_off', 'cohort', cohort.id)
        return { ok: true }
      })
    }),

  // Delete dates nobody can have booked yet (bookings arrive in a later milestone; until then any date can be deleted).
  remove: orgProcedure('provider.cohorts.edit')
    .input(z.object({ cohortId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { cohort, course } = await ownCohort(ctx.db, input.organisationId, input.cohortId)
      return ctx.db.transaction(async (tx) => {
        if (!(await lockCohort(tx, cohort.id))) throw new TRPCError({ code: 'CONFLICT', message: DATES_GONE })
        await tx.delete(cohorts).where(eq(cohorts.id, cohort.id))
        await log(tx, ctx, input.organisationId, 'cohort.deleted', 'cohort', cohort.id, { courseId: course.id, startsOn: cohort.startsOn })
        return { ok: true }
      })
    }),

  create: orgProcedure('provider.cohorts.edit')
    .input(cohortFields.extend({ courseId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      const values = await cohortValues(ctx.db, input.organisationId, course.method, input)
      if (values.startsOn < today()) throw bad('New dates can’t start in the past.', 'sessions')
      const made = await ctx.db.transaction(async (tx) => {
        await refuseClash(tx, course.id, values.venueId, values.sessions)
        const [c] = await tx.insert(cohorts).values({ ...values, courseId: course.id, createdBy: ctx.user.id }).returning({ id: cohorts.id })
        await log(tx, ctx, input.organisationId, 'cohort.created', 'cohort', c.id, { courseId: course.id, startsOn: values.startsOn })
        return { id: c.id }
      })
      // a venue whose town couldn't be checked when it was saved is tried again now
      if (values.venueId) await recheckVenues(ctx.db, input.organisationId, values.venueId).catch(() => {})
      return made
    }),

  update: orgProcedure('provider.cohorts.edit')
    .input(cohortFields.extend({ cohortId: z.string().uuid(), seen: z.string().datetime().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { cohort, course } = await ownCohort(ctx.db, input.organisationId, input.cohortId)
      if (cohort.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates are cancelled.' })
      const values = await cohortValues(ctx.db, input.organisationId, course.method, input, cohort.venueId, cohort.planId)
      if (values.startsOn < today() && values.startsOn !== cohort.startsOn) throw bad('Dates can’t be moved into the past.', 'sessions')
      await ctx.db.transaction(async (tx) => {
        const now = await lockCohort(tx, cohort.id)
        if (!now) throw new TRPCError({ code: 'CONFLICT', message: DATES_GONE })
        if (now.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates have just been cancelled, so they can’t be changed. Reload the page.' })
        if (input.seen && now.updatedAt.getTime() > new Date(input.seen).getTime()) throw new TRPCError({ code: 'CONFLICT', message: DATES_CHANGED })
        await refuseClash(tx, course.id, values.venueId, values.sessions, cohort.id)
        await tx.update(cohorts).set({ ...values, updatedAt: new Date() }).where(eq(cohorts.id, cohort.id))
        await log(tx, ctx, input.organisationId, 'cohort.updated', 'cohort', cohort.id, { courseId: course.id })
      })
      if (values.venueId) await recheckVenues(ctx.db, input.organisationId, values.venueId).catch(() => {})
      return { ok: true }
    }),

  // Change only the tutor (the list's tutor menu), so nothing else on the dates is sent again or overwritten.
  setTutor: orgProcedure('provider.cohorts.edit')
    .input(z.object({ cohortId: z.string().uuid(), tutorUserId: z.string().uuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const { cohort, course } = await ownCohort(ctx.db, input.organisationId, input.cohortId)
      if (input.tutorUserId) await refuseNotOnTeam(ctx.db, input.organisationId, input.tutorUserId)
      return ctx.db.transaction(async (tx) => {
        const now = await lockCohort(tx, cohort.id)
        if (!now) throw new TRPCError({ code: 'CONFLICT', message: DATES_GONE })
        if (now.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates are cancelled.' })
        await tx.update(cohorts).set({ tutorUserId: input.tutorUserId, updatedAt: new Date() }).where(eq(cohorts.id, cohort.id))
        await log(tx, ctx, input.organisationId, 'cohort.updated', 'cohort', cohort.id, { courseId: course.id, fields: ['tutor'] })
        return { ok: true }
      })
    }),

  // Cancel dates that haven't finished (learners are told when bookings exist, Milestone 3), with the reason.
  cancel: orgProcedure('provider.cohorts.edit')
    .input(z.object({ cohortId: z.string().uuid(), reason: z.string().trim().min(3, 'Say why the dates are cancelled.').max(300) }))
    .mutation(async ({ ctx, input }) => {
      const { cohort, course } = await ownCohort(ctx.db, input.organisationId, input.cohortId)
      if (cohort.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates are already cancelled.' })
      if (cohort.endsOn < today()) throw new TRPCError({ code: 'CONFLICT', message: 'These dates have already finished.' })
      return ctx.db.transaction(async (tx) => {
        const now = await lockCohort(tx, cohort.id)
        if (!now) throw new TRPCError({ code: 'CONFLICT', message: DATES_GONE })
        if (now.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates are already cancelled.' })
        await tx.update(cohorts).set({ cancelledAt: new Date(), cancelReason: input.reason, bookable: false, updatedAt: new Date() }).where(eq(cohorts.id, cohort.id))
        await log(tx, ctx, input.organisationId, 'cohort.cancelled', 'cohort', cohort.id, { courseId: course.id, reason: input.reason })
        return { ok: true }
      })
    }),
})
