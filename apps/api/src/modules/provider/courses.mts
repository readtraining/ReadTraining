import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
  and,
  asc,
  categories,
  cohorts,
  courseExams,
  courseFaqs,
  courseImages,
  courseLevels,
  courseRevisions,
  courses,
  courseUnits,
  deliveryMethods,
  eq,
  inArray,
  like,
  or,
  sql,
  subcategories,
  topics,
} from '@readtraining/db'
import { can } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { IMAGE_TYPES, MEDIA_PATH, mediaExists, mediaUploadUrl, mediaUrl, removeMedia } from '../../lib/media.mjs'
import { freeSlug, slugify } from '../../lib/slug.mjs'
import { createTRPCRouter, orgProcedure, refuse } from '../../trpc/trpc.mjs'

// A provider's courses (Milestone 2): create one (under a shared course page or on its own), write its page, add images, send it
// for approval, pause it, delete a draft. Every change is checked against the provider's permission table and logged.
//
// A live (or paused) course keeps showing while a content edit waits for an admin: the reviewed fields below go into one pending
// course_revisions row instead of onto the course. Prices, settings and search wording change straight away. A course that isn't
// live yet is edited directly.

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0]
type Writer = typeof Db | Tx

const id = z.number().int().positive()
const line = (max: number, what: string) => z.string().trim().max(max, `Keep the ${what} to ${max} characters or fewer.`)
const text = (max: number, what: string) => line(max, what).optional().nullable()
const slugRef = z.string().trim().max(80).regex(/^[a-z0-9-]*$/)

// the content an admin checks before it shows on a live course
export const REVIEWED = ['title', 'summary', 'description', 'audience', 'entryRequirements', 'outcomes', 'features', 'category', 'subcategory', 'topic', 'level', 'videoUrl', 'units', 'exams', 'faqs'] as const

export const content = {
  title: line(80, 'title').min(3, 'Enter a title of at least 3 characters.'),
  summary: text(300, 'short description'),
  description: text(10000, 'description'),
  audience: text(2000, 'who it’s for'),
  entryRequirements: text(2000, 'entry requirements'),
  outcomes: z.array(line(160, 'learning outcome').min(1)).max(20, 'Add up to 20 learning outcomes.'),
  features: z.array(line(70, 'feature').min(1)).max(12, 'Add up to 12 features.'),
  category: slugRef,
  subcategory: slugRef,
  topic: slugRef.optional().nullable(),
  level: slugRef,
  videoUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === '' || /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)\/\S+$/.test(v), 'Use a YouTube or Vimeo link (https).')
    .optional()
    .nullable(),
  units: z.array(z.object({ title: line(120, 'unit title').min(1, 'Give every unit a title.'), body: text(2000, 'unit text') })).max(40, 'Add up to 40 units.'),
  exams: z.array(z.object({ unit: line(120, 'exam unit').min(1, 'Name every exam row.'), passMark: text(40, 'pass mark'), duration: text(40, 'duration') })).max(20, 'Add up to 20 exam rows.'),
  faqs: z.array(z.object({ question: line(160, 'question').min(1, 'Write every question.'), answer: line(1200, 'answer').min(1, 'Write every answer.') })).max(30, 'Add up to 30 FAQs.'),
}
export const settings = {
  seoTitle: text(60, 'search title'),
  seoDescription: text(320, 'search description'),
  seoKeywords: z.array(line(40, 'keyword').min(1)).max(20, 'Add up to 20 keywords.'),
  pricePence: z.number().int().min(0).max(10000000).nullable(),
  skillSaver: z.boolean(),
  isPublic: z.boolean(),
  listed: z.boolean(),
  model: z.enum(['bookings', 'enquiries']),
  method: slugRef,
  parentId: z.number().int().positive().nullable(), // the shared course page it is listed under, or none
}
const PAGE_ONLY = new Set(['title', 'summary', 'description', 'audience', 'entryRequirements', 'outcomes', 'features', 'videoUrl', 'seoTitle', 'seoDescription', 'seoKeywords'])
const PRICING = new Set(['pricePence', 'skillSaver'])

