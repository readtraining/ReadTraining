import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { and, asc, cohorts, courses, eq, inArray, isNull, pricePlans, sql } from '@readtraining/db'
import { can } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import { createTRPCRouter, limit, orgProcedure, refuse } from '../../trpc/trpc.mjs'

// A provider's price plans: 2 to 4 packages a learner chooses between, each with its own full price per
// delegate, a "Save £" amount, a tagline, "Most popular" on one, and features that are included (✓, with an optional value for
// that package, such as "2" exam attempts or "12 months" of access) or not (✗). A plan is reused:
// a classroom or live online date chooses one (cohorts.plan_id, the date's "Tiered" pricing), and a self-paced course can
// (courses.plan_id). A plan is the provider's own pricing: what they save is what learners see, at once, with no review by our
// team (the course itself is reviewed, with its packages shown). A date or course on a plan has the plan's cheapest package as its
// own price, kept in step by `syncPlanPrices` whenever the plan is saved. A plan in use is archived, never deleted.

type Tx = Parameters<Parameters<(typeof import('../../lib/db.mjs'))['db']['transaction']>[0]>[0]
type Writer = (typeof import('../../lib/db.mjs'))['db'] | Tx

const bad = (message: string, field?: string) => new TRPCError({ code: 'BAD_REQUEST', message, cause: field ? Object.assign(new Error(message), { field }) : undefined })
const line = (max: number, what: string) => z.string().trim().max(max, `Keep the ${what} to ${max} characters or fewer.`)
const MAX_PENCE = 10000000
// today in the UK (as provider/courses.mts ukToday; not imported, so the two modules don't import each other)
const ukToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())

const feature = z.object({
  title: line(80, 'feature').min(1, 'Write every feature, or remove it.'),
  description: line(200, 'feature description').optional().nullable(),
  included: z.boolean(),
  // what this package gives of it ("2", "12 months", "Unlimited"); only on an included feature
  value: line(30, 'feature value').optional().nullable(),
}).transform((f) => ({ ...f, value: (f.included && f.value) || null }))
// a price is at least £1, as everywhere else (a date's own price, a self-paced course's)
const tier = z
  .object({
    name: line(30, 'package name').min(1, 'Name every package.'),
    pricePence: z.number().int().min(100, 'Enter a price of at least £1 for every package.').max(MAX_PENCE, 'Enter a price of £100,000 or less.'),
    savePence: z.number().int().min(0).max(MAX_PENCE).optional().nullable(), // "Save £": shown as a was-price of price + save
    tagline: line(80, 'tagline').optional().nullable(),
    popular: z.boolean().optional(),
    // the package includes Emergency First Aid at Work: a course whose SIA licence needs first aid then doesn't ask about it
    firstAid: z.boolean().optional(),
    features: z.array(feature).max(12, 'Add up to 12 features to a package.'),
  })
  // a saving bigger than the price itself would claim a was-price over double what learners pay: not a believable reference price
  .refine((t) => !t.savePence || t.savePence <= t.pricePence, { message: 'A package can’t save more than its own price.', path: ['savePence'] })
export const tiersInput = z
  .array(tier)
  .min(2, 'A plan has at least 2 packages.')
  .max(4, 'A plan has up to 4 packages.')
  .superRefine((list, ctx) => {
    const names = list.map((t) => t.name.trim().toLowerCase())
    if (new Set(names).size !== names.length) ctx.addIssue({ code: 'custom', message: 'Give every package a different name.' })
    if (list.filter((t) => t.popular).length > 1) ctx.addIssue({ code: 'custom', message: 'Mark only one package as Most popular.' })
  })
export type Tier = z.infer<typeof tier>

// the packages as learners see them (stored values are checked when saved; this keeps only what the page needs)
export const publicTiers = (tiers: unknown) =>
  Array.isArray(tiers) && tiers.length >= 2
    ? (tiers as Tier[]).map((t) => ({
        name: t.name,
        pricePence: t.pricePence,
        wasPence: t.savePence ? t.pricePence + t.savePence : null,
        tagline: t.tagline || null,
        popular: Boolean(t.popular),
        firstAid: Boolean(t.firstAid),
        features: (t.features ?? []).map((f) => ({ title: f.title, description: f.description || null, included: f.included, value: (f.included && f.value) || null })),
      }))
    : null

