import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { and, asc, cohorts, courses, eq, organisationMembers, profiles, sql, venues } from '@readtraining/db'
import { can } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import { formatPostcode, locatePostcode, POSTCODE } from '../../lib/postcode.mjs'
import { createTRPCRouter, orgProcedure } from '../../trpc/trpc.mjs'
import { ownCourse } from './courses.mjs'

// A provider's venues and course dates (cohorts). Dates are part of the course's prices and timetable, so they change straight
// away, without approval. A tutor sees only the cohorts they teach.

const bad = (message: string) => new TRPCError({ code: 'BAD_REQUEST', message })
// today's date in the UK (dates are UK days; UTC would still be yesterday for an hour after midnight in summer)
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())

const log = (tx: Parameters<typeof logActivity>[0], ctx: { user: { id: string }; ip: string | null }, organisationId: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) =>
  logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'provider', organisationId, action, targetType, targetId, metadata, ip: ctx.ip })

// ---- venues -------------------------------------------------------------------------------------------------------------

const venueFields = z.object({
  name: z.string().trim().min(2, 'Enter the venue name.').max(100, 'Keep the venue name to 100 characters or fewer.'),
  street: z.string().trim().min(3, 'Enter the street address.').max(160, 'Keep the address to 160 characters or fewer.'),
  city: z.string().trim().min(2, 'Enter the town or city.').max(60, 'Keep the town or city to 60 characters or fewer.'),
  postcode: z.string().trim().regex(POSTCODE, 'Enter a full UK postcode, like M1 1AE.'),
})

async function ownVenue(db: Parameters<typeof ownCourse>[0], organisationId: string, venueId: string) {
  const [v] = await db.select().from(venues).where(and(eq(venues.id, venueId), eq(venues.organisationId, organisationId)))
  if (!v) throw new TRPCError({ code: 'NOT_FOUND', message: 'This venue was not found.' })
  return v
}

