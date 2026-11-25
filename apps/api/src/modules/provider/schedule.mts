import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { and, asc, cohorts, courses, eq, gte, inArray, isNull, lte, ne, organisationMembers, pricePlans, profiles, sql, venues } from '@readtraining/db'
import { can, canTutor, PROVIDER_ROLES } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import { formatPostcode, lookupDown, placeVenue, POSTCODE } from '../../lib/postcode.mjs'
import { createTRPCRouter, orgProcedure, refuse } from '../../trpc/trpc.mjs'
import { isDated, ownCourse, ukToday as today } from './courses.mjs'
import { cheapest, usablePlan } from './plans.mjs'
import type { Tier } from './plans.mjs'

// a date's prices (adding dates sets them) need the right to change prices: ReadTraining staff without the pricing switch
const PRICES_NEEDED = 'Adding dates or changing a date’s price needs access to prices. You can change the rest of these dates.'

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
  const [c] = await tx.select({ courseId: cohorts.courseId, cancelledAt: cohorts.cancelledAt, bookable: cohorts.bookable, endsOn: cohorts.endsOn, updatedAt: cohorts.updatedAt, method: cohorts.method, joinUrl: cohorts.joinUrl, venueId: cohorts.venueId, sessions: cohorts.sessions }).from(cohorts).where(eq(cohorts.id, cohortId)).for('update')
  return c ?? null
}
// A date's course row, locked before the date itself (always in that order: plan, course, date, tutor), so a change to a date and a step
// that checks the course's dates (sending it for approval, approving it, turning a learning option off) never pass each other
async function lockCourseRow(tx: Tx, courseId: number) {
  const [c] = await tx.select({ methods: courses.methods, closedMethods: courses.closedMethods }).from(courses).where(eq(courses.id, courseId)).for('update')
  return c ?? null
}
const wayOf = (method: string) => (method === 'live-online' ? 'live online' : 'in the classroom')
// a date and its course, locked in that order (a date moved to another course at the same moment: reload)
async function lockDate(tx: Tx, courseId: number, cohortId: string) {
  const course = await lockCourseRow(tx, courseId)
  const date = await lockCohort(tx, cohortId)
  if (!date) throw new TRPCError({ code: 'CONFLICT', message: DATES_GONE })
  if (!course || date.courseId !== courseId) throw new TRPCError({ code: 'CONFLICT', message: 'These dates have just been moved to another course. Reload the page.' })
  return { course, date }
}
// Two people (or two tabs) editing the same dates: the form sends the version it was filled from (`seen`, the dates' updatedAt), and
// a save over a newer one is refused, so neither person's change is silently overwritten.
const DATES_CHANGED =
  'These dates were changed somewhere else (in another tab, or by someone else) since you opened them. Your changes are not saved. Copy anything you want to keep, then close this form and open the dates again.'