export const bad = (message: string, field?: string) => new TRPCError({ code: 'BAD_REQUEST', message, cause: field ? Object.assign(new Error(message), { field }) : undefined })
export const notFound = () => new TRPCError({ code: 'NOT_FOUND', message: 'This course was not found.' })

/** The course, when it is this provider's own; NOT_FOUND otherwise (another provider's id is never revealed). */
export async function ownCourse(db: Writer, organisationId: string, courseId: number) {
  const [c] = await db.select().from(courses).where(and(eq(courses.id, courseId), eq(courses.organisationId, organisationId), eq(courses.kind, 'provider')))
  if (!c) throw notFound()
  return c
}

/** Category, sub-category and topic slugs to ids, checked to belong together and to be in use; level and method checked too. */
export async function resolveCatalogue(db: Writer, input: { category?: string; subcategory?: string; topic?: string | null; level?: string; method?: string }) {
  const out: { categoryId?: string; subcategoryId?: string; topicId?: string | null; level?: string; method?: string } = {}
  if (input.category !== undefined) {
    const [cat] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.slug, input.category), eq(categories.active, true)))
    if (!cat) throw bad('Choose a category from the list.', 'category')
    out.categoryId = cat.id
    if (input.subcategory !== undefined) {
      const [sub] = await db.select({ id: subcategories.id }).from(subcategories).where(and(eq(subcategories.slug, input.subcategory), eq(subcategories.categoryId, cat.id), eq(subcategories.active, true)))
      if (!sub) throw bad('Choose a sub-category from the list.', 'subcategory')
      out.subcategoryId = sub.id
      if (input.topic) {
        const [top] = await db.select({ id: topics.id }).from(topics).where(and(eq(topics.slug, input.topic), eq(topics.subcategoryId, sub.id), eq(topics.active, true)))
        if (!top) throw bad('Choose a topic from the list, or leave it empty.', 'topic')
        out.topicId = top.id
      } else if (input.topic !== undefined) out.topicId = null
    }
  }
  if (input.level !== undefined) {
    const [lv] = await db.select({ slug: courseLevels.slug }).from(courseLevels).where(and(eq(courseLevels.slug, input.level), eq(courseLevels.active, true)))
    if (!lv) throw bad('Choose a level from the list.', 'level')
    out.level = lv.slug
  }
  if (input.method !== undefined) {
    const [m] = await db.select({ slug: deliveryMethods.slug }).from(deliveryMethods).where(and(eq(deliveryMethods.slug, input.method), eq(deliveryMethods.active, true)))
    if (!m) throw bad('Choose how the course is taught.', 'method')
    out.method = m.slug
  }
  return out
}

// A provider's course on a shared course page is the same course as the page, so their subjects must match: the same sub-category,
// and the same topic when both have one. (A web development course can't be listed on the first aid page.)
type Subject = { subcategoryId: string | null; topicId: string | null }
export const sameSubject = (page: Subject, course: Subject) =>
  page.subcategoryId !== null && page.subcategoryId === course.subcategoryId && (!page.topicId || !course.topicId || page.topicId === course.topicId)
const OTHER_SUBJECT = (title: string) => `“${title}” is a page for a different course. A course can only go on a shared course page with the same subject, so choose a page that matches, or none.`

// A live shared course page a provider may list a course on, with its subject.
async function livePage(db: Writer, id: number) {
  const [p] = await db
    .select({ id: courses.id, title: courses.title, subcategoryId: courses.subcategoryId, topicId: courses.topicId })
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.kind, 'shared'), eq(courses.status, 'live')))
  if (!p) throw bad('Choose a course page from the list.', 'parentId')
  return p
}

/** A free web address for a course title. Never only digits: /course/1000 means course number 1000. */
export async function courseSlug(db: Writer, title: string) {
  const words = slugify(title, 'course')
  const base = /^\d+$/.test(words) ? `course-${words}` : words
  const taken = await db.select({ slug: courses.slug }).from(courses).where(or(eq(courses.slug, base), like(courses.slug, `${base}-%`)))
  return freeSlug(base, taken.map((t) => t.slug))
}

