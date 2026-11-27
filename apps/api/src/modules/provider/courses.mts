import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
  and,
  asc,
  categories,
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
  pricePlans,
  sql,
  subcategories,
  topics,
} from '@readtraining/db'
import { can } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import { refuseRetired, retiredEntries, retiredMethods } from '../../lib/retired.mjs'
import { loadCoursePage } from '../catalogue/listings.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { IMAGE_TYPES, MEDIA_PATH, MIN_COURSE_IMAGE, copyMedia, mediaUploadUrl, mediaUrl, removeMedia, storedImageSize } from '../../lib/media.mjs'
import { afterAnswer, notify, notifyApprovers, ownerOf, personOf } from '../../lib/notify.mjs'
import { freeSlug, slugify } from '../../lib/slug.mjs'
import { usablePlan } from './plans.mjs'
import { createTRPCRouter, limit, notForStaff, orgProcedure, refuse } from '../../trpc/trpc.mjs'

// A provider's courses (Milestone 2): create one (under a shared course page or on its own), write its page, add images, send it
// for approval (and withdraw it), pause it, duplicate it, delete it (deleteBlock). Every change is checked against the provider's
// permission table and logged.
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
export const REVIEWED = ['title', 'summary', 'description', 'audience', 'entryRequirements', 'outcomes', 'features', 'category', 'subcategory', 'topic', 'level', 'compliance', 'videoUrl', 'syllabusIntro', 'units', 'examsIntro', 'exams', 'faqs'] as const

// A pass mark: a percentage up to 100%, a score that isn't more than its total ("26 out of 40", "26/40", "26 of 40 marks", decimals
// too), or words ("Pass or fail"). A bare "of" is a score only when the pass mark ends with it ("26 of 40", "26 of 40 marks"), so
// "Level 3 of 2 sections" is words. The editor checks the same (passMarkProblem in ProviderCourseEditor.jsx). Returns what is
// wrong, or ''.
const NUM = String.raw`(\d+(?:\.\d+)?)`
const SCORE = new RegExp(String.raw`${NUM}\s*(?:out of|/)\s*${NUM}`)
const SCORE_OF = new RegExp(String.raw`${NUM}\s+of\s+${NUM}(?:\s*(?:marks?|points?|questions?|answers?))?\s*\.?$`)
export function passMarkProblem(text: string) {
  const t = text.trim().toLowerCase()
  if (!t) return ''
  // the editor's kinds with their numbers still missing ("%", "26 out of"): the course page would show them as they are
  if (/^[\d.]*\s*%$/.test(t) && !/\d/.test(t)) return 'Enter the percentage needed to pass.'
  if (/^[\d.]*\s*out of\s*[\d.]*$/.test(t) && !/^\d+(?:\.\d+)?\s*out of\s*\d+(?:\.\d+)?$/.test(t)) return 'Enter the score needed and the total, like 26 out of 40.'
  const pct = t.match(/(\d+(?:\.\d+)?)\s*(?:%|per\s*cent\b)/)
  if (pct && Number(pct[1]) > 100) return 'A percentage pass mark can’t be over 100%.'
  const score = t.match(SCORE) || t.match(SCORE_OF)
  if (score && (Number(score[2]) === 0 || Number(score[1]) > Number(score[2]))) return 'The pass mark can’t be more than the total, like 26 out of 40.'
  return ''
}

// A link to one YouTube or Vimeo video as its player's address, or null (a channel, a playlist, another site). The course page plays
// only what this returns, with the same rules (videoEmbed in apps/web/lib/catalogueData.js): keep the two the same, so every link
// a provider can save plays on the page.
const YT_ID = /^[\w-]{11}$/
const VIMEO_ID = /^\d{1,12}$/
const VIMEO_HASH = /^[\da-f]{6,20}$/i
export function videoEmbed(link: string): string | null {
  let url: URL
  try {
    url = new URL(link.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '')
  const path = url.pathname.split('/').filter(Boolean)
  if (host === 'youtube.com' || host === 'youtu.be') {
    const id = host === 'youtu.be' ? (path.length === 1 ? path[0] : null) : path[0] === 'watch' && path.length === 1 ? url.searchParams.get('v') : ['embed', 'shorts', 'live', 'v'].includes(path[0]) && path.length === 2 ? path[1] : null
    // "videoseries" is 11 letters too: /embed/videoseries?list= is a playlist
    return id && YT_ID.test(id) && id !== 'videoseries' ? `https://www.youtube-nocookie.com/embed/${id}` : null
  }
  let id: string | null = null
  let hash = url.searchParams.get('h')
  if (host === 'player.vimeo.com') id = path[0] === 'video' && path.length === 2 ? path[1] : null
  else if (host === 'vimeo.com') {
    if (path.length <= 2 && VIMEO_ID.test(path[0] || '')) [id, hash] = [path[0], path[1] || hash]
    else if (path[0] === 'video' && path.length === 2) id = path[1]
    else if (path[0] === 'channels' && path.length === 3) id = path[2]
    else if (['showcase', 'album'].includes(path[0]) && path[2] === 'video' && path.length === 4) id = path[3]
    else if (path[0] === 'groups' && path[2] === 'videos' && path.length === 4) id = path[3]
  }
  if (!id || !VIMEO_ID.test(id) || (hash && !VIMEO_HASH.test(hash))) return null
  return `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}`
}

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
  // the course type (courses.compliance): compliance (required by law, regulation or an employer's policy) or learned by choice
  compliance: z.boolean({ required_error: 'Choose whether this is a compliance course.', invalid_type_error: 'Choose whether this is a compliance course.' }),
  videoUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === '' || videoEmbed(v) !== null, 'Use a link to one YouTube or Vimeo video, starting https://')
    .optional()
    .nullable(),
  // a line above the syllabus units, and the text above the exam table (both optional)
  syllabusIntro: text(600, 'syllabus intro'),
  units: z.array(z.object({ title: line(120, 'unit title').min(1, 'Give every unit a title.'), body: text(2000, 'unit text') })).max(40, 'Add up to 40 units.'),
  examsIntro: text(1200, 'text above the exam table'),
  // the course page shows each row as a line of a table (unit, pass mark, duration): a row needs all three, or no row at all;
  // what the exam is (its Assessment column: "72 multiple-choice questions") is optional
  exams: z.array(z.object({
    unit: line(120, 'exam unit').min(1, 'Name every exam row.'),
    passMark: line(40, 'pass mark').min(1, 'Give every exam row its pass mark.').refine((v) => !passMarkProblem(v), (v) => ({ message: passMarkProblem(v) })),
    duration: line(40, 'duration').min(1, 'Give every exam row its duration.'),
    assessment: line(120, 'assessment').optional().nullable(),
  })).max(20, 'Add up to 20 exam rows.'),
  faqs: z.array(z.object({ question: line(160, 'question').min(1, 'Write every question.'), answer: line(1200, 'answer').min(1, 'Write every answer.') })).max(30, 'Add up to 30 FAQs.'),
}
// The ways of teaching a provider course can use (its learning options), in the order they are shown: booking only knows these
// (classroom and live online are priced on their dates, self-paced has its own price). A method an admin adds in Catalogue
// settings names catalogue pages, but a provider course on it could never have dates or a price, so it is refused until booking
// supports it. A course offers one or more (`methods`), one of them its primary (`method`, shown first).
export const TAUGHT = ['classroom', 'live-online', 'self-paced']
/** Whether a learning option is taught on dates (cohorts). */
export const isDated = (method: string) => method === 'classroom' || method === 'live-online'
const taughtAll = (list: string[]) => {
  if (list.some((m) => !TAUGHT.includes(m))) throw bad('Choose classroom, live online or self-paced.', 'methods')
}
/** The options given, once each, in the order they are shown. */
const inOrder = (list: string[]) => TAUGHT.filter((m) => list.includes(m))

export const settings = {
  seoTitle: text(60, 'search title'),
  seoDescription: text(320, 'search description'),
  seoKeywords: z.array(line(40, 'keyword').min(1)).max(20, 'Add up to 20 keywords.'),
  pricePence: z.number().int().min(100, 'Enter a price of at least £1.').max(10000000, 'Enter a price of £100,000 or less.').nullable(),
  planId: z.string().uuid().nullable(), // the self-paced option sold in packages (its price is then the plan's cheapest package)
  skillSaver: z.boolean(),
  // Visibility (the gear's Public / Private, "Publish on marketplace"): one choice for the provider. It sets both
  // stored values, `is_public` and `listed`, which the catalogue always reads together (a private course still opens from its link).
  isPublic: z.boolean(),
  model: z.enum(['bookings', 'enquiries']),
  method: slugRef, // the primary learning option, one of `methods`
  methods: z.array(slugRef).min(1, 'Choose at least one learning option.').max(3),
}
const ENQUIRIES_LATER = 'Enquiries (pay per lead) is coming later. Choose Bookings for now.'
const PAGE_ONLY = new Set(['title', 'summary', 'description', 'audience', 'entryRequirements', 'outcomes', 'features', 'videoUrl', 'seoTitle', 'seoDescription', 'seoKeywords'])
const PRICING = new Set(['pricePence', 'skillSaver', 'planId'])
// Settings our team doesn't check at approval (where it is listed follows its subject, placeOn): changing only these leaves a
// course that is waiting for review as it was sent. Anything else (its wording, pictures, price, how it is taught) is a new
// version for our team to check (keepInReview).
const KEEPS_REVIEW = new Set(['seoTitle', 'seoDescription', 'seoKeywords', 'isPublic'])
// today's date in the UK: dates are UK days (the database's current_date is UTC, still yesterday for an hour after midnight in summer)
export const ukToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())