export const providerVenuesRouter = createTRPCRouter({
  list: orgProcedure('provider.cohorts.view').query(async ({ ctx, input }) => {
    const rows = await ctx.db.execute<{ id: string; name: string; street: string; city: string; postcode: string | null; active: boolean; located: boolean; upcoming: number }>(sql`
      select v.id, v.name, v.street, v.city, v.postcode, v.active, v.lat is not null located,
             (select count(*)::int from public.cohorts k where k.venue_id = v.id and k.cancelled_at is null and k.ends_on >= current_date) upcoming
      from public.venues v where v.organisation_id = ${input.organisationId}::uuid order by v.active desc, v.name`)
    return rows
  }),

  save: orgProcedure('provider.cohorts.edit')
    .input(venueFields.extend({ venueId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const postcode = formatPostcode(input.postcode)
      const before = input.venueId ? await ownVenue(ctx.db, input.organisationId, input.venueId) : null
      // look the postcode up only when it is new or changed
      const where = before && before.postcode === postcode && before.lat !== null ? { lat: before.lat, lng: before.lng } : await locatePostcode(postcode)
      const values = { name: input.name, street: input.street, city: input.city, postcode, lat: where?.lat ?? null, lng: where?.lng ?? null, updatedAt: new Date() }
      return ctx.db.transaction(async (tx) => {
        const [v] = before
          ? await tx.update(venues).set(values).where(eq(venues.id, before.id)).returning({ id: venues.id })
          : await tx.insert(venues).values({ ...values, organisationId: input.organisationId }).returning({ id: venues.id })
        await log(tx, ctx, input.organisationId, before ? 'venue.updated' : 'venue.created', 'venue', v.id, { name: input.name })
        return { id: v.id, located: Boolean(where) }
      })
    }),

  // Hide a venue from new dates (its past and booked dates keep it), or bring it back.
  setActive: orgProcedure('provider.cohorts.edit')
    .input(z.object({ venueId: z.string().uuid(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ownVenue(ctx.db, input.organisationId, input.venueId)
      return ctx.db.transaction(async (tx) => {
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
      const [n] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(cohorts).where(eq(cohorts.venueId, v.id))
      if (n.n) throw new TRPCError({ code: 'CONFLICT', message: 'Dates use this venue, so it can’t be deleted. Archive it instead.' })
      return ctx.db.transaction(async (tx) => {
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
const session = z
  .object({ date: day, end: day, from: time, to: time })
  .refine((s) => s.end >= s.date, { message: 'A session can’t end before it starts.', path: ['end'] })
  .refine((s) => s.end > s.date || s.to > s.from, { message: 'The finish time must be after the start time.', path: ['to'] })

const cohortFields = z.object({
  sessions: z.array(session).min(1, 'Add at least one session.').max(60, 'Add up to 60 sessions.'),
  venueId: z.string().uuid().nullable().optional(),
  joinUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'Use a full https link.')
    .nullable()
    .optional(),
  capacity: z.number().int().min(1, 'Allow at least 1 place.').max(200, 'Allow up to 200 places.'),
  pricePence: z.number().int().min(1, 'Enter a price.').max(10000000),
  wasPricePence: z.number().int().max(10000000).nullable().optional(),
  details: z.string().trim().max(500, 'Keep the details to 500 characters or fewer.').nullable().optional(),
  tutorUserId: z.string().uuid().nullable().optional(),
  bookable: z.boolean().optional(),
})

type CohortInput = z.infer<typeof cohortFields>

// checks a cohort against its course and provider; returns the values to save
// keepVenueId: the venue the dates already have (it stays allowed if it has since been archived)
async function cohortValues(db: Parameters<typeof ownCourse>[0], organisationId: string, method: string | null, input: CohortInput, keepVenueId: string | null = null) {
  if (method !== 'classroom' && method !== 'live-online') throw bad('Only classroom and live online courses have dates. Self-paced courses start any time.')
  const sessions = [...input.sessions].sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from))
  if (input.wasPricePence != null && input.wasPricePence <= input.pricePence) throw bad('The “was” price must be higher than the price.')
  let venueId: string | null = null
  if (method === 'classroom') {
    if (!input.venueId) throw bad('Choose the venue.')
    const [v] = await db.select({ id: venues.id, active: venues.active }).from(venues).where(and(eq(venues.id, input.venueId), eq(venues.organisationId, organisationId)))
    if (!v) throw bad('Choose one of your venues.')
    if (!v.active && input.venueId !== keepVenueId) throw bad('This venue is archived. Choose another, or bring it back in Settings › Venues.')
    venueId = v.id
  }
  if (input.tutorUserId) {
    const [m] = await db
      .select({ userId: organisationMembers.userId })
      .from(organisationMembers)
      .where(and(eq(organisationMembers.organisationId, organisationId), eq(organisationMembers.userId, input.tutorUserId), eq(organisationMembers.status, 'active')))
    if (!m) throw bad('Choose a tutor from your team (someone who has joined).')
  }
  return {
    method,
    sessions,
    startsOn: sessions[0].date,
    endsOn: sessions.reduce((max, s) => (s.end > max ? s.end : max), sessions[0].end),
    venueId,
    joinUrl: method === 'live-online' ? input.joinUrl || null : null,
    capacity: input.capacity,
    pricePence: input.pricePence,
    wasPricePence: input.wasPricePence ?? null,
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
            input.when === 'past' ? sql`${cohorts.endsOn} < current_date` : input.when === 'upcoming' ? sql`${cohorts.endsOn} >= current_date` : undefined,
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
      if (cohort.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates are cancelled.' })
      return ctx.db.transaction(async (tx) => {
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
      if (values.startsOn < today()) throw bad('New dates can’t start in the past.')
      return ctx.db.transaction(async (tx) => {
        const [c] = await tx.insert(cohorts).values({ ...values, courseId: course.id, createdBy: ctx.user.id }).returning({ id: cohorts.id })
        await log(tx, ctx, input.organisationId, 'cohort.created', 'cohort', c.id, { courseId: course.id, startsOn: values.startsOn })
        return { id: c.id }
      })
    }),

  update: orgProcedure('provider.cohorts.edit')
    .input(cohortFields.extend({ cohortId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { cohort, course } = await ownCohort(ctx.db, input.organisationId, input.cohortId)
      if (cohort.cancelledAt) throw new TRPCError({ code: 'CONFLICT', message: 'These dates are cancelled.' })
      const values = await cohortValues(ctx.db, input.organisationId, course.method, input, cohort.venueId)
      if (values.startsOn < today() && values.startsOn !== cohort.startsOn) throw bad('Dates can’t be moved into the past.')
      return ctx.db.transaction(async (tx) => {
        await tx.update(cohorts).set({ ...values, updatedAt: new Date() }).where(eq(cohorts.id, cohort.id))
        await log(tx, ctx, input.organisationId, 'cohort.updated', 'cohort', cohort.id, { courseId: course.id })
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
        await tx.update(cohorts).set({ cancelledAt: new Date(), cancelReason: input.reason, bookable: false, updatedAt: new Date() }).where(eq(cohorts.id, cohort.id))
        await log(tx, ctx, input.organisationId, 'cohort.cancelled', 'cohort', cohort.id, { courseId: course.id, reason: input.reason })
        return { ok: true }
      })
    }),
})