/** Replaces a course's units, exams and FAQs with the lists given (each only when given). */
async function writeLists(tx: Tx, courseId: number, lists: { units?: { title: string; body?: string | null }[]; exams?: { unit: string; passMark?: string | null; duration?: string | null }[]; faqs?: { question: string; answer: string }[] }) {
  if (lists.units) {
    await tx.delete(courseUnits).where(eq(courseUnits.courseId, courseId))
    if (lists.units.length) await tx.insert(courseUnits).values(lists.units.map((u, i) => ({ courseId, position: i, title: u.title, body: u.body || null })))
  }
  if (lists.exams) {
    await tx.delete(courseExams).where(eq(courseExams.courseId, courseId))
    if (lists.exams.length) await tx.insert(courseExams).values(lists.exams.map((e, i) => ({ courseId, position: i, unit: e.unit, passMark: e.passMark || null, duration: e.duration || null })))
  }
  if (lists.faqs) {
    await tx.delete(courseFaqs).where(eq(courseFaqs.courseId, courseId))
    if (lists.faqs.length) await tx.insert(courseFaqs).values(lists.faqs.map((f, i) => ({ courseId, position: i, question: f.question, answer: f.answer })))
  }
}

/**
 * Applies reviewed content to a course (on edit when it isn't live, or when an admin approves a revision): the plain fields, the
 * catalogue slugs and the three lists. Shared with the admin approvals.
 */
export async function applyContent(tx: Tx, courseId: number, c: Partial<Record<(typeof REVIEWED)[number], unknown>>) {
  const resolved = await resolveCatalogue(tx, { category: c.category as string | undefined, subcategory: c.subcategory as string | undefined, topic: c.topic as string | null | undefined, level: c.level as string | undefined })
  const set: Partial<typeof courses.$inferInsert> = { ...resolved, updatedAt: new Date() }
  if (c.title !== undefined) set.title = c.title as string
  for (const k of ['summary', 'description', 'audience', 'entryRequirements', 'videoUrl'] as const) if (c[k] !== undefined) set[k] = (c[k] as string | null) || null
  if (c.outcomes !== undefined) set.outcomes = c.outcomes as string[]
  if (c.features !== undefined) set.features = c.features as string[]
  await tx.update(courses).set(set).where(eq(courses.id, courseId))
  await writeLists(tx, courseId, c as Parameters<typeof writeLists>[2])
}