// the "From" price a date or course on the plan shows: its cheapest package, with that package's was-price
export const cheapest = (tiers: Tier[]) => {
  const t = [...tiers].sort((a, b) => a.pricePence - b.pricePence)[0]
  return { pricePence: t.pricePence, wasPricePence: t.savePence ? t.pricePence + t.savePence : null }
}

/** Keeps every date and self-paced course on a plan priced at its cheapest package. */
export async function syncPlanPrices(tx: Writer, planId: string) {
  const [p] = await tx.select({ tiers: pricePlans.tiers }).from(pricePlans).where(eq(pricePlans.id, planId))
  const tiers = p?.tiers as Tier[] | undefined
  if (!tiers?.length) return
  const from = cheapest(tiers)
  // only dates still to come: a finished or cancelled date keeps the price it ran at
  await tx.update(cohorts).set({ ...from, updatedAt: new Date() }).where(and(eq(cohorts.planId, planId), isNull(cohorts.cancelledAt), sql`${cohorts.endsOn} >= ${ukToday()}::date`))
  // a course's own version (its editor's "changed somewhere else" check) is about its words, so only its price moves
  await tx.update(courses).set({ pricePence: from.pricePence }).where(eq(courses.planId, planId))
}

// the packages as saved: the database keeps an object's keys in its own order, so they are compared key by key, sorted
const sameTiers = (a: unknown, b: unknown) => {
  const plain = (v: unknown): unknown => (Array.isArray(v) ? v.map(plain) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([, x]) => x != null && x !== '').sort(([x], [y]) => x.localeCompare(y)).map(([k, x]) => [k, plain(x)])) : v)
  return JSON.stringify(plain(a)) === JSON.stringify(plain(b))
}

// the same packages, in the same order, with only their wording changed: features, tagline and "Most popular"
const onlyWording = (next: Tier[], before: Tier[]) => next.length === before.length && sameTiers(next.map(({ features, tagline, popular, ...rest }) => rest), before.map(({ features, tagline, popular, ...rest }) => rest))

/** A plan of this provider's, for a date or course to use: refused when it is someone else's, or archived (unless kept). */
export async function usablePlan(db: Writer, organisationId: string, planId: string, keepId: string | null = null) {
  const [p] = await db.select().from(pricePlans).where(and(eq(pricePlans.id, planId), eq(pricePlans.organisationId, organisationId)))
  if (!p) throw bad('Choose one of your price plans.', 'planId')
  if (p.archivedAt && p.id !== keepId) throw bad('This price plan is archived. Choose another, or restore it in Price plans.', 'planId')
  return { ...p, from: cheapest(p.tiers as Tier[]) }
}

const log = (tx: Writer, ctx: { user: { id: string }; ip: string | null }, organisationId: string, action: string, planId: string, metadata: Record<string, unknown> = {}) =>
  logActivity(tx as Parameters<typeof logActivity>[0], { actorUserId: ctx.user.id, actorIdentity: 'provider', organisationId, action, targetType: 'price_plan', targetId: planId, metadata, ip: ctx.ip })

const PLAN_GONE = 'This price plan was not found. It may have been deleted: reload the page.'
const PLAN_CHANGED = 'This price plan was changed somewhere else since you opened it. Reload it to see the latest version, then make your change again.'

async function lockPlan(tx: Tx, organisationId: string, planId: string) {
  const [p] = await tx.select().from(pricePlans).where(and(eq(pricePlans.id, planId), eq(pricePlans.organisationId, organisationId))).for('update')
  if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: PLAN_GONE })
  return p
}