const VENUE_GONE = 'This venue has already been deleted. Reload the page.'
const VENUE_CHANGED = 'This venue was changed somewhere else (in another tab, or by someone else) since you opened it. Close this form and open the venue again.'
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
  // `courses`: the linked courses, those with dates (not cancelled) at the venue
  list: orgProcedure('provider.venues.view').query(async ({ ctx, input }) => {
    const problems = await recheckVenues(ctx.db, input.organisationId).catch(() => new Map<string, string>())
    const rows = await ctx.db.execute<{ id: string; name: string; street: string; city: string; postcode: string | null; active: boolean; located: boolean; upcoming: number; version: string; courses: { id: number; title: string }[] }>(sql`
      select v.id, v.name, v.street, v.city, v.postcode, v.active, v.lat is not null located,
             (select count(*)::int from public.cohorts k where k.venue_id = v.id and k.cancelled_at is null and k.ends_on >= ${today()}::date) upcoming, v.updated_at version,
             coalesce((select json_agg(json_build_object('id', c.id, 'title', c.title) order by c.title)
                       from public.courses c where exists (select 1 from public.cohorts k where k.venue_id = v.id and k.course_id = c.id and k.cancelled_at is null)), '[]') courses
      from public.venues v where v.organisation_id = ${input.organisationId}::uuid order by v.active desc, v.name`)
    return rows.map((r) => ({ ...r, version: new Date(r.version).toISOString(), problem: r.located ? null : (problems.get(r.id) ?? null) }))
  }),

  // The venues one course's dates use (the course overview's Venues tab): each venue its dates (not cancelled) have used, with
  // how many of them are upcoming, busiest first. A tutor gets only the venues of the dates they teach (as cohorts.list).
  forCourse: orgProcedure('provider.workspace.open')
    .input(z.object({ courseId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const all = can(ctx.actor, 'provider.cohorts.view', { organisationId: input.organisationId })
      const own = !all && can(ctx.actor, 'provider.cohorts.view', { organisationId: input.organisationId, tutorUserId: ctx.user.id })
      if (!all && !own) throw new TRPCError({ code: 'FORBIDDEN' })
      await ownCourse(ctx.db, input.organisationId, input.courseId)
      const rows = await ctx.db.execute<{ id: string; name: string; street: string; city: string; postcode: string | null; active: boolean; upcoming: number; dates: number }>(sql`
        select v.id, v.name, v.street, v.city, v.postcode, v.active,
               (count(*) filter (where k.ends_on >= ${today()}::date))::int upcoming, count(*)::int dates
        from public.cohorts k join public.venues v on v.id = k.venue_id
        where k.course_id = ${input.courseId} and v.organisation_id = ${input.organisationId}::uuid and k.cancelled_at is null
          ${own ? sql`and k.tutor_user_id = ${ctx.user.id}::uuid` : sql``}
        group by v.id order by upcoming desc, v.name`)
      return [...rows]
    }),

  save: orgProcedure('provider.cohorts.edit')
    .input(venueFields.extend({ venueId: z.string().uuid().optional(), seen: z.string().datetime().optional() }))
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
        // two people (or two tabs) editing one venue: one over a newer save is refused, so neither is silently undone
        if (before) {
          const [now] = await tx.select({ updatedAt: venues.updatedAt }).from(venues).where(eq(venues.id, before.id)).for('update')
          if (!now) throw new TRPCError({ code: 'CONFLICT', message: VENUE_GONE })
          if (input.seen && now.updatedAt.getTime() > new Date(input.seen).getTime()) throw new TRPCError({ code: 'CONFLICT', message: VENUE_CHANGED })
        }
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
        // an archived venue takes no new dates, so dates there still on sale would be sold for a place the provider has stopped
        // using: archiving waits until they are off sale (bookings off, or cancelled). Turning a date's bookings on reads the venue
        // under the same lock.
        if (!input.active) {
          const [onSale] = await tx.execute<{ n: number }>(sql`
            select count(*)::int n from public.cohorts k join public.courses c on c.id = k.course_id
            where k.venue_id = ${input.venueId}::uuid and k.cancelled_at is null and k.bookable and k.starts_on > ${today()}::date and not (k.method = any(c.closed_methods))`)
          if (onSale.n) throw new TRPCError({ code: 'CONFLICT', message: `${onSale.n === 1 ? 'One date at this venue is' : `${onSale.n} dates at this venue are`} taking bookings. Turn their bookings off, or cancel them, before archiving the venue.` })
        }
        await tx.update(venues).set({ active: input.active, updatedAt: new Date() }).where(eq(venues.id, input.venueId))
        await log(tx, ctx, input.organisationId, input.active ? 'venue.restored' : 'venue.archived', 'venue', input.venueId)
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
  pricePence: z.number().int().min(100, 'Enter a price of at least £1.').max(10000000, 'Enter a price of £100,000 or less.').optional(),
  wasPricePence: z.number().int().max(10000000, 'Enter a “was” price of £100,000 or less.').nullable().optional(),
  planId: z.string().uuid().nullable().optional(),
  details: z.string().trim().max(500, 'Keep the details to 500 characters or fewer.').nullable().optional(),
  tutorUserId: z.string().uuid().nullable().optional(),
  bookable: z.boolean().optional(),
  // its colour on the provider's calendar; none = by type
  // a preset name, or a colour picked in the date form as #rrggbb (the database's cohorts_colour check)
  colour: z.union([z.enum(['purple', 'blue', 'green', 'orange', 'red']), z.string().trim().toLowerCase().regex(/^#[0-9a-f]{6}$/, 'Choose a calendar colour.')]).nullable().optional(),
  // the provider has been told another of their courses is at the venue at the same time, and saves anyway (another room)
  sharedVenue: z.boolean().optional(),
})

type CohortInput = z.infer<typeof cohortFields>
type Session = z.infer<typeof session>

// Another active run of the same course at the same venue, at the same time, is a duplicate: the venue double-booked and learners
// offered two identical sessions. It is refused, and so is a second live online run of the course at the same time. Different courses at one venue at once are allowed (centres run several rooms).
// A session runs from its start day and time to its end day and time, as `overlapping` reads it. Checked inside the transaction,
// after the course row is locked, so two people adding the same dates at the same moment can't both get through.
const UK_DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const whenOf = (o: Session) => `${UK_DAY.format(new Date(`${o.date}T00:00:00Z`))}${o.end !== o.date ? ` to ${UK_DAY.format(new Date(`${o.end}T00:00:00Z`))}` : ''}, ${o.from} to ${o.to}`
// the first session of `theirs` that overlaps one of `ours` (a session runs from its start day and time to its end day and time)
const overlapIn = (ours: Session[], theirs: Session[]) => {
  const start = (s: Session) => `${s.date} ${s.from}`
  const end = (s: Session) => `${s.end} ${s.to}`
  return theirs.find((o) => ours.some((s) => start(s) < end(o) && start(o) < end(s))) ?? null
}
const lastDay = (sessions: Session[]) => sessions.reduce((max, s) => (s.end > max ? s.end : max), sessions[0].end)
async function refuseClash(tx: Tx, courseId: number, venueId: string | null, sessions: Session[], exceptId: string | null = null, moving = false) {
  await tx.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId)).for('update')
  const others = await tx
    .select({ sessions: cohorts.sessions })
    .from(cohorts)
    .where(
      and(
        eq(cohorts.courseId, courseId),
        venueId ? eq(cohorts.venueId, venueId) : and(isNull(cohorts.venueId), eq(cohorts.method, 'live-online')),
        isNull(cohorts.cancelledAt),
        gte(cohorts.endsOn, sessions[0].date),
        lte(cohorts.startsOn, lastDay(sessions)),
        exceptId ? ne(cohorts.id, exceptId) : undefined,
      ),
    )
  for (const other of others) {
    const o = overlapIn(sessions, other.sessions)
    if (!o) continue
    const [v] = venueId ? await tx.select({ name: venues.name }).from(venues).where(eq(venues.id, venueId)) : []
    const where = venueId ? `at ${v?.name ?? 'this venue'}` : 'live online'
    const message = moving
      ? `That course already has a cohort ${where} on ${whenOf(o)}.`
      : `You already have dates for this course ${where} on ${whenOf(o)}. Change the dates or times, or edit those dates instead.`
    throw new TRPCError({ code: 'CONFLICT', message, cause: Object.assign(new Error(message), { field: 'sessions' }) })
  }
}

