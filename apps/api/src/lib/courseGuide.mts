import { z } from 'zod'

import { courseGuides, eq } from '@readtraining/db'

import type { db as Db } from './db.mjs'

// A shared course page's guide (table course_guides): the sections ReadTraining writes for its page beyond a course's own fields
// (the syllabus intro, the exam table's text and Assessment column are the course's own: courses.syllabus_intro, exams_intro,
// course_exams.assessment). A shared page lists every provider's dates, so it holds only what is true whichever provider runs
// the course: never a price, a package or a bundle (those are each provider's own: its dates and price plans). Every section is
// optional and is left off the page when the guide hasn't got it. The cost table is information, worked out from live prices:
// the course row from the page's live dates, the first aid row from the live Emergency First Aid at Work courses, and the licence
// fee from the site's (Site content `licenceFees`, by its key), so none of them can go out of date. The team training section's words are the site's too (Site
// content `teamTraining`): a guide only switches it on. The editor shows each section in the step for its part of the page
// (CourseGuideEditor.jsx), and the course page shows it in its own part (apps/web/components/courseDetail/CourseGuide.jsx).

const str = (max: number) => z.string().trim().max(max)
const need = (max: number, what: string) => z.string().trim().min(1, `Write the ${what}.`).max(max, `Keep the ${what} to ${max} characters.`)
const opt = (max: number) => str(max).optional().transform((v) => v || undefined)
const lines = (max: number, most: number) => z.array(need(max, 'line')).max(most)

const titled = { title: need(120, 'section heading') }

export const guideSchema = z
  .object({
    // the hero's heading (the course keeps its own name everywhere else), and short lines in the hero under its buttons
    heroTitle: opt(120),
    trust: lines(60, 6).optional(),
    compare: z.object({ ...titled, intro: opt(600), columns: lines(60, 5).min(2), rows: z.array(z.object({ label: need(120, 'row label'), cells: lines(80, 4) })).min(1).max(20), note: opt(400) }).optional(),
    week: z.object({ ...titled, items: z.array(z.object({ day: need(40, 'day'), text: need(200, 'text') })).min(1).max(10), note: opt(300) }).optional(),
    included: z.object({ ...titled, items: lines(160, 15).min(1) }).optional(),
    // the team training section, in the site's own words (Site content teamTraining): shown when switched on
    business: z.literal(true).optional(),
    // steps (how to get or renew the licence), with a tip under them
    licence: z.object({ ...titled, steps: z.array(z.object({ title: need(80, 'step'), text: need(400, 'step text') })).min(1).max(10), note: opt(400) }).optional(),
    costs: z
      .object({
        ...titled,
        intro: opt(400),
        courseLabel: opt(80),
        // the first aid row: its label only; its price is the lowest live price of Emergency First Aid at Work (the course page
        // works it out from the catalogue, and leaves the row out while none is live)
        firstAid: z.object({ label: need(80, 'first aid label') }).optional(),
        // the fee is the site's (Site content licenceFees), by its key; the label is this table's own
        licenceFee: z.object({ label: need(80, 'licence fee label'), fee: z.string().regex(/^[a-z0-9-]{1,40}$/, 'Choose the licence fee.') }).optional(),
        rows: z.array(z.object({ label: need(80, 'cost'), value: need(60, 'price') })).max(6).default([]),
        note: opt(400),
      })
      .optional(),
    careers: z.object({ ...titled, text: need(800, 'text'), areas: lines(120, 12).default([]), roles: opt(400), cta: opt(40), href: opt(200) }).optional(),
  })
  .strict()

export type CourseGuide = z.infer<typeof guideSchema>

// the sections' names as the Course guide step shows them, for its error messages
const SECTION_NAMES: Record<string, string> = {
  heroTitle: 'Main heading', trust: 'Trust strip', compare: 'Comparison table', week: 'Course week', included: "What's included",
  business: 'Team training', licence: 'Licence steps', costs: 'Cost table', careers: 'Careers',
}
const ITEM_NAMES: Record<string, string> = {
  'week.items': 'day',
  trust: 'line', rows: 'row', items: 'item', steps: 'step', cells: 'cell', columns: 'column', areas: 'area',
}

// the fields' names as the editor labels them, for "Fill in the …" when one is left empty
const FIELD_NAMES: Record<string, string> = {
  title: 'heading', name: 'name', text: 'text', label: 'label', day: 'day', cells: 'cells', columns: 'column headings', items: 'items', steps: 'steps',
  fee: 'licence fee', value: 'price', rows: 'rows',
}

/** The first problem in a guide, worded for the person editing it: where it is, then what to do. */
export function guideProblem(error: z.ZodError) {
  const issue = error.issues[0]
  if (!issue) return 'Check the course guide and try again.'
  const where: string[] = []
  issue.path.forEach((p, i) => {
    if (i === 0) where.push(SECTION_NAMES[String(p)] ?? String(p))
    else if (typeof p === 'number') where.push(`${ITEM_NAMES[`${String(issue.path[0])}.${String(issue.path[i - 1])}`] ?? ITEM_NAMES[String(issue.path[i - 1])] ?? 'item'} ${p + 1}`)
  })
  // a field left empty arrives missing (the editor leaves out empty words): name what to fill in
  const last = String(issue.path[issue.path.length - 1] ?? '')
  const missingField = issue.code === 'invalid_type' && issue.received === 'undefined'
  const message = issue.code === 'too_small' && issue.type === 'array' ? 'Add at least one.' : issue.code === 'unrecognized_keys' ? 'This section is not part of a course guide.' : missingField ? `Fill in the ${FIELD_NAMES[last] ?? 'missing field'}.` : issue.message
  return `${where.join(' › ')}: ${message}`
}

/** A page's guide, or null. A guide saved before a rule changed is read as it is, never thrown away. */
export async function loadGuide(db: typeof Db, courseId: number): Promise<CourseGuide | null> {
  const [g] = await db.select({ content: courseGuides.content }).from(courseGuides).where(eq(courseGuides.courseId, courseId))
  return (g?.content as CourseGuide | undefined) ?? null
}