// how many upcoming dates and courses use each plan (a plan in use is archived, not deleted; editing it moves their prices), and
// how many dates have ever used it (`ever`: a past date keeps its plan, so a plan any date has used can't be deleted either)
async function usage(db: Writer, planIds: string[]) {
  if (!planIds.length) return new Map<string, { dates: number; courses: number; ever: number }>()
  const [dates, selfPaced, all] = await Promise.all([
    db
      .select({ planId: cohorts.planId, n: sql<number>`count(*)::int` })
      .from(cohorts)
      .where(and(inArray(cohorts.planId, planIds), isNull(cohorts.cancelledAt), sql`${cohorts.endsOn} >= ${ukToday()}::date`))
      .groupBy(cohorts.planId),
    db.select({ planId: courses.planId, n: sql<number>`count(*)::int` }).from(courses).where(inArray(courses.planId, planIds)).groupBy(courses.planId),
    db.select({ planId: cohorts.planId, n: sql<number>`count(*)::int` }).from(cohorts).where(inArray(cohorts.planId, planIds)).groupBy(cohorts.planId),
  ])
  const out = new Map(planIds.map((id) => [id, { dates: 0, courses: 0, ever: 0 }]))
  for (const d of dates) if (d.planId) out.get(d.planId)!.dates = d.n
  for (const c of selfPaced) if (c.planId) out.get(c.planId)!.courses = c.n
  for (const d of all) if (d.planId) out.get(d.planId)!.ever = d.n
  return out
}

const view = (p: typeof pricePlans.$inferSelect, used: { dates: number; courses: number; ever: number } | undefined) => ({
  id: p.id,
  name: p.name,
  tiers: p.tiers as Tier[],
  archived: Boolean(p.archivedAt),
  used: used ?? { dates: 0, courses: 0, ever: 0 },
  version: p.updatedAt.toISOString(),
})