export const bad = (message: string, field?: string) => new TRPCError({ code: 'BAD_REQUEST', message, cause: field ? Object.assign(new Error(message), { field }) : undefined })

// A course title is up to 60 characters (about what search results show of it). A longer one saved before this limit (up to 80,
// `content.title`) stays as it is: only a new or changed title has to fit, so no course is stuck on a save.
export const TITLE_MAX = 60
export function refuseLongTitle(title: unknown, current: string | null = null) {
  if (typeof title === 'string' && title.length > TITLE_MAX && title !== current) throw bad(`Enter a title of ${TITLE_MAX} characters or fewer.`, 'title')
}
export const notFound = () => new TRPCError({ code: 'NOT_FOUND', message: 'This course was not found.' })

/** The course, when it is this provider's own; NOT_FOUND otherwise (another provider's id is never revealed). */
export async function ownCourse(db: Writer, organisationId: string, courseId: number) {
  const [c] = await db.select().from(courses).where(and(eq(courses.id, courseId), eq(courses.organisationId, organisationId), eq(courses.kind, 'provider')))
  if (!c) throw notFound()
  return c
}

/** Category, sub-category and topic slugs to ids, checked to belong together and to be in use; level and methods checked too. */
export async function resolveCatalogue(db: Writer, input: { category?: string; subcategory?: string; topic?: string | null; level?: string; method?: string; methods?: string[] }) {
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
  if (input.methods?.length) {
    const wanted = [...new Set(input.methods)]
    const active = await db.select({ slug: deliveryMethods.slug }).from(deliveryMethods).where(and(inArray(deliveryMethods.slug, wanted), eq(deliveryMethods.active, true)))
    if (active.length < wanted.length) throw bad('Choose learning options from the list.', 'methods')
  }
  return out
}

/** The topics in use under a sub-category, A to Z: when there are any, a provider's course is listed under one, chosen by our team. */
export async function activeTopics(db: Writer, subcategoryId: string | null) {
  if (!subcategoryId) return []
  return db.select({ id: topics.id, name: topics.name }).from(topics).where(and(eq(topics.subcategoryId, subcategoryId), eq(topics.active, true))).orderBy(asc(topics.name))
}

// The catalogue ids for the slugs a change waiting for approval holds, whether or not each is still offered (a duplicated course
// is a draft: sending it says if one has been retired). The topic stays `topicId` when the change doesn't name one.
async function subjectOf(db: Writer, c: { category?: unknown; subcategory?: unknown; topic?: unknown }, topicId: string | null) {
  const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, String(c.category)))
  const [sub] = cat ? await db.select({ id: subcategories.id }).from(subcategories).where(and(eq(subcategories.slug, String(c.subcategory)), eq(subcategories.categoryId, cat.id))) : []
  const [top] = sub && c.topic ? await db.select({ id: topics.id }).from(topics).where(and(eq(topics.slug, String(c.topic)), eq(topics.subcategoryId, sub.id))) : []
  return { categoryId: cat?.id ?? null, subcategoryId: sub?.id ?? null, topicId: c.topic === undefined ? topicId : (top?.id ?? null) }
}

// A provider's course on a shared course page is the same course as the page, so their subjects must match: the same sub-category,
// and the same topic when both have one. (A web development course can't be listed on the first aid page.)
type Subject = { subcategoryId: string | null; topicId: string | null }
export const sameSubject = (page: Subject, course: Subject) =>
  page.subcategoryId !== null && page.subcategoryId === course.subcategoryId && (!page.topicId || !course.topicId || page.topicId === course.topicId)


// Where a provider course is listed (the provider never chooses; the subject decides): on the live shared course
// page for its topic, or on its sub-category's only shared page when it has no topic match; otherwise on a page of its own
// (null). Used when a course is created, when a draft's subject changes, and when a change to a live course's subject is
// approved (admin.courses), so the placement always follows the subject. The New course pop-up shows the same choice
// (sharedPageFor in NewCourse.jsx): keep the two the same.
export async function placeOn(db: Writer, subject: Subject): Promise<number | null> {
  if (!subject.subcategoryId) return null
  const pages = await db
    .select({ id: courses.id, topicId: courses.topicId })
    .from(courses)
    .where(and(eq(courses.kind, 'shared'), eq(courses.status, 'live'), eq(courses.subcategoryId, subject.subcategoryId)))
  const fits = pages.filter((p) => !p.topicId || !subject.topicId || p.topicId === subject.topicId)
  const exact = subject.topicId ? fits.find((p) => p.topicId === subject.topicId) : undefined
  return exact?.id ?? (fits.length === 1 ? fits[0].id : null)
}

/** A free web address for a course title. Never only digits: /course/1000 means course number 1000. */
export async function courseSlug(db: Writer, title: string) {
  const words = slugify(title, 'course')
  const base = /^\d+$/.test(words) ? `course-${words}` : words
  const taken = await db.select({ slug: courses.slug }).from(courses).where(or(eq(courses.slug, base), like(courses.slug, `${base}-%`)))
  return freeSlug(base, taken.map((t) => t.slug))
}