// Another of the provider's courses at the same venue at an overlapping time: allowed (a centre with several rooms), but told first,
// so a one-room venue isn't double-booked by mistake. The date form asks as soon as a venue and dates are chosen (venueClash) and
// shows the answer under the Venue field; saving with it shown sends `sharedVenue`. A save without it (the form's check not back
// yet, or someone else's dates added at that moment) stops with the same words on the form's `sharedVenue`. Venues have no rooms,
// so this is a warning, never a refusal (the same course twice there is refused: refuseClash).
async function sharedVenueNote(db: Pick<Tx, 'select'>, courseId: number, venueId: string, sessions: Session[], exceptId: string | null = null) {
  const others = await db
    .select({ sessions: cohorts.sessions, title: courses.title })
    .from(cohorts)
    .innerJoin(courses, eq(courses.id, cohorts.courseId))
    .where(and(eq(cohorts.venueId, venueId), ne(cohorts.courseId, courseId), isNull(cohorts.cancelledAt), gte(cohorts.endsOn, sessions[0].date), lte(cohorts.startsOn, lastDay(sessions)), exceptId ? ne(cohorts.id, exceptId) : undefined))
  // every other course's session there that overlaps one of these: all of them are named (never only the first), and the most in
  // use at one moment is how many rooms are already taken then
  const start = (x: Session) => `${x.date} ${x.from}`
  const end = (x: Session) => `${x.end} ${x.to}`
  const clashes = others.flatMap((o) => (o.sessions as Session[]).filter((x) => sessions.some((y) => start(y) < end(x) && start(x) < end(y))).map((x) => ({ title: o.title, session: x })))
  if (!clashes.length) return null
  // rooms in use at the busiest moment within these dates' own hours: the most clashes running at one time (each count taken where one
  // of them starts, or one of these sessions starts, so two others that overlap only outside these hours aren't counted together)
  let rooms = 0
  for (const y of sessions)
    for (const c of clashes) {
      if (!(start(y) < end(c.session) && start(c.session) < end(y))) continue
      const t = start(c.session) > start(y) ? start(c.session) : start(y)
      rooms = Math.max(rooms, clashes.filter((d) => start(d.session) <= t && t < end(d.session)).length)
    }
  const [v] = await db.select({ name: venues.name }).from(venues).where(eq(venues.id, venueId))
  const venue = v?.name ?? 'This venue'
  // in plain words, without dates or times: who is using the venue then (each course once), and, when several run at the same
  // moment, how many (that many rooms are taken)
  const titles = [...new Set(clashes.sort((a, b) => start(a.session).localeCompare(start(b.session))).map((c) => c.title))]
  const shown = titles.slice(0, 3)
  const names = titles.length > 3 ? `${shown.join(', ')} and ${titles.length - 3} more` : shown.length > 1 ? `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}` : shown[0]
  const who =
    rooms > 1 && rooms === titles.length
      ? `${venue} already has ${rooms} courses at this time: ${names}.`
      : `${venue} is already in use at this time by ${names}${rooms > 1 ? `, with up to ${rooms} at once` : ''}.`
  return `${who} Only save if it has another room free.`
}
async function askSharedVenue(tx: Tx, courseId: number, venueId: string, sessions: Session[], exceptId: string | null = null) {
  const message = await sharedVenueNote(tx, courseId, venueId, sessions, exceptId)
  if (message) throw new TRPCError({ code: 'CONFLICT', message, cause: Object.assign(new Error(message), { field: 'sharedVenue' }) })
}

// One person can't teach two classes at once: a date's tutor is refused when they already teach another date (of any course, at
// any provider they're on) at an overlapping time. Checked inside the transaction under a lock on the tutor, so two saves at the
// same moment can't both give them the same hour; their place on the team is read again there too (removed at that moment: refused).
async function refuseTutorClash(tx: Tx, organisationId: string, tutorUserId: string, sessions: Session[], exceptId: string | null = null) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`readtraining.tutor:${tutorUserId}`}))`)
  await refuseNotOnTeam(tx, organisationId, tutorUserId, true)
  const others = await tx
    .select({ sessions: cohorts.sessions, title: courses.title, organisationId: courses.organisationId })
    .from(cohorts)
    .innerJoin(courses, eq(courses.id, cohorts.courseId))
    .where(and(eq(cohorts.tutorUserId, tutorUserId), isNull(cohorts.cancelledAt), gte(cohorts.endsOn, sessions[0].date), lte(cohorts.startsOn, lastDay(sessions)), exceptId ? ne(cohorts.id, exceptId) : undefined))
  for (const other of others) {
    const o = overlapIn(sessions, other.sessions)
    if (!o) continue
    const [p] = await tx.select({ firstName: profiles.firstName, lastName: profiles.lastName }).from(profiles).where(eq(profiles.id, tutorUserId))
    const name = `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim() || 'This tutor'
    // another provider's course stays private: only that the time is taken
    const what = other.organisationId === organisationId ? other.title : 'a course for another provider'
    const message = `${name} already teaches ${what} on ${whenOf(o)}. Choose another tutor, or change the dates or times.`
    throw new TRPCError({ code: 'CONFLICT', message, cause: Object.assign(new Error(message), { field: 'tutorUserId' }) })
  }
}