// what's missing before a course can be sent for approval, or a shared page published (the editors show the same list)
export async function missing(db: Writer, course: typeof courses.$inferSelect) {
  const [[img], [units]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(courseImages).where(eq(courseImages.courseId, course.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(courseUnits).where(eq(courseUnits.courseId, course.id)),
  ])
  const gaps: string[] = []
  if (!course.summary) gaps.push('a short description')
  if (!course.description) gaps.push('a description')
  if (!course.categoryId || !course.subcategoryId) gaps.push('a category and sub-category')
  if (!course.level) gaps.push('a level')
  if (course.kind === 'provider' && !course.method) gaps.push('how it is taught')
  if (course.outcomes.length < 4) gaps.push('at least 4 things learners will learn')
  if (!units.n) gaps.push('the syllabus (at least one unit)')
  if (!img.n) gaps.push('at least one image')
  if (course.method === 'self-paced' && course.pricePence === null) gaps.push('a price')
  return gaps
}

// a course as the editors show it: the course, its lists and images, its shared page, any change waiting for approval, and the
// last decided change (so the provider sees why one was turned down)
export async function courseDetail(db: Writer, course: typeof courses.$inferSelect) {
  const [units, exams, faqs, images, [revision], [parent], cat, [dates], [last]] = await Promise.all([
    db.select().from(courseUnits).where(eq(courseUnits.courseId, course.id)).orderBy(asc(courseUnits.position)),
    db.select().from(courseExams).where(eq(courseExams.courseId, course.id)).orderBy(asc(courseExams.position)),
    db.select().from(courseFaqs).where(eq(courseFaqs.courseId, course.id)).orderBy(asc(courseFaqs.position)),
    db.select().from(courseImages).where(eq(courseImages.courseId, course.id)).orderBy(asc(courseImages.position)),
    db.select().from(courseRevisions).where(and(eq(courseRevisions.courseId, course.id), eq(courseRevisions.status, 'pending'))),
    course.parentId ? db.select({ id: courses.id, title: courses.title, slug: courses.slug, subcategoryId: courses.subcategoryId, topicId: courses.topicId }).from(courses).where(eq(courses.id, course.parentId)) : Promise.resolve([]),
    db.execute<{ category: string | null; subcategory: string | null; topic: string | null }>(sql`
      select (select slug from public.categories where id = ${course.categoryId}) category,
             (select slug from public.subcategories where id = ${course.subcategoryId}) subcategory,
             (select slug from public.topics where id = ${course.topicId}) topic`),
    db.execute<{ upcoming: number; total: number }>(sql`select count(*) filter (where cancelled_at is null and ends_on >= current_date)::int upcoming, count(*)::int total from public.cohorts where course_id = ${course.id}`),
    db
      .select({ status: courseRevisions.status, note: courseRevisions.note, decidedAt: courseRevisions.decidedAt })
      .from(courseRevisions)
      .where(and(eq(courseRevisions.courseId, course.id), sql`${courseRevisions.status} <> 'pending'`))
      .orderBy(sql`${courseRevisions.decidedAt} desc nulls last`)
      .limit(1),
  ])
  const { categoryId, subcategoryId, topicId, ...rest } = course
  void categoryId
  void subcategoryId
  void topicId
  return {
    ...rest,
    category: cat[0]?.category ?? null,
    subcategory: cat[0]?.subcategory ?? null,
    topic: cat[0]?.topic ?? null,
    units: units.map((u) => ({ title: u.title, body: u.body ?? '' })),
    exams: exams.map((e) => ({ unit: e.unit, passMark: e.passMark ?? '', duration: e.duration ?? '' })),
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    images: images.map((i) => ({ id: i.id, url: mediaUrl(i.path), alt: i.alt ?? '' })),
    parent: parent ? { id: parent.id, title: parent.title, slug: parent.slug, sameSubject: sameSubject(parent, course) } : null,
    pendingChanges: revision ? { content: revision.content, since: revision.submittedAt } : null,
    lastChange: last ?? null,
    upcomingCohorts: dates?.upcoming ?? 0,
    cohortCount: dates?.total ?? 0,
    missing: await missing(db, course),
  }
}

// ---- images, deleting: shared with the admin's shared course pages (modules/admin/courses.mts) ----

type Course = typeof courses.$inferSelect
type OnLog = (tx: Tx, metadata?: Record<string, unknown>) => Promise<void>

// a provider course's files sit in its provider's folder; a shared page's in shared/
export const imageFolder = (course: Course) => (course.kind === 'shared' ? `shared/courses/${course.id}` : `${course.organisationId}/courses/${course.id}`)

export async function courseImageUploadUrl(course: Course, contentType: keyof typeof IMAGE_TYPES) {
  const up = await mediaUploadUrl(imageFolder(course), contentType)
  if (!up) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'We couldn’t prepare the upload. Please try again.' })
  return up
}

export async function addCourseImage(db: typeof Db, course: Course, path: string, alt: string | undefined, onLog: OnLog) {
  if (!path.startsWith(`${imageFolder(course)}/`)) throw new TRPCError({ code: 'FORBIDDEN' })
  if (!(await mediaExists(path))) throw bad('The image did not upload. Please try again.')
  const [n] = await db.select({ n: sql<number>`count(*)::int` }).from(courseImages).where(eq(courseImages.courseId, course.id))
  if (n.n >= 10) throw bad('A course can have up to 10 images.')
  return db.transaction(async (tx) => {
    const [img] = await tx.insert(courseImages).values({ courseId: course.id, position: n.n, path, alt: alt || null }).returning({ id: courseImages.id })
    await onLog(tx)
    return { id: img.id, url: mediaUrl(path) }
  })
}

// keeps, orders and labels a course's images (the first is the cover) and deletes the ones left out
export async function setCourseImages(db: typeof Db, course: Course, images: { id: string; alt: string }[], onLog: OnLog) {
  const now = await db.select().from(courseImages).where(eq(courseImages.courseId, course.id))
  const known = new Set(now.map((i) => i.id))
  if (images.some((i) => !known.has(i.id))) throw bad('That image is no longer on this course. Refresh and try again.')
  const keep = new Set(images.map((i) => i.id))
  const removed = now.filter((i) => !keep.has(i.id))
  await db.transaction(async (tx) => {
    if (removed.length) await tx.delete(courseImages).where(inArray(courseImages.id, removed.map((i) => i.id)))
    for (const [i, img] of images.entries()) await tx.update(courseImages).set({ position: i, alt: img.alt || null }).where(eq(courseImages.id, img.id))
    await onLog(tx, { kept: images.length, removed: removed.length })
  })
  await removeMedia(removed.map((i) => i.path))
  return { ok: true }
}