export const providerPlansRouter = createTRPCRouter({
  // The provider's plans, newest first, each with its packages and how many dates and courses use it.
  list: orgProcedure('provider.pricing.view').query(async ({ ctx, input }) => {
    const rows = await ctx.db.select().from(pricePlans).where(eq(pricePlans.organisationId, input.organisationId)).orderBy(asc(pricePlans.archivedAt), sql`${pricePlans.createdAt} desc`)
    const used = await usage(ctx.db, rows.map((r) => r.id))
    return rows.map((r) => view(r, used.get(r.id)))
  }),

  get: orgProcedure('provider.pricing.view')
    .input(z.object({ planId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [p] = await ctx.db.select().from(pricePlans).where(and(eq(pricePlans.id, input.planId), eq(pricePlans.organisationId, input.organisationId)))
      if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: PLAN_GONE })
      return view(p, (await usage(ctx.db, [p.id])).get(p.id))
    }),

  // The plans one course is sold on (the course overview's Packages tab): its upcoming dates' plans (Tiered) and a self-paced
  // course's own, each with how many of the course's upcoming dates use it (`course`: the self-paced course's plan); and how many
  // upcoming dates have their own price (Flat). The course must be this provider's (NOT_FOUND otherwise, as provider/courses.mts
  // ownCourse; not imported, so the two modules don't import each other).
  forCourse: orgProcedure('provider.pricing.view')
    .input(z.object({ courseId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ planId: courses.planId })
        .from(courses)
        .where(and(eq(courses.id, input.courseId), eq(courses.organisationId, input.organisationId), eq(courses.kind, 'provider')))
      if (!course) throw new TRPCError({ code: 'NOT_FOUND', message: 'This course was not found.' })
      const dates = await ctx.db
        .select({ planId: cohorts.planId, n: sql<number>`count(*)::int` })
        .from(cohorts)
        .where(and(eq(cohorts.courseId, input.courseId), isNull(cohorts.cancelledAt), sql`${cohorts.endsOn} >= ${ukToday()}::date`))
        .groupBy(cohorts.planId)
      const onPlan = new Map(dates.filter((d) => d.planId).map((d) => [d.planId!, d.n]))
      const ids = [...new Set([...onPlan.keys(), ...(course.planId ? [course.planId] : [])])]
      const rows = ids.length ? await ctx.db.select().from(pricePlans).where(and(inArray(pricePlans.id, ids), eq(pricePlans.organisationId, input.organisationId))).orderBy(asc(pricePlans.name)) : []
      const used = await usage(ctx.db, rows.map((r) => r.id))
      return {
        plans: rows.map((r) => ({ ...view(r, used.get(r.id)), forCourse: { dates: onPlan.get(r.id) ?? 0, course: r.id === course.planId } })),
        ownPriceDates: dates.find((d) => !d.planId)?.n ?? 0,
      }
    }),

  // Create a plan, or change one: learners see it at once, and every date and course on it takes its cheapest package as their
  // price. `seen`: the version the form was opened on (a save over a newer one is refused). Without the right to change prices
  // (ReadTraining staff), only an existing plan's features, taglines and "Most popular" package change (`onlyWording`).
  save: orgProcedure('provider.pricing.features')
    .input(z.object({ planId: z.string().uuid().optional(), name: line(60, 'plan name').min(1, 'Name the plan.'), tiers: tiersInput, seen: z.string().datetime().optional() }))
    .mutation(async ({ ctx, input, path }) => {
      const prices = can(ctx.actor, 'provider.pricing.edit', { organisationId: input.organisationId })
      if (!input.planId && !prices) await refuse(ctx, 'provider.pricing.edit', input.organisationId, path)
      if (!input.planId) await limit(ctx, 'plans')
      return ctx.db.transaction(async (tx) => {
        if (!input.planId) {
          const [made] = await tx.insert(pricePlans).values({ organisationId: input.organisationId, name: input.name, tiers: input.tiers, createdBy: ctx.user.id }).returning()
          await log(tx, ctx, input.organisationId, 'plan.created', made.id, { name: input.name, packages: input.tiers.length })
          return { id: made.id, version: made.updatedAt.toISOString() }
        }
        const p = await lockPlan(tx, input.organisationId, input.planId)
        if (input.seen && p.updatedAt.getTime() > new Date(input.seen).getTime()) throw new TRPCError({ code: 'CONFLICT', message: PLAN_CHANGED })
        if (!prices && (input.name !== p.name || !onlyWording(input.tiers, p.tiers as Tier[]))) await refuse(ctx, 'provider.pricing.edit', input.organisationId, path)
        const changed = !sameTiers(input.tiers, p.tiers)
        const [saved] = await tx.update(pricePlans).set({ name: input.name, tiers: input.tiers, updatedAt: new Date() }).where(eq(pricePlans.id, p.id)).returning()
        if (changed) await syncPlanPrices(tx, p.id)
        await log(tx, ctx, input.organisationId, 'plan.updated', p.id, { name: input.name, ...(changed ? { packagesChanged: true } : {}) })
        return { id: p.id, version: saved.updatedAt.toISOString() }
      })
    }),

  // Archive a plan (it can't be chosen for new dates; dates already on it keep it) or bring it back.
  setArchived: orgProcedure('provider.pricing.edit')
    .input(z.object({ planId: z.string().uuid(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        const p = await lockPlan(tx, input.organisationId, input.planId)
        if (Boolean(p.archivedAt) === input.archived) throw new TRPCError({ code: 'CONFLICT', message: input.archived ? 'This plan is already archived.' : 'This plan can already be chosen.' })
        await tx.update(pricePlans).set({ archivedAt: input.archived ? new Date() : null, updatedAt: new Date() }).where(eq(pricePlans.id, p.id))
        await log(tx, ctx, input.organisationId, input.archived ? 'plan.archived' : 'plan.restored', p.id)
        return { ok: true }
      }),
    ),

  // Delete a plan nothing has ever used (no date, past or future, and no course). One in use is archived instead.
  remove: orgProcedure('provider.pricing.edit')
    .input(z.object({ planId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        const p = await lockPlan(tx, input.organisationId, input.planId)
        const [[d], [c]] = await Promise.all([
          tx.select({ n: sql<number>`count(*)::int` }).from(cohorts).where(eq(cohorts.planId, p.id)),
          tx.select({ n: sql<number>`count(*)::int` }).from(courses).where(eq(courses.planId, p.id)),
        ])
        if (d.n || c.n) throw new TRPCError({ code: 'CONFLICT', message: `This plan is used by ${[d.n ? `${d.n} ${d.n === 1 ? 'date' : 'dates'}` : '', c.n ? `${c.n} ${c.n === 1 ? 'course' : 'courses'}` : ''].filter(Boolean).join(' and ')}, so it can’t be deleted. Archive it instead.` })
        await tx.delete(pricePlans).where(eq(pricePlans.id, p.id))
        await log(tx, ctx, input.organisationId, 'plan.deleted', p.id, { name: p.name })
        return { ok: true }
      }),
    ),
})