// A venue chosen for dates, read again inside the save under a shared lock (archiving locks it to change it, then counts the dates
// on sale there): of a save and an archive at the same moment, one sees the other, so dates never go on sale at an archived venue
async function refuseArchivedNow(tx: Tx, venueId: string) {
  const [v] = await tx.select({ active: venues.active }).from(venues).where(eq(venues.id, venueId)).for('share')
  if (!v?.active) throw bad('This venue has just been archived. Choose another, or bring it back in Venues.', 'venueId')
}

// the sessions as compared (a stored session's keys may come back in another order)
const sameSessions = (a: Session[], b: Session[]) => a.map((x) => `${x.date}|${x.end}|${x.from}|${x.to}`).join() === b.map((x) => `${x.date}|${x.end}|${x.from}|${x.to}`).join()

// A date on a price plan has the plan's cheapest package as its price: read again inside the transaction (shared, so a plan saved
// at the same moment waits, or is waited for), so a date never keeps a price its plan no longer has, nor takes an archived plan
async function planPriceNow(tx: Tx, planId: string, keepPlanId: string | null) {
  const [p] = await tx.select({ tiers: pricePlans.tiers, archivedAt: pricePlans.archivedAt }).from(pricePlans).where(eq(pricePlans.id, planId)).for('share')
  if (!p) throw bad('This price plan was just deleted. Choose another.', 'planId')
  if (p.archivedAt && planId !== keepPlanId) throw bad('This price plan is archived. Choose another, or restore it in Price plans.', 'planId')
  return cheapest(p.tiers as Tier[])
}

// a date's tutor is someone on the provider's team who has joined, in a role that can see the dates they teach (canTutor: not
// accounts or marketing); `lock` keeps their place as it is until the transaction ends (a removal or role change waits)
const TUTOR_ROLES = PROVIDER_ROLES.filter(canTutor)
async function refuseNotOnTeam(db: Parameters<typeof ownCourse>[0] | Tx, organisationId: string, userId: string, lock = false) {
  const query = db
    .select({ userId: organisationMembers.userId })
    .from(organisationMembers)
    .where(and(eq(organisationMembers.organisationId, organisationId), eq(organisationMembers.userId, userId), eq(organisationMembers.status, 'active'), inArray(organisationMembers.role, TUTOR_ROLES)))
  const [m] = lock ? await query.for('share') : await query
  if (!m) throw bad('Choose a tutor from your team (someone who has joined and can see the dates).', 'tutorUserId')
}

const NOT_OFFERED = 'This course isn’t offered that way. Turn it on in the course’s Learning options first.'
// a learning option whose new bookings were stopped (courses.closed_methods) takes no new dates: they would be dates nobody can book
async function refuseStopped(db: Parameters<typeof ownCourse>[0], closedMethods: string[], method: string) {
  if (!closedMethods.includes(method)) return
  const [m] = await db.execute<{ name: string }>(sql`select name from public.delivery_methods where slug = ${method}`)
  throw bad(`${m?.name ?? method} isn’t taking bookings. Take bookings again first.`, 'method')
}

// checks a cohort against its course and provider; returns the values to save
// `keep`: what the dates already have, which stays allowed though it has changed since: their venue and price plan (archived
// since), their tutor (who may have left: a finished date keeps who taught it) and whether they take bookings
type Keep = { venueId?: string | null; planId?: string | null; tutorUserId?: string | null; bookable?: boolean }
async function cohortValues(db: Parameters<typeof ownCourse>[0], organisationId: string, method: string | null, input: CohortInput, keep: Keep = {}) {
  if (method !== 'classroom' && method !== 'live-online') throw bad('Only classroom and live online dates can be added. The self-paced option starts any time.')
  const sessions = [...input.sessions].sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from))
  if (sessions.some((s) => daysBetween(today(), s.end) > MAX_AHEAD_DAYS)) throw bad('Dates can be up to 3 years ahead.', 'sessions')
  // the price: a plan's cheapest package (Tiered), or the date's own (Flat)
  const plan = input.planId ? await usablePlan(db, organisationId, input.planId, keep.planId ?? null) : null
  if (!plan && input.pricePence == null) throw bad('Enter a price.', 'price')
  if (!plan && input.wasPricePence != null && input.wasPricePence <= input.pricePence!) throw bad('The “was” price must be higher than the price.', 'wasPrice')
  // as a plan's "Save £" can't be more than its price: a was-price over double the price isn't a believable reference price
  if (!plan && input.wasPricePence != null && input.wasPricePence > 2 * input.pricePence!) throw bad('The “was” price can’t be more than double the price.', 'wasPrice')
  let venueId: string | null = null
  if (method === 'classroom') {
    if (!input.venueId) throw bad('Choose the venue.', 'venueId')
    const [v] = await db.select({ id: venues.id, active: venues.active }).from(venues).where(and(eq(venues.id, input.venueId), eq(venues.organisationId, organisationId)))
    if (!v) throw bad('Choose one of your venues.', 'venueId')
    if (!v.active && input.venueId !== keep.venueId) throw bad('This venue is archived. Choose another, or bring it back in Venues.', 'venueId')
    // dates kept at a venue archived since can still run, but don't start taking bookings there
    if (!v.active && (input.bookable ?? true) && !keep.bookable) throw bad('This venue is archived, so these dates can’t take bookings there. Bring the venue back in Venues, or choose another.', 'venueId')
    venueId = v.id
  }
  // a live online date needs its joining link, as a classroom date needs its venue: learners can't take part without it
  if (method === 'live-online' && !input.joinUrl) throw bad('Enter the joining link for these dates.', 'joinUrl')
  if (input.tutorUserId && input.tutorUserId !== keep.tutorUserId) await refuseNotOnTeam(db, organisationId, input.tutorUserId)
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
    colour: input.colour ?? null,
  }
}