// deletes a course that has never been live, with its dates, lists and images
export async function deleteCourse(db: typeof Db, course: Course, onLog: OnLog) {
  if (course.publishedAt) throw new TRPCError({ code: 'CONFLICT', message: 'A course that has been live can’t be deleted. Pause it instead.' })
  const images = await db.select({ path: courseImages.path }).from(courseImages).where(eq(courseImages.courseId, course.id))
  await db.transaction(async (tx) => {
    await tx.delete(courses).where(eq(courses.id, course.id))
    await onLog(tx, { title: course.title })
  })
  await removeMedia(images.map((i) => i.path))
  return { ok: true }
}

const log = (tx: Writer, ctx: { user: { id: string }; ip: string | null }, organisationId: string, action: string, courseId: number, metadata: Record<string, unknown> = {}) =>
  logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'provider', organisationId, action, targetType: 'course', targetId: String(courseId), metadata, ip: ctx.ip })

// A provider's change to a course that is waiting for review takes it out of review (back to a draft, to be sent again), so our
// team never approves a version they haven't seen. Returns whether it did.
async function leaveReview(tx: Writer, ctx: { user: { id: string }; ip: string | null }, organisationId: string, course: { id: number; status: string }) {
  if (course.status !== 'pending') return false
  await tx.update(courses).set({ status: 'draft', updatedAt: new Date() }).where(eq(courses.id, course.id))
  await log(tx, ctx, organisationId, 'course.review_withdrawn', course.id)
  return true
}