/** Replaces a course's units, exams and FAQs with the lists given (each only when given). */
async function writeLists(tx: Tx, courseId: number, lists: { units?: { title: string; body?: string | null }[]; exams?: { unit: string; passMark?: string | null; duration?: string | null; assessment?: string | null }[]; faqs?: { question: string; answer: string }[] }) {
  if (lists.units) {
    await tx.delete(courseUnits).where(eq(courseUnits.courseId, courseId))
    if (lists.units.length) await tx.insert(courseUnits).values(lists.units.map((u, i) => ({ courseId, position: i, title: u.title, body: u.body || null })))
  }
  if (lists.exams) {
    await tx.delete(courseExams).where(eq(courseExams.courseId, courseId))
    if (lists.exams.length) await tx.insert(courseExams).values(lists.exams.map((e, i) => ({ courseId, position: i, unit: e.unit, passMark: e.passMark || null, duration: e.duration || null, assessment: e.assessment?.trim() || null })))
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
  for (const k of ['summary', 'description', 'audience', 'entryRequirements', 'videoUrl', 'syllabusIntro', 'examsIntro'] as const) if (c[k] !== undefined) set[k] = (c[k] as string | null) || null
  if (c.outcomes !== undefined) set.outcomes = c.outcomes as string[]
  if (c.features !== undefined) set.features = c.features as string[]
  if (c.compliance !== undefined) set.compliance = c.compliance as boolean
  await tx.update(courses).set(set).where(eq(courses.id, courseId))
  await writeLists(tx, courseId, c as Parameters<typeof writeLists>[2])
}

// The course's learning options taught on dates (taking bookings) that have no date learners can book: one not cancelled, taking
// bookings and starting after today, as the catalogue lists them (catalogue/listings.mts). A course goes to our team, and live,
// with something to book on every way it is taught on dates; once live, its dates may run out (the editor says so).
export async function datesMissing(db: Writer, course: { id: number; kind: string; methods: string[]; closedMethods: string[] }) {
  const open = course.kind === 'provider' ? course.methods.filter((m) => isDated(m) && !course.closedMethods.includes(m)) : []
  if (!open.length) return []
  const rows = await db.execute<{ method: string }>(sql`
    select distinct method from public.cohorts
    where course_id = ${course.id} and cancelled_at is null and bookable and starts_on > ${ukToday()}::date`)
  const has = new Set(rows.map((r) => r.method))
  return open.filter((m) => !has.has(m))
}

// the shortest short description and description a course can be sent (or a shared page published) with, in characters; a draft
// saves with less (the editor's MIN, ProviderCourseEditor.jsx: keep the two the same)
export const MIN_TEXT = { summary: 50, description: 200 } as const
const longEnough = (text: string | null, min: number) => (text || '').trim().length >= min

// what's missing before a course can be sent for approval, or a shared page published (the editors show the same list).
// `dates: false` leaves the dates out (a course in review may be given a new way taught on dates, whose dates come after it).
export async function missing(db: Writer, course: typeof courses.$inferSelect, { dates = true } = {}) {
  const [[img], [units]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(courseImages).where(eq(courseImages.courseId, course.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(courseUnits).where(eq(courseUnits.courseId, course.id)),
  ])
  const gaps: string[] = []
  if (!longEnough(course.summary, MIN_TEXT.summary)) gaps.push(`a short description of at least ${MIN_TEXT.summary} characters`)
  if (!longEnough(course.description, MIN_TEXT.description)) gaps.push(`a description of at least ${MIN_TEXT.description} characters`)
  if (!course.categoryId || !course.subcategoryId) gaps.push('a category and sub-category')
  if (!course.level) gaps.push('a level')
  if (course.compliance === null) gaps.push('whether it is a compliance course')
  if (course.kind === 'provider' && (!course.method || !course.methods.length)) gaps.push('a learning option')
  if (course.outcomes.length < 4) gaps.push('at least 4 things learners will learn')
  if (!units.n) gaps.push('the syllabus (at least one unit)')
  if (!img.n) gaps.push('at least one image')
  if (course.methods.includes('self-paced') && course.pricePence === null) gaps.push('a price for the self-paced option')
  if (dates) for (const m of await datesMissing(db, course)) gaps.push(`a ${await methodLabel(db, m)} date learners can book`)
  return gaps
}

// How many of the course editor's required steps a provider course still has to finish (the editor's "3 of 5 required steps
// complete"; the Dashboard's to-do list shows the rest on each draft). The steps and their rules are the editor's own
// (ProviderCourseEditor.jsx SECTIONS without the optional ones, ticked by sectionOk from the draft as it is typed): keep the two
// the same, and ask what `missing` does: the Price step is done with the self-paced price and a date learners can book on every
// way it is taught on dates (`datesOk`, datesMissing).
export type StepFacts = { title: boolean; summary: boolean; description: boolean; filed: boolean; level: boolean; compliance: boolean; images: boolean; outcomes: number; units: boolean; method: string | null; methods: string[]; priced: boolean; datesOk: boolean }
export function stepsLeft(f: StepFacts) {
  const method = f.method || 'classroom' // the editor opens a course with no method on classroom
  const methods = f.methods.length ? f.methods : [method]
  const done = [
    f.title && f.summary && f.description && f.filed && f.level && f.compliance && f.images, // Course landing page
    f.outcomes >= 4, // Course information
    f.units, // Syllabus and exam
    methods.includes(method), // Learning options
    // Price: the self-paced option's own price or plan, and a date learners can book on each way it is taught on dates
    (!methods.includes('self-paced') || f.priced) && f.datesOk,
  ]
  return done.filter((ok) => !ok).length
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
    course.parentId ? db.select({ id: courses.id, title: courses.title, slug: courses.slug, subcategoryId: courses.subcategoryId, topicId: courses.topicId, compliance: courses.compliance }).from(courses).where(eq(courses.id, course.parentId)) : Promise.resolve([]),
    db.execute<{ category: string | null; subcategory: string | null; topic: string | null }>(sql`
      select (select slug from public.categories where id = ${course.categoryId}) category,
             (select slug from public.subcategories where id = ${course.subcategoryId}) subcategory,
             (select slug from public.topics where id = ${course.topicId}) topic`),
    db.execute<{ upcoming: number; classroom: number; live_online: number; book_classroom: number; book_live_online: number; total: number }>(sql`
      select count(*) filter (where cancelled_at is null and ends_on >= ${ukToday()}::date)::int upcoming,
             count(*) filter (where cancelled_at is null and bookable and starts_on > ${ukToday()}::date and method = 'classroom')::int book_classroom,
             count(*) filter (where cancelled_at is null and bookable and starts_on > ${ukToday()}::date and method = 'live-online')::int book_live_online,
             count(*) filter (where cancelled_at is null and ends_on >= ${ukToday()}::date and method = 'classroom')::int classroom,
             count(*) filter (where cancelled_at is null and ends_on >= ${ukToday()}::date and method = 'live-online')::int live_online,
             count(*)::int total
      from public.cohorts where course_id = ${course.id}`),
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
    exams: exams.map((e) => ({ unit: e.unit, passMark: e.passMark ?? '', duration: e.duration ?? '', assessment: e.assessment ?? '' })),
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    images: images.map((i) => ({ id: i.id, url: mediaUrl(i.path), alt: i.alt ?? '' })),
    // the shared page's course type (our team's answer, the one the public sees), beside the provider's own in the admin's review
    parent: parent ? { id: parent.id, title: parent.title, slug: parent.slug, sameSubject: sameSubject(parent, course), compliance: parent.compliance } : null,
    pendingChanges: revision ? { content: revision.content, since: revision.submittedAt } : null,
    version: new Date(Math.max(course.updatedAt.getTime(), revision?.submittedAt?.getTime() ?? 0)).toISOString(),
    lastChange: last ?? null,
    upcomingCohorts: dates?.upcoming ?? 0,
    // the dates learners can book now (as the catalogue lists them: taking bookings, before their first day, on a way still taking
    // bookings): the editor's count of dates and its "no dates" note
    bookableCohorts: (course.closedMethods.includes('classroom') ? 0 : dates?.book_classroom ?? 0) + (course.closedMethods.includes('live-online') ? 0 : dates?.book_live_online ?? 0),
    cohortCount: dates?.total ?? 0,
    // a dated learning option with upcoming dates can't be turned off until they are cancelled
    upcomingByMethod: { classroom: dates?.classroom ?? 0, 'live-online': dates?.live_online ?? 0 },
    missing: await missing(db, course),
    // its ways taught on dates with no date learners can book (sending it for approval needs one on each)
    datesMissing: await datesMissing(db, course),
    // "Name (category)" for each catalogue entry the course is filed under that is no longer offered (it can't go live under one)
    retired: await retiredEntries(db, course.id),
    // its learning options that are retired in Catalogue settings (one can be turned off, not on)
    retiredMethods: course.kind === 'provider' ? await retiredMethods(db, course.id) : [],
    // why the gear can't offer Delete (a provider's course): 'in_review', 'paused_by_team', 'in_use', or null (see deleteBlock)
    deleteBlock: course.kind === 'provider' ? await deleteBlock(db, course) : null,
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

// deletes stored pictures no course image uses any more (a file attached twice stays while one copy is left)
async function removeUnusedImages(db: typeof Db, paths: string[]) {
  if (!paths.length) return
  const used = await db.select({ path: courseImages.path }).from(courseImages).where(inArray(courseImages.path, paths))
  const keep = new Set(used.map((u) => u.path))
  await removeMedia(paths.filter((p) => !keep.has(p)))
}

// An image change moves the course's version on (after `onLog` has checked the editor's `seen`), so another tab still showing the
// old images is refused instead of saving its list over the new one and deleting the image just added.
const touchCourse = (tx: Writer, courseId: number) => tx.update(courses).set({ updatedAt: new Date() }).where(eq(courses.id, courseId))

export async function addCourseImage(db: typeof Db, course: Course, path: string, alt: string | undefined, onLog: OnLog) {
  if (!path.startsWith(`${imageFolder(course)}/`)) throw new TRPCError({ code: 'FORBIDDEN' })
  // one uploaded file is one image: attaching it again is refused (and the file, still in use, is left alone)
  const [used] = await db.select({ id: courseImages.id }).from(courseImages).where(eq(courseImages.path, path)).limit(1)
  if (used) throw bad('That picture is already on this course.')
  // the picture itself must be at least 500 × 300 pixels (checked on the stored file, whatever the browser said); a smaller or
  // unreadable one is deleted again
  const size = await storedImageSize(path)
  if (size === undefined) throw bad('The image did not upload. Please try again.')
  const { width, height } = MIN_COURSE_IMAGE
  if (!size || size.width < width || size.height < height) {
    await removeMedia([path])
    throw bad(size ? `This picture is ${size.width} × ${size.height} pixels. Choose one at least ${width} × ${height} pixels.` : 'We couldn’t read that picture. Choose a JPG, PNG, WebP or GIF file.')
  }
  try {
    return await db.transaction(async (tx) => {
      // counted under the course's row lock, so two uploads at the same moment (two tabs) can't both be the tenth
      await tx.select({ id: courses.id }).from(courses).where(eq(courses.id, course.id)).for('update')
      const [n] = await tx.select({ n: sql<number>`count(*)::int` }).from(courseImages).where(eq(courseImages.courseId, course.id))
      if (n.n >= 10) throw bad('A course can have up to 10 images. Remove one before adding another.')
      const [img] = await tx.insert(courseImages).values({ courseId: course.id, position: n.n, path, alt: alt || null }).returning({ id: courseImages.id })
      await onLog(tx)
      await touchCourse(tx, course.id)
      return { id: img.id, url: mediaUrl(path) }
    })
  } catch (error) {
    await removeUnusedImages(db, [path]) // not added (the course changed elsewhere, or the save failed): the uploaded file goes too
    throw error
  }
}

// keeps, orders and labels a course's images (the first is the cover) and deletes the ones left out
export async function setCourseImages(db: typeof Db, course: Course, images: { id: string; alt: string }[], onLog: OnLog) {
  // the course's row is locked and its images read inside the transaction, so two changes at the same moment (two tabs keeping
  // different images) can't both pass the checks and leave a live course with none
  const removed = await db.transaction(async (tx) => {
    const [row] = await tx.select({ status: courses.status }).from(courses).where(eq(courses.id, course.id)).for('update')
    const now = await tx.select().from(courseImages).where(eq(courseImages.courseId, course.id))
    const known = new Set(now.map((i) => i.id))
    if (images.some((i) => !known.has(i.id))) throw bad('That image is no longer on this course. Refresh and try again.')
    // a course that is (or has been) live keeps at least one image: it needed one to go live, and its card and page show it
    const status = row?.status ?? course.status
    if (!images.length && now.length && (status === 'live' || status === 'paused')) throw bad('A live course needs at least one image. Upload another before removing this one.')
    if (!images.length && now.length && status === 'pending') throw bad('A course waiting for review needs at least one image. Upload another before removing this one.')
    const keep = new Set(images.map((i) => i.id))
    const gone = now.filter((i) => !keep.has(i.id))
    if (gone.length) await tx.delete(courseImages).where(inArray(courseImages.id, gone.map((i) => i.id)))
    for (const [i, img] of images.entries()) await tx.update(courseImages).set({ position: i, alt: img.alt || null }).where(eq(courseImages.id, img.id))
    await onLog(tx, { kept: images.length, removed: gone.length })
    await touchCourse(tx, course.id)
    return gone
  })
  await removeUnusedImages(db, removed.map((i) => i.path))
  return { ok: true }
}

// ---- deleting a provider's course -------------------------------------------------------------------
// A draft, or a course our team asked to change, can be deleted. One waiting for our team's review can't: the provider withdraws
// it from review first (withdrawReview), so an admin is never deciding on a course that is being deleted. A course that has been
// live (live or paused) can be deleted only while nobody has booked or reviewed it, and the provider types its name to confirm.
// One our team has paused can't be deleted while it is paused (the provider contacts us). The editor's gear asks deleteBlock before showing Delete, and `remove` asks it again under the course's row lock.

/** Whether a course has been live: deleting one takes it off ReadTraining, so it needs its name typed and our team is told. */
export const hasBeenLive = (course: Pick<Course, 'status' | 'publishedAt'>) => Boolean(course.publishedAt) || course.status === 'live' || course.status === 'paused'

/**
 * Why a provider's course can't be deleted now, or null when it can: 'in_review' while it waits for our team's review,
 * 'paused_by_team' while our team has paused it (paused with their reason in status_note, as setPaused's "put back live" rule
 * and the admin's pause decision use it; a course the provider paused has no note), 'in_use' once a learner has booked it (an
 * order) or reviewed it (a review). The gear (courseDetail's `deleteBlock`), the Courses list (`list`, through blockFor) and
 * `remove` all ask this, so they never disagree.
 */
export async function deleteBlock(db: Writer, course: Pick<Course, 'id' | 'status' | 'statusNote'>) {
  const first = blockFor(course, false)
  if (first) return first
  const [row] = await db.execute<{ used: boolean }>(sql`
    select exists (select 1 from public.orders where course_id = ${course.id}) or exists (select 1 from public.reviews where course_id = ${course.id}) used`)
  return blockFor(course, Boolean(row?.used))
}
/** deleteBlock's rule, given whether a learner has booked or reviewed the course (`used`). */
const blockFor = (course: Pick<Course, 'status' | 'statusNote'>, used: boolean): 'in_review' | 'paused_by_team' | 'in_use' | null =>
  course.status === 'pending' ? 'in_review' : course.status === 'paused' && course.statusNote ? 'paused_by_team' : used ? 'in_use' : null

const DELETE_REFUSED = {
  in_review: 'This course is waiting for our team’s review. Withdraw it from review first (in the course settings), then you can delete it.',
  paused_by_team: 'Our team has paused this course, so it can’t be deleted while it’s paused. Contact us if you’d like it removed.',
  in_use: 'Courses can’t be deleted once learners have booked or reviewed them.',
}
const PAUSE_INSTEAD = ' Pause it to take it off ReadTraining.'
/** The refusal for a course deleteBlock blocks (a live course is pointed to Pause). */
export const deleteRefusal = (block: keyof typeof DELETE_REFUSED, status: Course['status']) => DELETE_REFUSED[block] + (block === 'in_use' && status === 'live' ? PAUSE_INSTEAD : '')

// the name typed to confirm deleting a course that has been live: the same as its title, ignoring spaces around it and case
const sameName = (typed: string, title: string) => typed.trim().toLowerCase() === title.trim().toLowerCase()

// the rule for a shared course page (and the default): one that has been live is never deleted
const neverLive = async (_tx: Tx, now: Course) => {
  if (now.publishedAt) throw new TRPCError({ code: 'CONFLICT', message: 'A course that has been live can’t be deleted. Pause it instead.' })
  return {}
}

/**
 * Deletes a course with its dates, lists, images and any change waiting for approval (they go with the course's row). `allowed`
 * runs under the course's row lock and throws when it may not be deleted (by default, when it has been live: the rule for shared
 * course pages); what it returns joins the log line. Returns the course as it was deleted.
 */
export async function deleteCourse(db: typeof Db, course: Course, onLog: OnLog, allowed: (tx: Tx, now: Course) => Promise<Record<string, unknown>> = neverLive) {
  const { paths, now } = await db.transaction(async (tx) => {
    // checked under the row lock: a second delete, an approval or a staff booking at the same moment sees the other's result
    const now = await lockCourse(tx, course.id)
    if (!now) throw new TRPCError({ code: 'CONFLICT', message: 'This course has already been deleted.' })
    const more = await allowed(tx, now)
    const paths = await tx.select({ path: courseImages.path }).from(courseImages).where(eq(courseImages.courseId, course.id))
    await tx.delete(courses).where(eq(courses.id, course.id))
    await onLog(tx, { title: now.title, ...more })
    return { paths, now }
  })
  await removeUnusedImages(db, paths.map((i) => i.path))
  return now
}

const log = (tx: Writer, ctx: { user: { id: string }; ip: string | null }, organisationId: string, action: string, courseId: number, metadata: Record<string, unknown> = {}) =>
  logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'provider', organisationId, action, targetType: 'course', targetId: String(courseId), metadata, ip: ctx.ip })

// The course's status as it stands now, with the row locked until the transaction ends. An admin deciding on the course locks
// the same row (modules/admin/courses.mts), so a provider's edit and an admin's decision at the same moment take turns: the edit
// either lands first (the course's sent time moves on and the decision is refused) or after (it goes in as a change to the live course).
// ---- versions: two tabs or two people editing the same course ----------------------------------------------------------------
// A course's version is when it last changed: its own row, or the change to a live course waiting for approval, whichever is
// later. The editor sends the version its draft was loaded from (`seen`); a save over a newer one is refused, so neither person's
// work is silently overwritten. Every change the editor makes itself returns the new version, so its next save isn't refused.
export const CHANGED_SINCE_OPENED =
  'This course was changed somewhere else (in another tab, or by someone else) since you opened it. Your changes are not saved. Copy anything you want to keep, then load the latest version.'

/** The course's version (ISO time), as the editor sends it back in `seen`. */
export async function courseVersion(db: Writer, courseId: number) {
  const [[c], [r]] = await Promise.all([
    db.select({ at: courses.updatedAt }).from(courses).where(eq(courses.id, courseId)),
    db.select({ at: courseRevisions.submittedAt }).from(courseRevisions).where(and(eq(courseRevisions.courseId, courseId), eq(courseRevisions.status, 'pending'))),
  ])
  const t = Math.max(c?.at?.getTime() ?? 0, r?.at?.getTime() ?? 0)
  return t ? new Date(t).toISOString() : null
}

/** Refuses the save when the course changed after the version the editor loaded (call it holding the course's row lock). */
export async function refuseIfChanged(db: Writer, courseId: number, seen: string | undefined) {
  if (!seen) return
  const now = await courseVersion(db, courseId)
  if (now && new Date(now).getTime() > new Date(seen).getTime()) throw new TRPCError({ code: 'CONFLICT', message: CHANGED_SINCE_OPENED })
}

/** `seen` in an editor call's input: the version the editor's draft was loaded from. */
export const seenVersion = z.string().datetime().optional()

/** The whole course row as it stands now, locked until the transaction ends (as lockStatus); null when it has been deleted. */
async function lockCourse(tx: Writer, courseId: number) {
  const [row] = await tx.select().from(courses).where(eq(courses.id, courseId)).for('update')
  return row ?? null
}

async function lockStatus(tx: Writer, courseId: number) {
  const [row] = await tx.select({ status: courses.status }).from(courses).where(eq(courses.id, courseId)).for('update')
  return row?.status ?? 'draft'
}

// The learning options and the self-paced option's price, from an editor save (`direct`) onto `directSet`, checked against the
// course as it stands (`now`, its row locked): the primary is one of the options and one taking bookings; an option newly turned
// on (or a new primary) is one still offered in Catalogue settings, while one already on that has since been retired may stay so
// other changes save; a dated option with upcoming dates can't be turned off until they are cancelled (its new bookings can be
// stopped instead: setOptionOpen; a date added at the same moment locks the same row first, modules/provider/schedule.mts); an
// option turned off is no longer one not taking bookings; and only the self-paced option has a price or price plan of its own,
// so turning it off clears them, and a live course offering it needs one.
async function setLearningOptions(tx: Tx, now: Course, direct: Record<string, unknown>, directSet: Partial<typeof courses.$inferInsert>, organisationId: string, isLive: boolean) {
  const methodsAfter = direct.methods !== undefined ? inOrder(direct.methods as string[]) : now.methods
  if (direct.methods !== undefined || direct.method !== undefined) {
    const methodAfter = (direct.method as string | undefined) ?? now.method
    if (!methodAfter || !methodsAfter.includes(methodAfter)) throw bad('Make the primary learning option one of the ways this course is offered.', 'method')
    if (methodAfter !== now.method && now.closedMethods.includes(methodAfter)) throw bad(`Take bookings again for ${await methodLabel(tx, methodAfter)} before making it the main way.`, 'method')
    const added = methodsAfter.filter((m) => !now.methods.includes(m))
    await resolveCatalogue(tx, { methods: methodAfter === now.method ? added : [...added, methodAfter] })
    const removed = now.methods.filter((m) => !methodsAfter.includes(m) && isDated(m))
    if (removed.length) {
      const [busy] = await tx.execute<{ name: string; n: number }>(sql`
        select (select name from public.delivery_methods where slug = k.method) name, count(*)::int n
        from public.cohorts k
        where k.course_id = ${now.id} and k.method in (${sql.join(removed.map((m) => sql`${m}`), sql`, `)}) and k.cancelled_at is null and k.ends_on >= ${ukToday()}::date
        group by k.method order by k.method limit 1`)
      if (busy) throw bad(`${busy.name} has ${busy.n} upcoming ${busy.n === 1 ? 'date' : 'dates'}. Stop new bookings instead, or cancel ${busy.n === 1 ? 'it' : 'them'} first.`, 'methods')
    }
    directSet.method = methodAfter
    directSet.methods = methodsAfter
    // an option turned off leaves the ones not taking bookings (turned on again later, it takes bookings)
    const closedAfter = now.closedMethods.filter((m) => methodsAfter.includes(m))
    if (closedAfter.length !== now.closedMethods.length) directSet.closedMethods = closedAfter
  }
  const selfPaced = methodsAfter.includes('self-paced')
  if (direct.planId !== undefined) {
    if (direct.planId === null) directSet.planId = null
    else if (!selfPaced) throw bad('Only the self-paced option has a price plan of its own: dates choose theirs.', 'planId')
    else {
      const plan = await usablePlan(tx, organisationId, direct.planId as string, now.planId)
      Object.assign(directSet, { planId: plan.id, pricePence: plan.from.pricePence })
    }
  }
  if (direct.pricePence !== undefined && !directSet.planId) directSet.pricePence = direct.pricePence as number | null
  // classroom and live online are priced on their dates: without the self-paced option the course has no price of its own
  if (!selfPaced && (now.pricePence !== null || now.planId !== null || 'pricePence' in directSet || 'planId' in directSet)) Object.assign(directSet, { pricePence: null, planId: null })
  // a live course offering self-paced shows its price: turning the option on (or clearing its price) needs one
  const priceAfter = directSet.pricePence !== undefined ? directSet.pricePence : now.pricePence
  if (isLive && selfPaced && priceAfter === null) throw bad('Enter the price for the self-paced option: a live course offering it needs one.', 'price')
}

/** A learning option's name as Catalogue settings has it ("Live online"). */
async function methodLabel(db: Writer, slug: string) {
  const [m] = await db.select({ name: deliveryMethods.name }).from(deliveryMethods).where(eq(deliveryMethods.slug, slug))
  return m?.name ?? slug
}

// The gear's "Withdraw from review": back to a draft, out of the admins' approvals list.
async function leaveReview(tx: Writer, ctx: { user: { id: string }; ip: string | null }, organisationId: string, course: { id: number; status: string }) {
  if (course.status !== 'pending') return false
  await tx.update(courses).set({ status: 'draft', updatedAt: new Date() }).where(eq(courses.id, course.id))
  await log(tx, ctx, organisationId, 'course.review_withdrawn', course.id)
  return true
}
// A change to a course waiting for review keeps it waiting, as the version our team decides on: its sent time moves on, so an
// admin who opened the earlier version is refused and reloads (`seen` in admin.courses.decide), and whoever made the change counts
// as asking for the decision (requesters in modules/admin/courses.mts). ReadTraining staff fixing it are the reviewers: their change
// leaves it as it was sent (logged as theirs, and the provider is told), so one of them may still approve it.
async function keepInReview(tx: Writer, ctx: { user: { id: string }; ip: string | null; staff?: unknown }, organisationId: string, course: { id: number; status: string }) {
  if (course.status !== 'pending' || ctx.staff) return
  await tx.update(courses).set({ submittedAt: new Date(), updatedAt: new Date() }).where(eq(courses.id, course.id))
  await log(tx, ctx, organisationId, 'course.edited_in_review', course.id)
}

export const providerCoursesRouter = createTRPCRouter({
  // Every course of this provider, last edited first, with what the course list shows: when it was last sent for approval
  // (`submittedAt`); the first day of its next date (`nextDate`, YYYY-MM-DD, a date running now included); a draft's (or a course sent back's) editor steps still to finish (`stepsLeft`, null on the others); and for its ⋮ menu, Pause or Put
  // back live, and Delete with deleteBlock's reason when it can't be deleted.
  list: orgProcedure('provider.courses.view').query(async ({ ctx, input }) => {
    const rows = await ctx.db.execute<{ id: number; title: string; slug: string; status: Course['status']; status_note: string | null; published_at: string | null; method: string | null; methods: string[]; closed_methods: string[]; model: string; category: string | null; subcategory: string | null; is_public: boolean; listed: boolean; updated_at: string; submitted_at: string | null; parent: string | null; cover: string | null; upcoming: number; next_on: string | null; pending_change: boolean; has_title: boolean; has_summary: boolean; has_description: boolean; filed: boolean; has_level: boolean; has_compliance: boolean; outcomes: number; has_units: boolean; priced: boolean; dates_ok: boolean; used: boolean }>(sql`
      select c.id, c.title, c.slug, c.status, c.status_note, c.published_at, c.method, c.methods, c.closed_methods, c.model, c.is_public, c.listed, c.updated_at,
             -- when it was last sent for approval (edits made while it waits move submitted_at, the version, but not this)
             coalesce((select max(l.at) from public.activity_log l where l.action = 'course.submitted' and l.target_type = 'course' and l.target_id = c.id::text), c.submitted_at) submitted_at,
             (select slug from public.categories where id = c.category_id) category,
             (select slug from public.subcategories where id = c.subcategory_id) subcategory,
             (select p.title from public.courses p where p.id = c.parent_id) parent,
             (select i.path from public.course_images i where i.course_id = c.id order by i.position limit 1) cover,
             (select count(*)::int from public.cohorts k where k.course_id = c.id and k.cancelled_at is null and k.ends_on >= ${ukToday()}::date) upcoming,
             (select min(k.starts_on)::text from public.cohorts k where k.course_id = c.id and k.cancelled_at is null and k.ends_on >= ${ukToday()}::date) next_on,
             exists (select 1 from public.course_revisions r where r.course_id = c.id and r.status = 'pending') pending_change,
             btrim(c.title) <> '' has_title, length(btrim(coalesce(c.summary, ''))) >= ${MIN_TEXT.summary} has_summary, length(btrim(coalesce(c.description, ''))) >= ${MIN_TEXT.description} has_description,
             c.category_id is not null and c.subcategory_id is not null filed, c.level is not null has_level, c.compliance is not null has_compliance, cardinality(c.outcomes) outcomes,
             exists (select 1 from public.course_units u where u.course_id = c.id) has_units, c.price_pence is not null or c.plan_id is not null priced,
             not exists (select 1 from unnest(c.methods) m where m in ('classroom', 'live-online') and m <> all(c.closed_methods)
               and not exists (select 1 from public.cohorts k where k.course_id = c.id and k.method = m and k.cancelled_at is null and k.bookable and k.starts_on > ${ukToday()}::date)) dates_ok,
             exists (select 1 from public.orders o where o.provider_id = c.organisation_id and o.course_id = c.id) or exists (select 1 from public.reviews v where v.course_id = c.id) used
      from public.courses c
      where c.organisation_id = ${input.organisationId}::uuid and c.kind = 'provider'
      order by c.updated_at desc`)
    return rows.map((r) => ({
      id: r.id, title: r.title, slug: r.slug, status: r.status, statusNote: r.status_note, publishedAt: r.published_at, method: r.method, methods: r.methods, closedMethods: r.closed_methods, model: r.model, category: r.category, subcategory: r.subcategory, isPublic: r.is_public, listed: r.listed,
      // ISO times: the database's own text form ("2026-11-14 11:46:40.1+00") isn't a date every browser reads
      updatedAt: new Date(r.updated_at).toISOString(), submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null, parent: r.parent, coverUrl: mediaUrl(r.cover), upcomingCohorts: r.upcoming, nextDate: r.next_on, pendingChange: r.pending_change,
      stepsLeft: r.status === 'draft' || r.status === 'changes'
        ? stepsLeft({ title: r.has_title, summary: r.has_summary, description: r.has_description, filed: r.filed, level: r.has_level, compliance: r.has_compliance, images: Boolean(r.cover), outcomes: r.outcomes, units: r.has_units, method: r.method, methods: r.methods, priced: r.priced, datesOk: r.dates_ok })
        : null,
      deleteBlock: blockFor({ status: r.status, statusNote: r.status_note }, r.used),
    }))
  }),

  get: orgProcedure('provider.courses.view')
    .input(z.object({ courseId: id }))
    .query(async ({ ctx, input }) => courseDetail(ctx.db, await ownCourse(ctx.db, input.organisationId, input.courseId))),

  // The course's page as learners will see it once it is live (the editor's Preview): the public page's own data, for this
  // provider's course whatever its status, with its dates, and with a change still waiting for approval shown as if approved.
  preview: orgProcedure('provider.courses.view')
    .input(z.object({ courseId: id }))
    .query(async ({ ctx, input }) => {
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      const [rev] = await ctx.db.select({ content: courseRevisions.content }).from(courseRevisions).where(and(eq(courseRevisions.courseId, course.id), eq(courseRevisions.status, 'pending')))
      return loadCoursePage(ctx.db, '', { id: course.id, pending: (rev?.content as Record<string, unknown> | undefined) ?? null })
    }),

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

  // The new-course wizard: a title, the catalogue place (category and sub-category: the topic is chosen by our team when they
  // approve the course, admin.courses.decide), the course type (compliance or not), how it is taught (its primary learning option,
  // the only one to start with), the model and Skill Saver. Starts as a draft; the editor fills in the rest.
  create: orgProcedure('provider.courses.edit')
    .input(
      z.object({
        title: content.title,
        category: content.category,
        subcategory: content.subcategory,
        compliance: content.compliance,
        method: settings.method,
        model: settings.model,
        skillSaver: settings.skillSaver,
      }),
    )
    .mutation(async ({ ctx, input, path }) => {
      await notForStaff(ctx, 'provider.courses.edit', input.organisationId, path)
      refuseLongTitle(input.title)
      if (input.model === 'enquiries') throw bad(ENQUIRIES_LATER, 'model')
      taughtAll([input.method])
      const resolved = await resolveCatalogue(ctx.db, { category: input.category, subcategory: input.subcategory, topic: null, method: input.method })
      const parentId = await placeOn(ctx.db, { subcategoryId: resolved.subcategoryId ?? null, topicId: resolved.topicId ?? null })
      const slug = await courseSlug(ctx.db, input.title)
      return ctx.db.transaction(async (tx) => {
        const [made] = await tx
          .insert(courses)
          .values({ kind: 'provider', organisationId: input.organisationId, parentId, slug, title: input.title, ...resolved, compliance: input.compliance, methods: [input.method], model: input.model, skillSaver: input.skillSaver, createdBy: ctx.user.id })
          .returning({ id: courses.id })
        await log(tx, ctx, input.organisationId, 'course.created', made.id, { title: input.title, parentId, compliance: input.compliance })
        return { id: made.id }
      })
    }),

  // The Courses list's "Duplicate course": a new draft, "Copy of …", with the course as its editor shows it (a change waiting for
  // approval included): its words, lists, catalogue place, level, learning options, model, Skill Saver, price, search words,
  // shared course page (while that page is live and still the same subject) and pictures with their descriptions. Not its dates,
  // orders, reviews, changes or status, and every learning option of the copy takes bookings (one the original stopped is about
  // the original's dates, which the copy doesn't have). Each picture is copied into the new course's own folder, so deleting either course (or
  // removing a picture from one) never touches the other's files.
  duplicate: orgProcedure('provider.courses.edit')
    .input(z.object({ courseId: id }))
    .mutation(async ({ ctx, input, path }) => {
      await notForStaff(ctx, 'provider.courses.edit', input.organisationId, path)
      const { organisationId } = input
      const source = await ownCourse(ctx.db, organisationId, input.courseId)
      const [pics] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(courseImages).where(eq(courseImages.courseId, source.id))
      // copying pictures stores new files: counted with the uploads
      if (pics.n) {
        await limit(ctx, 'uploadHour')
        await limit(ctx, 'uploadDay')
      }
      const copied: string[] = [] // the new files, removed again if the copy isn't saved
      try {
        return await ctx.db.transaction(async (tx) => {
          // the course is locked while it is copied, so a change saved at the same moment (a picture removed and its file deleted)
          // waits for the copy, and the copy is of one version
          const now = await lockCourse(tx, source.id)
          if (!now) throw notFound()
          const [[rev], units, exams, faqs, images] = await Promise.all([
            tx.select({ content: courseRevisions.content }).from(courseRevisions).where(and(eq(courseRevisions.courseId, now.id), eq(courseRevisions.status, 'pending'))),
            tx.select().from(courseUnits).where(eq(courseUnits.courseId, now.id)).orderBy(asc(courseUnits.position)),
            tx.select().from(courseExams).where(eq(courseExams.courseId, now.id)).orderBy(asc(courseExams.position)),
            tx.select().from(courseFaqs).where(eq(courseFaqs.courseId, now.id)).orderBy(asc(courseFaqs.position)),
            tx.select().from(courseImages).where(eq(courseImages.courseId, now.id)).orderBy(asc(courseImages.position)),
          ])
          const p = (rev?.content ?? {}) as Partial<Record<(typeof REVIEWED)[number], unknown>>
          const pick = <T,>(k: (typeof REVIEWED)[number], saved: T) => (p[k] !== undefined ? (p[k] as T) : saved)
          const subject = p.category !== undefined ? await subjectOf(tx, p, now.topicId) : { categoryId: now.categoryId, subcategoryId: now.subcategoryId, topicId: now.topicId }
          // the shared course page stays only while it is live and the same subject (as choosing one in the gear requires)
          const [page] = now.parentId ? await tx.select({ subcategoryId: courses.subcategoryId, topicId: courses.topicId }).from(courses).where(and(eq(courses.id, now.parentId), eq(courses.kind, 'shared'), eq(courses.status, 'live'))) : []
          // an archived price plan isn't chosen again: the copy then has no price until one is set
          const [plan] = now.planId ? await tx.select({ archivedAt: pricePlans.archivedAt }).from(pricePlans).where(eq(pricePlans.id, now.planId)) : []
          const keepPlan = Boolean(plan && !plan.archivedAt)
          const title = `Copy of ${pick('title', now.title)}`.slice(0, 80).trim()
          const [made] = await tx
            .insert(courses)
            .values({
              kind: 'provider',
              organisationId,
              parentId: page && sameSubject(page, subject) ? now.parentId : null,
              slug: await courseSlug(tx, title),
              title,
              summary: pick('summary', now.summary),
              description: pick('description', now.description),
              audience: pick('audience', now.audience),
              entryRequirements: pick('entryRequirements', now.entryRequirements),
              syllabusIntro: pick('syllabusIntro', now.syllabusIntro),
              examsIntro: pick('examsIntro', now.examsIntro),
              outcomes: pick('outcomes', now.outcomes),
              features: pick('features', now.features),
              ...subject,
              level: pick('level', now.level),
              compliance: pick('compliance', now.compliance),
              method: now.method,
              methods: now.methods,
              model: now.model,
              skillSaver: now.skillSaver,
              isPublic: now.isPublic,
              listed: now.listed,
              pricePence: now.planId && !keepPlan ? null : now.pricePence,
              planId: keepPlan ? now.planId : null,
              videoUrl: pick('videoUrl', now.videoUrl) || null,
              seoTitle: now.seoTitle,
              seoDescription: now.seoDescription,
              seoKeywords: now.seoKeywords,
              createdBy: ctx.user.id,
            })
            .returning({ id: courses.id })
          await writeLists(tx, made.id, {
            units: pick('units', units.map((u) => ({ title: u.title, body: u.body }))),
            exams: pick('exams', exams.map((e) => ({ unit: e.unit, passMark: e.passMark, duration: e.duration, assessment: e.assessment }))),
            faqs: pick('faqs', faqs.map((f) => ({ question: f.question, answer: f.answer }))),
          })
          if (images.length) {
            const folder = imageFolder({ ...now, id: made.id })
            const paths = await Promise.all(images.map((i) => copyMedia(i.path, folder)))
            copied.push(...paths.filter((x): x is string => Boolean(x)))
            if (copied.length < images.length) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'We couldn’t copy the course’s pictures. Please try again.' })
            await tx.insert(courseImages).values(images.map((i, n) => ({ courseId: made.id, position: i.position, path: paths[n]!, alt: i.alt })))
          }
          await log(tx, ctx, organisationId, 'course.duplicated', made.id, { from: now.id, title })
          return { id: made.id }
        })
      } catch (error) {
        await removeMedia(copied)
        throw error
      }
    }),

  // Save the editor. Any of the fields; the lists replace what was there. On a live or paused course the reviewed content waits
  // for approval (returned as `pendingChange: true`); the rest applies at once.
  update: orgProcedure('provider.courses.editPage')
    .input(
      z.object({
        courseId: id,
        seen: seenVersion,
        ...Object.fromEntries(Object.entries(content).map(([k, v]) => [k, (v as z.ZodTypeAny).optional()])),
        ...Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, (v as z.ZodTypeAny).optional()])),
      }) as z.ZodType<{ courseId: number; seen?: string } & Partial<Record<keyof typeof content | keyof typeof settings, unknown>>>,
    )
    .mutation(async ({ ctx, input, path }) => {
      const { organisationId, courseId, seen, ...fields } = input as { organisationId: string; courseId: number; seen?: string } & Record<string, unknown>
      // the topic is our team's choice (when they approve the course, admin.courses.decide; or staff editing it here), never the
      // provider's: one they send is ignored
      if (!ctx.staff) delete fields.topic
      const keys = Object.keys(fields).filter((k) => fields[k] !== undefined)
      // nothing to save: the editor keeps the version it had (handing it a newer one would hide a change made elsewhere)
      if (!keys.length) return { ok: true, pendingChange: false, version: seen ?? (await courseVersion(ctx.db, courseId)) }
      // page wording and search fields: course editors and marketing; anything else needs full course editing; prices need pricing
      if (keys.some((k) => !PAGE_ONLY.has(k)) && !can(ctx.actor, 'provider.courses.edit', { organisationId })) await refuse(ctx, 'provider.courses.edit', organisationId, path)
      if (keys.some((k) => PRICING.has(k)) && !can(ctx.actor, 'provider.pricing.edit', { organisationId })) await refuse(ctx, 'provider.pricing.edit', organisationId, path)
      const course = await ownCourse(ctx.db, organisationId, courseId)
      // the category, sub-category and topic change together (the editor always sends all three), so a course is never filed
      // under one category with another's sub-category
      refuseLongTitle(fields.title, course.title)
      if (fields.subcategory !== undefined && fields.category === undefined) throw bad('Choose the category with the sub-category.', 'category')
      if (fields.category !== undefined && fields.subcategory === undefined) throw bad('Choose a sub-category for this category.', 'subcategory')
      if (fields.topic !== undefined && fields.subcategory === undefined) throw bad('Choose the sub-category with the topic.', 'subcategory')

      // the learning options are the taught ways only (checked against the course as it stands in the transaction below)
      if (fields.methods !== undefined) taughtAll(fields.methods as string[])
      if (fields.method !== undefined) taughtAll([fields.method as string])
      const reviewed = Object.fromEntries(keys.filter((k) => (REVIEWED as readonly string[]).includes(k)).map((k) => [k, fields[k]]))
      const direct = Object.fromEntries(keys.filter((k) => !(REVIEWED as readonly string[]).includes(k)).map((k) => [k, fields[k]]))
      // check the catalogue choices now, so a pending change never holds an impossible one; a provider moving the course to another
      // sub-category leaves it without a topic (the old one belongs to the old sub-category) until our team chooses one at approval
      if (!ctx.staff && reviewed.subcategory !== undefined) {
        const moved = await resolveCatalogue(ctx.db, { category: reviewed.category as string, subcategory: reviewed.subcategory as string })
        if (moved.subcategoryId !== course.subcategoryId) reviewed.topic = null
      }
      const subject = Object.keys(reviewed).length ? await resolveCatalogue(ctx.db, { category: reviewed.category as string | undefined, subcategory: reviewed.subcategory as string | undefined, topic: reviewed.topic as string | null | undefined, level: reviewed.level as string | undefined }) : {}
      const subjectAfter = { subcategoryId: subject.subcategoryId ?? course.subcategoryId, topicId: subject.topicId !== undefined ? subject.topicId : course.topicId }
      const subjectChanged = subjectAfter.subcategoryId !== course.subcategoryId || subjectAfter.topicId !== course.topicId
      const directSet: Partial<typeof courses.$inferInsert> = {}
      for (const k of ['seoTitle', 'seoDescription'] as const) if (direct[k] !== undefined) directSet[k] = (direct[k] as string | null) || null
      if (direct.seoKeywords !== undefined) directSet.seoKeywords = [...new Set((direct.seoKeywords as string[]).map((w) => w.toLowerCase()))]
      // Enquiries (pay per lead) isn't offered yet: a course already on it keeps it, nothing new moves to it
      if (direct.model === 'enquiries' && course.model !== 'enquiries') throw bad(ENQUIRIES_LATER, 'model')
      for (const k of ['skillSaver', 'isPublic', 'model'] as const) if (direct[k] !== undefined) (directSet as Record<string, unknown>)[k] = direct[k]
      if (direct.isPublic !== undefined) directSet.listed = direct.isPublic as boolean // public or private sets both (see `settings`)
      // where it is listed follows its subject (placeOn): a draft's at once, below; a live course's when the change is approved

      const result = await ctx.db.transaction(async (tx) => {
        const now = await lockCourse(tx, courseId)
        if (!now) throw notFound()
        const status = now.status
        // saved over a newer version (another tab, or someone else): refused, nothing written
        await refuseIfChanged(tx, courseId, seen)
        const isLive = status === 'live' || status === 'paused'
        // a course waiting for review stays complete: what it had when sent can't be taken away while our team looks at it
        const before = status === 'pending' ? await missing(tx, now, { dates: false }) : []
        await setLearningOptions(tx, now, direct, directSet, organisationId, isLive)
        // where it is listed follows its subject: a draft's at once; a live course's when the change is approved, or at once when
        // ReadTraining staff change it (they are the approvers)
        if (subjectChanged && (!isLive || ctx.staff)) directSet.parentId = await placeOn(tx, subjectAfter)
        if (Object.keys(directSet).length) await tx.update(courses).set({ ...directSet, updatedAt: new Date() }).where(eq(courses.id, courseId))
        // a change our team checks is the new version of a waiting course (search and privacy settings leave it as it was sent)
        if (keys.some((k) => !KEEPS_REVIEW.has(k))) await keepInReview(tx, ctx, organisationId, { id: courseId, status })
        let pendingChange = false
        let newChange = false
        if (Object.keys(reviewed).length) {
          if (isLive && ctx.staff) {
            // ReadTraining staff change a live course at once (they are the approvers): not over the provider's change waiting
            // for approval (decide that first), and never leaving the course without something it needs to stay live
            const [open] = await tx.select({ id: courseRevisions.id }).from(courseRevisions).where(and(eq(courseRevisions.courseId, courseId), eq(courseRevisions.status, 'pending')))
            if (open) throw new TRPCError({ code: 'CONFLICT', message: 'The provider has a change to this course waiting for approval. Approve or turn it down first (Admin › Approvals), then make your change.' })
            const before = await missing(tx, now)
            await applyContent(tx, courseId, reviewed)
            const [applied] = await tx.select().from(courses).where(eq(courses.id, courseId))
            const lost = (await missing(tx, applied)).filter((gap) => !before.includes(gap))
            if (lost.length) throw new TRPCError({ code: 'CONFLICT', message: `With this change the live course would be missing ${lost.join(', ')}. Add it, then save.` })
            // staff moving a live course choose its topic as an approver would (a sub-category with topics needs one)
            if (subjectChanged && !applied.topicId && (await activeTopics(tx, applied.subcategoryId)).length) throw bad('Choose the topic this course is listed under.', 'topic')
          } else if (isLive) {
            const [open] = await tx.select().from(courseRevisions).where(and(eq(courseRevisions.courseId, courseId), eq(courseRevisions.status, 'pending')))
            if (open) await tx.update(courseRevisions).set({ content: { ...(open.content as object), ...reviewed }, submittedBy: ctx.user.id, submittedAt: new Date() }).where(eq(courseRevisions.id, open.id))
            else await tx.insert(courseRevisions).values({ courseId, content: reviewed, submittedBy: ctx.user.id })
            pendingChange = true
            newChange = !open
          } else await applyContent(tx, courseId, reviewed)
        }
        if (status === 'pending') {
          const [after] = await tx.select().from(courses).where(eq(courses.id, courseId))
          const lost = (await missing(tx, after, { dates: false })).filter((gap) => !before.includes(gap))
          if (lost.length) throw bad(`A course waiting for review needs ${lost.join(', ')}. Add it back, or withdraw the course from review in Course settings first.`)
        }
        await log(tx, ctx, organisationId, pendingChange ? 'course.change_submitted' : 'course.updated', courseId, { fields: keys })
        return { ok: true, pendingChange, newChange, version: await courseVersion(tx, courseId) }
      })
      // a change to a live course: the admins who approve are told once, when it starts (later saves add to the same change)
      if (result.newChange) {
        afterAnswer(async () => {
          const { provider } = await ownerOf(ctx.db, organisationId)
          await notifyApprovers(ctx.db, 'admin-course-change', { provider, course: course.title, courseId: String(courseId) }, { organisationId, targetType: 'course', targetId: String(courseId), action: 'email.approvers_told' }, ctx.user.id)
        })
      }
      return { ok: result.ok, pendingChange: result.pendingChange, version: result.version }
    }),

  // Withdraw a content change that is still waiting (the live course stays as it is).
  discardChange: orgProcedure('provider.courses.editPage')
    .input(z.object({ courseId: id, seen: seenVersion }))
    .mutation(async ({ ctx, input, path }) => {
      await notForStaff(ctx, 'provider.courses.editPage', input.organisationId, path)
      await ownCourse(ctx.db, input.organisationId, input.courseId)
      return ctx.db.transaction(async (tx) => {
        await lockStatus(tx, input.courseId)
        await refuseIfChanged(tx, input.courseId, input.seen)
        // the course's version moves on (it would otherwise fall back to before the change, and a tab still showing the change
        // could save it again unwarned)
        await tx.update(courses).set({ updatedAt: new Date() }).where(eq(courses.id, input.courseId))
        const gone = await tx.delete(courseRevisions).where(and(eq(courseRevisions.courseId, input.courseId), eq(courseRevisions.status, 'pending'))).returning({ id: courseRevisions.id })
        if (gone.length) await log(tx, ctx, input.organisationId, 'course.change_withdrawn', input.courseId)
        return { ok: true, version: await courseVersion(tx, input.courseId) }
      })
    }),

  // Images: an upload address, then addImage with the uploaded file; setImages keeps, orders and labels them (the first is the
  // cover) and deletes the ones left out.
  imageUploadUrl: orgProcedure('provider.courses.editPage')
    .input(z.object({ courseId: id, contentType: z.enum(Object.keys(IMAGE_TYPES) as [keyof typeof IMAGE_TYPES, ...(keyof typeof IMAGE_TYPES)[]]) }))
    .mutation(async ({ ctx, input }) => {
      await limit(ctx, 'uploadHour')
      await limit(ctx, 'uploadDay')
      return courseImageUploadUrl(await ownCourse(ctx.db, input.organisationId, input.courseId), input.contentType)
    }),

  addImage: orgProcedure('provider.courses.editPage')
    .input(z.object({ courseId: id, path: z.string().regex(MEDIA_PATH), alt: line(140, 'image description').optional(), seen: seenVersion }))
    .mutation(async ({ ctx, input }) => {
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      const added = await addCourseImage(ctx.db, course, input.path, input.alt, async (tx) => {
        const status = await lockStatus(tx, course.id)
        await refuseIfChanged(tx, course.id, input.seen) // changed in another tab since the editor loaded it: nothing is added
        await keepInReview(tx, ctx, input.organisationId, { id: course.id, status })
        await log(tx, ctx, input.organisationId, 'course.image_added', course.id)
      })
      return { ...added, version: await courseVersion(ctx.db, course.id) }
    }),

  setImages: orgProcedure('provider.courses.editPage')
    .input(z.object({ courseId: id, images: z.array(z.object({ id: z.string().uuid(), alt: line(140, 'image description') })).max(10), seen: seenVersion }))
    .mutation(async ({ ctx, input }) => {
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      const done = await setCourseImages(ctx.db, course, input.images, async (tx, m) => {
        const status = await lockStatus(tx, course.id)
        // changed in another tab since the editor loaded it (perhaps an image added there): nothing is changed or deleted
        await refuseIfChanged(tx, course.id, input.seen)
        await keepInReview(tx, ctx, input.organisationId, { id: course.id, status })
        await log(tx, ctx, input.organisationId, 'course.images_changed', course.id, m)
      })
      return { ...done, version: await courseVersion(ctx.db, course.id) }
    }),

  // Send a draft (or a course an admin asked to change) for approval, once nothing required is missing. Only an approved provider
  // sends: one still waiting for our approval can build its courses and dates, and sends them once it is approved.
  submit: orgProcedure('provider.courses.edit')
    .input(z.object({ courseId: id, seen: seenVersion }))
    .mutation(async ({ ctx, input, path }) => {
      await notForStaff(ctx, 'provider.courses.edit', input.organisationId, path)
      const org = ctx.actor.memberships.find((m) => m.organisationId === input.organisationId)
      if (org?.organisationStatus !== 'active') throw new TRPCError({ code: 'FORBIDDEN', message: 'Your provider account is waiting for our team’s approval. You can send courses for approval once it is approved.' })
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      await ctx.db.transaction(async (tx) => {
        // checked under the row lock, so a double click (or two people) sends it once, and its emails go once
        const now = await lockCourse(tx, course.id)
        if (!now) throw notFound()
        if (now.status !== 'draft' && now.status !== 'changes') throw new TRPCError({ code: 'CONFLICT', message: now.status === 'pending' ? 'This course is already waiting for approval.' : 'This course is already live.' })
        await refuseIfChanged(tx, course.id, input.seen) // what is sent is what this editor showed
        const gaps = await missing(tx, now)
        if (gaps.length) throw bad(`Add ${gaps.join(', ')} before sending it for approval.`)
        // filed under something no longer offered, it could never be approved: said now, not at approval
        const retired = await retiredEntries(tx, course.id)
        if (retired.length) throw bad(`${retired.join(', ')} ${retired.length === 1 ? 'is' : 'are'} no longer offered on ReadTraining. Choose another in the course editor, save, then send it for approval.`)
        await tx.update(courses).set({ status: 'pending', submittedAt: new Date(), statusNote: null, updatedAt: new Date() }).where(eq(courses.id, course.id))
        await log(tx, ctx, input.organisationId, 'course.submitted', course.id)
      })
      // the provider's owner hears it arrived (as they hear the decision), and the admins who approve that it is waiting
      afterAnswer(async () => {
        const { to, provider } = await ownerOf(ctx.db, input.organisationId)
        const vars = { provider, course: course.title, courseId: String(course.id) }
        const target = { organisationId: input.organisationId, targetType: 'course', targetId: String(course.id) }
        await Promise.all([
          notify(ctx.db, 'course-received', to, vars, { ...target, action: 'email.course_received_sent' }),
          notifyApprovers(ctx.db, 'admin-new-course', vars, { ...target, action: 'email.approvers_told' }, ctx.user.id),
        ])
      })
      return { ok: true, version: await courseVersion(ctx.db, course.id) }
    }),

  // Pause a live course (it leaves the site, its dates stay) or put it back live.
  setPaused: orgProcedure('provider.courses.edit')
    .input(z.object({ courseId: id, paused: z.boolean(), seen: seenVersion }))
    .mutation(async ({ ctx, input, path }) => {
      await notForStaff(ctx, 'provider.courses.edit', input.organisationId, path)
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      const from = input.paused ? 'live' : 'paused'
      return ctx.db.transaction(async (tx) => {
        const now = await lockCourse(tx, course.id)
        if (!now) throw notFound()
        if (now.status === (input.paused ? 'paused' : 'live')) throw new TRPCError({ code: 'CONFLICT', message: input.paused ? 'This course is already paused.' : 'This course is already live.' })
        if (now.status !== from) throw new TRPCError({ code: 'CONFLICT', message: input.paused ? 'Only a live course can be paused.' : 'This course isn’t paused.' })
        // a course our team paused (it has their reason) goes back live only through them
        if (!input.paused && now.statusNote) throw new TRPCError({ code: 'FORBIDDEN', message: 'Our team paused this course. Contact us to put it back live.' })
        await refuseIfChanged(tx, course.id, input.seen)
        await tx.update(courses).set({ status: input.paused ? 'paused' : 'live', updatedAt: new Date() }).where(eq(courses.id, course.id))
        if (!input.paused) await refuseRetired(tx, course.id, 'provider')
        await log(tx, ctx, input.organisationId, input.paused ? 'course.paused' : 'course.resumed', course.id)
        return { ok: true, version: await courseVersion(tx, course.id) }
      })
    }),

  // Stop new bookings for one learning option, or take bookings for it again: the option stays
  // one of the course's (`closed_methods`), its dates already booked still run and nothing is cancelled, but none of it is on sale
  // (the catalogue, the course page, new dates and staff bookings leave it out). Stopping the primary makes the first option still
  // taking bookings the primary; the last one taking bookings can't be stopped (that is pausing the course). It isn't reviewed
  // (like the learning options and prices) and applies at once; like them, it is a new version of a course waiting for review.
  setOptionOpen: orgProcedure('provider.courses.edit')
    .input(z.object({ courseId: id, method: z.enum(['classroom', 'live-online', 'self-paced']), open: z.boolean(), seen: seenVersion }))
    .mutation(async ({ ctx, input }) => {
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      return ctx.db.transaction(async (tx) => {
        // under the row lock: a date added, an option turned off or a staff booking at the same moment takes its turn
        const now = await lockCourse(tx, course.id)
        if (!now) throw notFound()
        await refuseIfChanged(tx, course.id, input.seen)
        const name = () => methodLabel(tx, input.method) // only for a message, so a change asks the database as little as it can
        if (!now.methods.includes(input.method)) throw bad(`${await name()} isn’t one of this course’s learning options.`)
        const closed = now.closedMethods
        const set: Partial<typeof courses.$inferInsert> = {}
        if (input.open) {
          if (!closed.includes(input.method)) throw new TRPCError({ code: 'CONFLICT', message: `${await name()} is already taking bookings.` })
          // a learning option retired in Catalogue settings since stays as it is: it can be turned off, not sold again
          if ((await retiredMethods(tx, course.id)).includes(input.method)) throw bad(`${await name()} is no longer offered on ReadTraining, so it can’t take bookings again.`)
          set.closedMethods = closed.filter((m) => m !== input.method)
        } else {
          if (closed.includes(input.method)) throw new TRPCError({ code: 'CONFLICT', message: `${await name()} is already not taking bookings.` })
          const open = inOrder(now.methods.filter((m) => m !== input.method && !closed.includes(m)))
          if (!open.length) throw bad('To stop all bookings, pause the course.')
          set.closedMethods = inOrder([...closed, input.method])
          if (now.method === input.method) set.method = open[0]
        }
        await tx.update(courses).set({ ...set, updatedAt: new Date() }).where(eq(courses.id, course.id))
        await keepInReview(tx, ctx, input.organisationId, now)
        await log(tx, ctx, input.organisationId, input.open ? 'course.option_reopened' : 'course.option_stopped', course.id, { method: input.method, ...(set.method ? { primary: set.method } : {}) })
        return { ok: true, method: set.method ?? now.method, closedMethods: set.closedMethods!, version: await courseVersion(tx, course.id) }
      })
    }),

  // Take a course that is waiting for our team's review back to a draft (the gear's "Withdraw from review"), to delete it or rework it as a draft.
  // It leaves the admins' approvals list; a decision they then try is refused (modules/admin/courses.mts).
  withdrawReview: orgProcedure('provider.courses.edit')
    .input(z.object({ courseId: id, seen: seenVersion }))
    .mutation(async ({ ctx, input, path }) => {
      await notForStaff(ctx, 'provider.courses.edit', input.organisationId, path)
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      return ctx.db.transaction(async (tx) => {
        // under the row lock, so an admin deciding at the same moment either decides first (and this is refused) or is refused
        const now = await lockCourse(tx, course.id)
        if (!now) throw notFound()
        if (now.status !== 'pending') throw new TRPCError({ code: 'CONFLICT', message: now.status === 'live' ? 'Our team has just approved this course: it is live.' : now.status === 'changes' ? 'Our team has just asked for changes to this course, so it is back with you.' : 'This course isn’t waiting for review.' })
        await refuseIfChanged(tx, course.id, input.seen)
        await leaveReview(tx, ctx, input.organisationId, now)
        return { ok: true, version: await courseVersion(tx, course.id) }
      })
    }),

  // Delete a course, with its dates, lists, images and any change waiting for approval: a draft or a course our team asked to
  // change, or one that has been live while nobody has booked or reviewed it (its name typed in `confirmTitle`; the admins who
  // approve are told). One waiting for review is withdrawn first. One our team has paused stays while it is paused. One learners
  // have booked or reviewed is paused instead, so its history stays. (deleteBlock)
  remove: orgProcedure('provider.courses.delete')
    .input(z.object({ courseId: id, confirmTitle: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ownCourse(ctx.db, input.organisationId, input.courseId)
      const deleted = await deleteCourse(
        ctx.db,
        course,
        (tx, m) => log(tx, ctx, input.organisationId, 'course.deleted', course.id, m),
        async (tx, now) => {
          const block = await deleteBlock(tx, now)
          if (block) throw new TRPCError({ code: 'CONFLICT', message: deleteRefusal(block, now.status) })
          const wasLive = hasBeenLive(now)
          if (wasLive && !input.confirmTitle?.trim()) throw bad('Type the course name to confirm.', 'confirmTitle')
          if (wasLive && !sameName(input.confirmTitle!, now.title)) throw bad('That isn’t this course’s name. Type it as it is shown above.', 'confirmTitle')
          return { status: now.status, wasLive }
        },
      )
      // a course that was live has left the site: the admins who approve are told, after the delete is saved and never holding it up
      if (hasBeenLive(deleted)) afterAnswer(async () => {
        try {
          const [[org], who] = await Promise.all([
            ctx.db.execute<{ name: string; slug: string }>(sql`select name, slug from public.organisations where id = ${input.organisationId}::uuid`),
            personOf(ctx.db, ctx.user.id),
          ])
          const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date())
          await notifyApprovers(ctx.db, 'admin-course-deleted', { provider: org?.name ?? '', slug: org?.slug ?? '', course: deleted.title, deletedBy: who?.label ?? 'Someone on their team', date }, { organisationId: input.organisationId, targetType: 'course', targetId: String(course.id), action: 'email.approvers_told' }, ctx.user.id)
        } catch (error) {
          console.error('email admin-course-deleted: could not tell the admins', error instanceof Error ? error.message : error)
        }
      })
      return { ok: true }
    }),
})