async function ownCohort(db: Parameters<typeof ownCourse>[0], organisationId: string, cohortId: string) {
  const [row] = await db
    .select({ cohort: cohorts, course: { id: courses.id, title: courses.title } })
    .from(cohorts)
    .innerJoin(courses, eq(courses.id, cohorts.courseId))
    .where(and(eq(cohorts.id, cohortId), eq(courses.organisationId, organisationId)))
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'These dates were not found.' })
  return row
}

export const providerCohortsRouter = createTRPCRouter({
  // A course's dates (or every course's, without courseId): upcoming and running ones soonest first, past ones latest first, or all
// (`near`: the calendar's, nearest to today first, so a provider with very many dates loses the oldest and furthest, never this month's).
  // A tutor gets only the ones they teach.
  list: orgProcedure('provider.workspace.open')
    .input(z.object({ courseId: z.number().int().positive().optional(), when: z.enum(['upcoming', 'past', 'all']).default('upcoming'), near: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const all = can(ctx.actor, 'provider.cohorts.view', { organisationId: input.organisationId })
      const own = !all && can(ctx.actor, 'provider.cohorts.view', { organisationId: input.organisationId, tutorUserId: ctx.user.id })
      if (!all && !own) throw new TRPCError({ code: 'FORBIDDEN' })
      if (input.courseId) await ownCourse(ctx.db, input.organisationId, input.courseId)
      const rows = await ctx.db
        .select({
          cohort: cohorts, courseTitle: courses.title, courseStatus: courses.status, optionClosed: sql<boolean>`${cohorts.method} = any(${courses.closedMethods})`, venueName: venues.name, venueCity: venues.city,
          tutorFirst: profiles.firstName, tutorLast: profiles.lastName,
          // places taken: the places booked on its course and start day (orders paid or part refunded)
          taken: sql<number>`(select coalesce(sum(o.quantity), 0)::int from public.orders o where o.course_id = ${cohorts.courseId} and o.starts_on = ${cohorts.startsOn} and o.status in ('paid', 'part_refunded'))`,
        })
        .from(cohorts)
        .innerJoin(courses, eq(courses.id, cohorts.courseId))
        .leftJoin(venues, eq(venues.id, cohorts.venueId))
        .leftJoin(profiles, eq(profiles.id, cohorts.tutorUserId))
        .where(
          and(
            eq(courses.organisationId, input.organisationId),
            input.courseId ? eq(cohorts.courseId, input.courseId) : undefined,
            input.when === 'past' ? sql`${cohorts.endsOn} < ${today()}::date` : input.when === 'upcoming' ? sql`${cohorts.endsOn} >= ${today()}::date` : undefined,
            own ? eq(cohorts.tutorUserId, ctx.user.id) : undefined,
          ),
        )
        .orderBy(input.near ? sql`abs(${cohorts.startsOn} - ${today()}::date)` : input.when === 'past' ? sql`${cohorts.startsOn} desc` : asc(cohorts.startsOn))
        .limit(1000)
      // optionClosed: its learning option isn't taking new bookings on the course (courses.closed_methods), so nobody can book it
      return rows.map((r) => ({
        ...r.cohort, courseTitle: r.courseTitle, courseStatus: r.courseStatus, optionClosed: r.optionClosed, venue: r.venueName ? { name: r.venueName, city: r.venueCity } : null,
        tutorName: r.cohort.tutorUserId ? `${r.tutorFirst ?? ''} ${r.tutorLast ?? ''}`.trim() || 'Team member' : null, taken: r.taken,
      }))
    }),

  // One date with its course, venue and tutor. A tutor can open only the dates they teach.
  get: orgProcedure('provider.workspace.open')
    .input(z.object({ cohortId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { cohort, course } = await ownCohort(ctx.db, input.organisationId, input.cohortId)
      if (!can(ctx.actor, 'provider.cohorts.view', { organisationId: input.organisationId, tutorUserId: cohort.tutorUserId })) throw new TRPCError({ code: 'NOT_FOUND', message: 'These dates were not found.' })
      const [[c], [venue], [tutor], [booked]] = await Promise.all([
        ctx.db.select({ title: courses.title, status: courses.status, optionClosed: sql<boolean>`${cohort.method} = any(${courses.closedMethods})` }).from(courses).where(eq(courses.id, course.id)),
        cohort.venueId ? ctx.db.select({ name: venues.name, street: venues.street, city: venues.city, postcode: venues.postcode }).from(venues).where(eq(venues.id, cohort.venueId)) : Promise.resolve([]),
        cohort.tutorUserId ? ctx.db.select({ firstName: profiles.firstName, lastName: profiles.lastName }).from(profiles).where(eq(profiles.id, cohort.tutorUserId)) : Promise.resolve([]),
        // places taken, as the list counts them
        ctx.db.execute<{ taken: number }>(sql`select coalesce(sum(quantity), 0)::int taken from public.orders where course_id = ${cohort.courseId} and starts_on = ${cohort.startsOn}::date and status in ('paid', 'part_refunded')`),
      ])
      return { ...cohort, taken: booked?.taken ?? 0, courseTitle: c.title, courseStatus: c.status, optionClosed: c.optionClosed, venue: venue ?? null, tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}`.trim() || 'Team member' : null }
    }),

  // The team members who can be a date's tutor (everyone who has joined and can see the dates: canTutor), A to Z.
  // The date form's shared-venue note (sharedVenueNote), asked as soon as a venue and dates are chosen: the words to show under the
  // Venue field, or null. Reads only; the save checks again.
  venueClash: orgProcedure('provider.cohorts.edit')
    .input(z.object({ courseId: z.number().int().positive(), venueId: z.string().uuid(), sessions: z.array(session).min(1).max(60), cohortId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      await ownCourse(ctx.db, input.organisationId, input.courseId)
      await ownVenue(ctx.db, input.organisationId, input.venueId)
      const sessions = [...input.sessions].sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from))
      return { note: await sharedVenueNote(ctx.db, input.courseId, input.venueId, sessions, input.cohortId ?? null) }
    }),

  tutors: orgProcedure('provider.cohorts.view').query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select({ userId: organisationMembers.userId, role: organisationMembers.role, firstName: profiles.firstName, lastName: profiles.lastName })
      .from(organisationMembers)
      .innerJoin(profiles, eq(profiles.id, organisationMembers.userId))
      .where(and(eq(organisationMembers.organisationId, input.organisationId), eq(organisationMembers.status, 'active'), inArray(organisationMembers.role, TUTOR_ROLES)))
    return rows
      .map((r) => ({ userId: r.userId, role: r.role, name: `${r.firstName} ${r.lastName}`.trim() || 'Team member' }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }),

  // Turn new bookings on or off without changing anything else.
  setBookable: orgProcedure('provider.cohorts.edit')
    .input(z.object({ cohortId: z.string().uuid(), bookable: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { cohort, course } = await ownCohort(ctx.db, input.organisationId, input.cohortId)
      return ctx.db.transaction(async (tx) => {
        const { course: c, date: now } = await lockDate(tx, course.id, cohort.id)
        if (now.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates are cancelled.' })
        if (now.bookable === input.bookable) throw new TRPCError({ code: 'CONFLICT', message: input.bookable ? 'Bookings are already on for these dates.' : 'Bookings are already off for these dates.' })
        if (input.bookable) {
          if (now.endsOn < today()) throw new TRPCError({ code: 'CONFLICT', message: 'These dates have already finished.' })
          if (!c.methods.includes(now.method)) throw bad(`This course isn’t taught ${wayOf(now.method)} any more. Turn it back on in the course’s Learning options first.`)
          // (dates saved before the joining link was required may have none)
          if (now.method === 'live-online' && !now.joinUrl) throw bad('Add the joining link to these dates before turning bookings on: choose Edit.')
          // a venue archived since: these dates can run there, but not be sold (read under the lock archiving takes)
          const [v] = now.venueId ? await tx.select({ active: venues.active }).from(venues).where(eq(venues.id, now.venueId)).for('share') : []
          if (v && !v.active) throw bad('This venue is archived, so these dates can’t take bookings there. Bring the venue back in Venues first, or choose another venue: choose Edit.')
        }
        await tx.update(cohorts).set({ bookable: input.bookable, updatedAt: new Date() }).where(eq(cohorts.id, cohort.id))
        await log(tx, ctx, input.organisationId, input.bookable ? 'cohort.bookings_on' : 'cohort.bookings_off', 'cohort', cohort.id)
        return { ok: true }
      })
    }),

  // Delete dates added by mistake: only ones nobody has booked (any order on the course and start day, even refunded: it is a record
  // of what they bought) and that haven't finished (a finished date is the record of a course that ran). Others are cancelled instead.
  remove: orgProcedure('provider.cohorts.edit')
    .input(z.object({ cohortId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { cohort, course } = await ownCohort(ctx.db, input.organisationId, input.cohortId)
      return ctx.db.transaction(async (tx) => {
        const { date: now } = await lockDate(tx, course.id, cohort.id)
        if (now.endsOn < today()) throw new TRPCError({ code: 'CONFLICT', message: 'These dates have run, so they are kept as a record and can’t be deleted.' })
        const [booked] = await tx.execute<{ n: number }>(sql`select count(*)::int n from public.orders where course_id = ${course.id} and starts_on = ${cohort.startsOn}::date`)
        if (booked.n) throw new TRPCError({ code: 'CONFLICT', message: `Learners have booked these dates, so they can’t be deleted.${now.cancelledAt ? '' : ' Cancel them instead.'}` })
        await tx.delete(cohorts).where(eq(cohorts.id, cohort.id))
        await log(tx, ctx, input.organisationId, 'cohort.deleted', 'cohort', cohort.id, { courseId: course.id, startsOn: cohort.startsOn })
        return { ok: true }
      })
    }),

  // New dates for one of the course's dated learning options (`method`: classroom or live online; it can be left out when the course
  // offers only one of them).
  create: orgProcedure('provider.cohorts.edit')
    .input(cohortFields.extend({ courseId: z.number().int().positive(), method: z.enum(['classroom', 'live-online']).optional() }))
    .mutation(async ({ ctx, input, path }) => {
      // new dates set their prices: only for someone who may change prices (ReadTraining staff without the pricing switch can't)
      if (!can(ctx.actor, 'provider.pricing.edit', { organisationId: input.organisationId })) await refuse(ctx, 'provider.pricing.edit', input.organisationId, path).catch(() => { throw new TRPCError({ code: 'FORBIDDEN', message: PRICES_NEEDED }) })
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      const dated = course.methods.filter(isDated)
      const method = input.method ?? (dated.length === 1 ? dated[0] : null)
      if (!dated.length) throw bad('Only classroom and live online dates can be added. The self-paced option starts any time.')
      if (!method) throw bad('Choose how these dates are taught.', 'method')
      if (!dated.includes(method)) throw bad(NOT_OFFERED, 'method')
      await refuseStopped(ctx.db, course.closedMethods, method)
      // a way of learning retired from the catalogue takes no new dates (the course couldn't go live, or be resumed, with it)
      const [way] = await ctx.db.execute<{ name: string; active: boolean }>(sql`select name, active from public.delivery_methods where slug = ${method}`)
      if (way && !way.active) throw bad(`${way.name} has been retired from the catalogue, so no new dates can be added for it.`, 'method')
      const values = await cohortValues(ctx.db, input.organisationId, method, input)
      if (values.startsOn < today()) throw bad('New dates can’t start in the past.', 'sessions')
      const made = await ctx.db.transaction(async (tx) => {
        // (the plan first: locks are always taken plan, course, date, tutor, so two saves never wait on each other)
        if (values.planId) Object.assign(values, await planPriceNow(tx, values.planId, null))
        // the course's row is locked and its options read again, so an option turned off at the same moment (which locks the same
        // row, then counts its upcoming dates) either sees these dates or refuses them here
        // (and one whose new bookings were stopped takes no new dates)
        const [now] = await tx.select({ methods: courses.methods, closedMethods: courses.closedMethods }).from(courses).where(eq(courses.id, course.id)).for('update')
        if (!now) throw new TRPCError({ code: 'NOT_FOUND', message: 'This course was not found.' })
        if (!now.methods.includes(method)) throw bad(NOT_OFFERED, 'method')
        await refuseStopped(tx, now.closedMethods, method)
        if (values.venueId) await refuseArchivedNow(tx, values.venueId)
        await refuseClash(tx, course.id, values.venueId, values.sessions)
        if (values.tutorUserId) await refuseTutorClash(tx, input.organisationId, values.tutorUserId, values.sessions)
        if (values.venueId && !input.sharedVenue) await askSharedVenue(tx, course.id, values.venueId, values.sessions)
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
    .mutation(async ({ ctx, input, path }) => {
      const { cohort, course } = await ownCohort(ctx.db, input.organisationId, input.cohortId)
      if (cohort.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates are cancelled.' })
      // dates keep the way they are taught (an option turned off since keeps its finished and cancelled dates as they were)
      const values = await cohortValues(ctx.db, input.organisationId, cohort.method, input, { venueId: cohort.venueId, planId: cohort.planId, tutorUserId: cohort.tutorUserId, bookable: cohort.bookable })
      // a different price, was-price or plan needs the right to change prices (ReadTraining staff without the pricing switch)
      // (a date on a plan keeps the plan's price, which may have moved since: only choosing another plan counts there)
      const repriced = (values.planId ?? null) !== (cohort.planId ?? null) || (!values.planId && (values.pricePence !== cohort.pricePence || (values.wasPricePence ?? null) !== (cohort.wasPricePence ?? null)))
      if (repriced && !can(ctx.actor, 'provider.pricing.edit', { organisationId: input.organisationId })) await refuse(ctx, 'provider.pricing.edit', input.organisationId, path).catch(() => { throw new TRPCError({ code: 'FORBIDDEN', message: PRICES_NEEDED }) })
      await ctx.db.transaction(async (tx) => {
        if (values.planId) Object.assign(values, await planPriceNow(tx, values.planId, cohort.planId))
        const { date: now } = await lockDate(tx, course.id, cohort.id)
        if (now.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates have just been cancelled, so they can’t be changed. Reload the page.' })
        if (input.seen && now.updatedAt.getTime() > new Date(input.seen).getTime()) throw new TRPCError({ code: 'CONFLICT', message: DATES_CHANGED })
        // finished dates are the record of what ran, so they don't change (their tutor can still be set, setTutor)
        if (now.endsOn < today()) throw new TRPCError({ code: 'CONFLICT', message: 'This cohort has already finished, so it can’t be changed.' })
        // a run under way keeps the sessions it has had, or drops one, but no day before today is added to it
        const held = new Set((now.sessions as Session[]).map((s) => s.date))
        if (values.sessions.some((s) => s.date < today() && !held.has(s.date))) throw bad('Dates in the past can’t be added.', 'sessions')
        if (values.venueId && values.venueId !== cohort.venueId) await refuseArchivedNow(tx, values.venueId)
        await refuseClash(tx, course.id, values.venueId, values.sessions, cohort.id)
        // the tutor's other dates: checked when the tutor or the times change, for dates still to run
        const retimed = !sameSessions(values.sessions, now.sessions as Session[])
        if (values.tutorUserId && values.endsOn >= today() && (retimed || values.tutorUserId !== cohort.tutorUserId)) await refuseTutorClash(tx, input.organisationId, values.tutorUserId, values.sessions, cohort.id)
        // asked again only when the venue or the times change (an unrelated edit isn't stopped by a question already answered)
        if (values.venueId && !input.sharedVenue && values.endsOn >= today() && (retimed || values.venueId !== cohort.venueId)) await askSharedVenue(tx, course.id, values.venueId, values.sessions, cohort.id)
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
        const { date: now } = await lockDate(tx, course.id, cohort.id)
        if (now.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates are cancelled.' })
        if (input.tutorUserId && now.endsOn >= today()) await refuseTutorClash(tx, input.organisationId, input.tutorUserId, now.sessions as Session[], cohort.id)
        await tx.update(cohorts).set({ tutorUserId: input.tutorUserId, updatedAt: new Date() }).where(eq(cohorts.id, cohort.id))
        await log(tx, ctx, input.organisationId, 'cohort.updated', 'cohort', cohort.id, { courseId: course.id, fields: ['tutor'] })
        return { ok: true }
      })
    }),

  // Move dates to another of the provider's own courses (dates added under the wrong course): one that offers the same way of
  // learning and is taking bookings for it. Everything else stays (dates, times, venue, link, tutor, places, price, colour).
  // Refused once anyone has booked them (paid or part-refunded orders on the course and start day: what they bought is this
  // course), once cancelled or finished, and when the other course already has dates at that venue at the same time. Both
  // courses' rows are locked (the lower id first, so two moves can't wait on each other; a staff booking locks the same row).
  move: orgProcedure('provider.cohorts.edit')
    .input(z.object({ cohortId: z.string().uuid(), courseId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { cohort, course } = await ownCohort(ctx.db, input.organisationId, input.cohortId)
      if (input.courseId === course.id) throw bad('Choose a different course.', 'courseId')
      const target = await ownCourse(ctx.db, input.organisationId, input.courseId)
      return ctx.db.transaction(async (tx) => {
        for (const id of [course.id, target.id].sort((a, b) => a - b)) await tx.select({ id: courses.id }).from(courses).where(eq(courses.id, id)).for('update')
        if (!(await lockCohort(tx, cohort.id))) throw new TRPCError({ code: 'CONFLICT', message: DATES_GONE })
        const [k] = await tx.select().from(cohorts).where(eq(cohorts.id, cohort.id))
        if (k.courseId !== course.id) throw new TRPCError({ code: 'CONFLICT', message: 'This cohort has just been moved. Reload the page.' })
        if (k.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'This cohort is cancelled.' })
        if (k.endsOn < today()) throw new TRPCError({ code: 'CONFLICT', message: 'This cohort has already finished.' })
        const [t] = await tx.select({ methods: courses.methods, closedMethods: courses.closedMethods }).from(courses).where(eq(courses.id, target.id))
        const way = k.method === 'live-online' ? 'live online' : 'in the classroom'
        if (!t.methods.includes(k.method)) throw bad(`That course isn’t taught ${way}.`, 'courseId')
        if (t.closedMethods.includes(k.method)) throw bad(`That course isn’t taking bookings ${way}.`, 'courseId')
        const [booked] = await tx.execute<{ n: number }>(sql`
          select count(*)::int n from public.orders
          where course_id = ${course.id} and starts_on = ${k.startsOn}::date and status in ('paid', 'part_refunded')`)
        if (booked.n) throw new TRPCError({ code: 'CONFLICT', message: 'Learners have booked this cohort, so it can’t be moved.' })
        await refuseClash(tx, target.id, k.venueId, k.sessions, k.id, true)
        await tx.update(cohorts).set({ courseId: target.id, updatedAt: new Date() }).where(eq(cohorts.id, k.id))
        await log(tx, ctx, input.organisationId, 'cohort.moved', 'cohort', k.id, { courseId: course.id, toCourseId: target.id, from: course.title, to: target.title, startsOn: k.startsOn })
        return { ok: true, courseTitle: target.title }
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
        const { date: now } = await lockDate(tx, course.id, cohort.id)
        if (now.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates are already cancelled.' })
        await tx.update(cohorts).set({ cancelledAt: new Date(), cancelReason: input.reason, bookable: false, updatedAt: new Date() }).where(eq(cohorts.id, cohort.id))
        await log(tx, ctx, input.organisationId, 'cohort.cancelled', 'cohort', cohort.id, { courseId: course.id, reason: input.reason })
        return { ok: true }
      })
    }),
})