export const providerCoursesRouter = createTRPCRouter({
  // Every course of this provider, newest first, with what the course list shows.
  list: orgProcedure('provider.courses.view').query(async ({ ctx, input }) => {
    const rows = await ctx.db.execute<{ id: number; title: string; slug: string; status: string; method: string | null; model: string; category: string | null; subcategory: string | null; is_public: boolean; listed: boolean; updated_at: string; parent: string | null; cover: string | null; upcoming: number; pending_change: boolean }>(sql`
      select c.id, c.title, c.slug, c.status, c.method, c.model, c.is_public, c.listed, c.updated_at,
             (select slug from public.categories where id = c.category_id) category,
             (select slug from public.subcategories where id = c.subcategory_id) subcategory,
             (select p.title from public.courses p where p.id = c.parent_id) parent,
             (select i.path from public.course_images i where i.course_id = c.id order by i.position limit 1) cover,
             (select count(*)::int from public.cohorts k where k.course_id = c.id and k.cancelled_at is null and k.ends_on >= current_date) upcoming,
             exists (select 1 from public.course_revisions r where r.course_id = c.id and r.status = 'pending') pending_change
      from public.courses c
      where c.organisation_id = ${input.organisationId}::uuid and c.kind = 'provider'
      order by c.updated_at desc`)
    return rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug, status: r.status, method: r.method, model: r.model, category: r.category, subcategory: r.subcategory, isPublic: r.is_public, listed: r.listed, updatedAt: r.updated_at, parent: r.parent, coverUrl: mediaUrl(r.cover), upcomingCohorts: r.upcoming, pendingChange: r.pending_change }))
  }),

  get: orgProcedure('provider.courses.view')
    .input(z.object({ courseId: id }))
    .query(async ({ ctx, input }) => courseDetail(ctx.db, await ownCourse(ctx.db, input.organisationId, input.courseId))),

  // The shared course pages a provider can put a course under (live ones), A to Z, optionally searched, each with its subject
  // (sub-category and topic slugs): only a page with the course's subject can be chosen (sameSubject).
  sharedPages: orgProcedure('provider.courses.view')
    .input(z.object({ q: z.string().trim().max(80).optional() }))
    .query(async ({ ctx, input }) => {
      const where = [eq(courses.kind, 'shared'), eq(courses.status, 'live')]
      if (input.q) where.push(sql`${courses.title} ilike ${`%${input.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`}`)
      return ctx.db
        .select({
          id: courses.id,
          title: courses.title,
          slug: courses.slug,
          subcategory: sql<string | null>`(select s.slug from public.subcategories s where s.id = ${courses.subcategoryId})`,
          topic: sql<string | null>`(select t.slug from public.topics t where t.id = ${courses.topicId})`,
        })
        .from(courses)
        .where(and(...where))
        .orderBy(asc(courses.title))
        .limit(200)
    }),

  // The new-course wizard: a title, the catalogue place, how it is taught, the model, Skill Saver, and optionally the shared page
  // it joins. Starts as a draft; the editor fills in the rest.
  create: orgProcedure('provider.courses.edit')
    .input(
      z.object({
        title: content.title,
        category: content.category,
        subcategory: content.subcategory,
        topic: content.topic,
        method: settings.method,
        model: settings.model,
        skillSaver: settings.skillSaver,
        parentId: id.optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolveCatalogue(ctx.db, { category: input.category, subcategory: input.subcategory, topic: input.topic ?? null, method: input.method })
      if (input.parentId) {
        const p = await livePage(ctx.db, input.parentId)
        if (!sameSubject(p, { subcategoryId: resolved.subcategoryId ?? null, topicId: resolved.topicId ?? null })) throw bad(OTHER_SUBJECT(p.title), 'parentId')
      }
      const slug = await courseSlug(ctx.db, input.title)
      return ctx.db.transaction(async (tx) => {
        const [made] = await tx
          .insert(courses)
          .values({ kind: 'provider', organisationId: input.organisationId, parentId: input.parentId ?? null, slug, title: input.title, ...resolved, model: input.model, skillSaver: input.skillSaver, createdBy: ctx.user.id })
          .returning({ id: courses.id })
        await log(tx, ctx, input.organisationId, 'course.created', made.id, { title: input.title, parentId: input.parentId ?? null })
        return { id: made.id }
      })
    }),

  // Save the editor. Any of the fields; the lists replace what was there. On a live or paused course the reviewed content waits
  // for approval (returned as `pendingChange: true`); the rest applies at once.
  update: orgProcedure('provider.courses.editPage')
    .input(
      z.object({
        courseId: id,
        ...Object.fromEntries(Object.entries(content).map(([k, v]) => [k, (v as z.ZodTypeAny).optional()])),
        ...Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, (v as z.ZodTypeAny).optional()])),
      }) as z.ZodType<{ courseId: number } & Partial<Record<keyof typeof content | keyof typeof settings, unknown>>>,
    )
    .mutation(async ({ ctx, input, path }) => {
      const { organisationId, courseId, ...fields } = input as { organisationId: string; courseId: number } & Record<string, unknown>
      const keys = Object.keys(fields).filter((k) => fields[k] !== undefined)
      if (!keys.length) return { ok: true, pendingChange: false }
      // page wording and search fields: course editors and marketing; anything else needs full course editing; prices need pricing
      if (keys.some((k) => !PAGE_ONLY.has(k)) && !can(ctx.actor, 'provider.courses.edit', { organisationId })) await refuse(ctx, 'provider.courses.edit', organisationId, path)
      if (keys.some((k) => PRICING.has(k)) && !can(ctx.actor, 'provider.pricing.edit', { organisationId })) await refuse(ctx, 'provider.pricing.edit', organisationId, path)
      const course = await ownCourse(ctx.db, organisationId, courseId)
      if (fields.subcategory !== undefined && fields.category === undefined) throw bad('Choose the category with the sub-category.', 'category')

      // how it is taught can change only while the course has no dates
      if (fields.method !== undefined && fields.method !== course.method) {
        const [n] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(cohorts).where(eq(cohorts.courseId, courseId))
        if (n.n) throw bad('Remove this course’s dates before changing how it is taught.', 'method')
      }
      const reviewed = Object.fromEntries(keys.filter((k) => (REVIEWED as readonly string[]).includes(k)).map((k) => [k, fields[k]]))
      const direct = Object.fromEntries(keys.filter((k) => !(REVIEWED as readonly string[]).includes(k)).map((k) => [k, fields[k]]))
      // check the catalogue choices now, so a pending change never holds an impossible one
      const subject = Object.keys(reviewed).length ? await resolveCatalogue(ctx.db, { category: reviewed.category as string | undefined, subcategory: reviewed.subcategory as string | undefined, topic: reviewed.topic as string | null | undefined, level: reviewed.level as string | undefined }) : {}
      const subjectAfter = { subcategoryId: subject.subcategoryId ?? course.subcategoryId, topicId: subject.topicId !== undefined ? subject.topicId : course.topicId }
      const subjectChanged = subjectAfter.subcategoryId !== course.subcategoryId || subjectAfter.topicId !== course.topicId
      const directSet: Partial<typeof courses.$inferInsert> = {}
      if (direct.method !== undefined) directSet.method = (await resolveCatalogue(ctx.db, { method: direct.method as string })).method
      // only a self-paced course has a price of its own (classroom and live online are priced on their dates)
      if (directSet.method !== undefined && directSet.method !== 'self-paced') directSet.pricePence = null
      for (const k of ['seoTitle', 'seoDescription'] as const) if (direct[k] !== undefined) directSet[k] = (direct[k] as string | null) || null
      if (direct.seoKeywords !== undefined) directSet.seoKeywords = [...new Set((direct.seoKeywords as string[]).map((w) => w.toLowerCase()))]
      for (const k of ['pricePence', 'skillSaver', 'isPublic', 'listed', 'model'] as const) if (direct[k] !== undefined) (directSet as Record<string, unknown>)[k] = direct[k]
      if (direct.parentId !== undefined) {
        if (direct.parentId !== null) {
          const p = await livePage(ctx.db, direct.parentId as number)
          if (!sameSubject(p, subjectAfter)) throw bad(OTHER_SUBJECT(p.title), 'parentId')
        }
        directSet.parentId = direct.parentId as number | null
      } else if (course.parentId && subjectChanged) {
        const [p] = await ctx.db.select({ title: courses.title, subcategoryId: courses.subcategoryId, topicId: courses.topicId }).from(courses).where(eq(courses.id, course.parentId))
        if (p && !sameSubject(p, subjectAfter)) throw bad(`This course is on the shared course page “${p.title}”, so its subject has to stay the same as that page's. To change the subject, first set the shared course page to None in the course settings.`, 'subcategory')
      }

      const isLive = course.status === 'live' || course.status === 'paused'
      return ctx.db.transaction(async (tx) => {
        if (Object.keys(directSet).length) await tx.update(courses).set({ ...directSet, updatedAt: new Date() }).where(eq(courses.id, courseId))
        const backToDraft = await leaveReview(tx, ctx, organisationId, course)
        let pendingChange = false
        if (Object.keys(reviewed).length) {
          if (isLive) {
            const [open] = await tx.select().from(courseRevisions).where(and(eq(courseRevisions.courseId, courseId), eq(courseRevisions.status, 'pending')))
            if (open) await tx.update(courseRevisions).set({ content: { ...(open.content as object), ...reviewed }, submittedBy: ctx.user.id, submittedAt: new Date() }).where(eq(courseRevisions.id, open.id))
            else await tx.insert(courseRevisions).values({ courseId, content: reviewed, submittedBy: ctx.user.id })
            pendingChange = true
          } else await applyContent(tx, courseId, reviewed)
        }
        await log(tx, ctx, organisationId, pendingChange ? 'course.change_submitted' : 'course.updated', courseId, { fields: keys })
        return { ok: true, pendingChange, backToDraft }
      })
    }),

  // Withdraw a content change that is still waiting (the live course stays as it is).
  discardChange: orgProcedure('provider.courses.editPage')
    .input(z.object({ courseId: id }))
    .mutation(async ({ ctx, input }) => {
      await ownCourse(ctx.db, input.organisationId, input.courseId)
      return ctx.db.transaction(async (tx) => {
        const gone = await tx.delete(courseRevisions).where(and(eq(courseRevisions.courseId, input.courseId), eq(courseRevisions.status, 'pending'))).returning({ id: courseRevisions.id })
        if (gone.length) await log(tx, ctx, input.organisationId, 'course.change_withdrawn', input.courseId)
        return { ok: true }
      })
    }),

  // Images: an upload address, then addImage with the uploaded file; setImages keeps, orders and labels them (the first is the
  // cover) and deletes the ones left out.
  imageUploadUrl: orgProcedure('provider.courses.editPage')
    .input(z.object({ courseId: id, contentType: z.enum(Object.keys(IMAGE_TYPES) as [keyof typeof IMAGE_TYPES, ...(keyof typeof IMAGE_TYPES)[]]) }))
    .mutation(async ({ ctx, input }) => courseImageUploadUrl(await ownCourse(ctx.db, input.organisationId, input.courseId), input.contentType)),

  addImage: orgProcedure('provider.courses.editPage')
    .input(z.object({ courseId: id, path: z.string().regex(MEDIA_PATH), alt: line(140, 'image description').optional() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      return addCourseImage(ctx.db, course, input.path, input.alt, async (tx) => {
        await leaveReview(tx, ctx, input.organisationId, course)
        await log(tx, ctx, input.organisationId, 'course.image_added', course.id)
      })
    }),

  setImages: orgProcedure('provider.courses.editPage')
    .input(z.object({ courseId: id, images: z.array(z.object({ id: z.string().uuid(), alt: line(140, 'image description') })).max(10) }))
    .mutation(async ({ ctx, input }) => {
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      return setCourseImages(ctx.db, course, input.images, async (tx, m) => {
        await leaveReview(tx, ctx, input.organisationId, course)
        await log(tx, ctx, input.organisationId, 'course.images_changed', course.id, m)
      })
    }),

  // Send a draft (or a course an admin asked to change) for approval, once nothing required is missing. Only an approved provider
  // sends: one still waiting for our approval can build its courses and dates, and sends them once it is approved.
  submit: orgProcedure('provider.courses.edit')
    .input(z.object({ courseId: id }))
    .mutation(async ({ ctx, input }) => {
      const org = ctx.actor.memberships.find((m) => m.organisationId === input.organisationId)
      if (org?.organisationStatus !== 'active') throw new TRPCError({ code: 'FORBIDDEN', message: 'Your provider account is waiting for our team’s approval. You can send courses for approval once it is approved.' })
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      if (course.status !== 'draft' && course.status !== 'changes') throw new TRPCError({ code: 'CONFLICT', message: course.status === 'pending' ? 'This course is already waiting for approval.' : 'This course is already live.' })
      const gaps = await missing(ctx.db, course)
      if (gaps.length) throw bad(`Add ${gaps.join(', ')} before sending it for approval.`)
      return ctx.db.transaction(async (tx) => {
        await tx.update(courses).set({ status: 'pending', submittedAt: new Date(), statusNote: null, updatedAt: new Date() }).where(eq(courses.id, course.id))
        await log(tx, ctx, input.organisationId, 'course.submitted', course.id)
        return { ok: true }
      })
    }),

  // Pause a live course (it leaves the site, its dates stay) or put it back live.
  setPaused: orgProcedure('provider.courses.edit')
    .input(z.object({ courseId: id, paused: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      const from = input.paused ? 'live' : 'paused'
      if (course.status !== from) throw new TRPCError({ code: 'CONFLICT', message: input.paused ? 'Only a live course can be paused.' : 'This course isn’t paused.' })
      // a course our team paused (it has their reason) goes back live only through them
      if (!input.paused && course.statusNote) throw new TRPCError({ code: 'FORBIDDEN', message: 'Our team paused this course. Contact us to put it back live.' })
      return ctx.db.transaction(async (tx) => {
        await tx.update(courses).set({ status: input.paused ? 'paused' : 'live', updatedAt: new Date() }).where(eq(courses.id, course.id))
        await log(tx, ctx, input.organisationId, input.paused ? 'course.paused' : 'course.resumed', course.id)
        return { ok: true }
      })
    }),

  // Delete a course that has never been live (with its dates, lists and images). A course that has been live is paused instead,
  // so its history and bookings stay.
  remove: orgProcedure('provider.courses.delete')
    .input(z.object({ courseId: id }))
    .mutation(async ({ ctx, input }) => {
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      return deleteCourse(ctx.db, course, (tx, m) => log(tx, ctx, input.organisationId, 'course.deleted', course.id, m))
    }),
})
