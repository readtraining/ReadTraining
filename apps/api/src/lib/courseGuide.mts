import { z } from 'zod'

import { courseGuides, eq } from '@readtraining/db'

import type { db as Db } from './db.mjs'

// A shared course page's guide (table course_guides): the sections ReadTraining writes for it beyond a course's own fields. Every
// section is optional and is left off the page when the guide hasn't got it. Prices are never typed here: a package is the date's
// own price plus its `add` (pounds; none yet: shown as not set, and not offered when booking), and the cost table is worked out from the page's live dates, so they can't go out of date. The course page shows each section in its own part (apps/web/components/courseDetail/CourseGuide.jsx).

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
    unitsIntro: opt(600),
    week: z.object({ ...titled, items: z.array(z.object({ day: need(40, 'day'), text: need(200, 'text') })).min(1).max(10), note: opt(300) }).optional(),
    included: z.object({ ...titled, items: lines(160, 15).min(1) }).optional(),
    // one more column for the exam table (Questions unless named: each page's own, such as Assessment), matched to the course's
    // own exam rows by their unit name (a row it doesn't know leaves the column out, so no row ever shows another row's value),
    // and lines above the table
    exams: z
      .object({
        intro: opt(1200),
        column: opt(30),
        units: z.array(z.object({ unit: need(120, 'unit name'), value: need(120, 'column value') })).max(20).default([]),
      })
      .optional(),
    packages: z
      .object({
        ...titled,
        intro: opt(600),
        items: z
          .array(
            z.object({
              key: z.string().regex(/^[a-z0-9-]{1,40}$/).optional(), // kept as it was, so a basket line keeps which package it is
              name: need(60, 'package name'),
              text: opt(200),
              points: lines(120, 8),
              add: z.number().min(0).max(5000).multipleOf(0.01).optional(),
              badge: opt(30),
              firstAid: z.boolean().default(false),
            }),
          )
          .min(1)
          .max(6),
        note: opt(400),
      })
      .optional(),
    business: z
      .object({
        ...titled,
        intro: opt(800),
        benefits: z.array(z.object({ title: need(60, 'benefit'), text: need(200, 'benefit text'), icon: z.string().regex(/^icon-[a-z0-9-]{1,40}$/).optional() })).max(8).default([]),
        tiers: z.array(z.object({ learners: need(40, 'group size'), saving: need(40, 'saving') })).max(5).default([]),
        account: opt(200),
        signIn: opt(120), // a line for business account holders, followed by a Sign in link
        quote: z.object({ title: need(60, 'quote heading'), text: opt(200), cta: need(40, 'button words') }),
      })
      .optional(),
    // steps (how to get or renew the licence), with a tip under them
    licence: z.object({ ...titled, steps: z.array(z.object({ title: need(80, 'step'), text: need(400, 'step text') })).min(1).max(10), note: opt(400) }).optional(),
    costs: z
      .object({
        ...titled,
        intro: opt(400),
        courseLabel: opt(80),
        firstAid: z.object({ label: need(80, 'first aid label'), from: z.number().min(0).max(5000) }).optional(),
        licenceFee: z.object({ label: need(80, 'licence fee label'), amount: z.number().min(0).max(5000) }).optional(),
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
  heroTitle: 'Hero heading', trust: 'Trust strip', compare: 'Comparison table', unitsIntro: 'Syllabus intro', week: 'Course week', included: "What's included", exams: 'Exam table',
  packages: 'Packages', business: 'Team training', licence: 'Steps', costs: 'Cost table', careers: 'Careers',
}
const ITEM_NAMES: Record<string, string> = {
  'packages.items': 'package', 'week.items': 'day',
  trust: 'line', rows: 'row', items: 'item', steps: 'step', units: 'unit', benefits: 'benefit', tiers: 'saving', points: 'point', cells: 'cell', columns: 'column', areas: 'area',
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
  const message = issue.code === 'too_small' && issue.type === 'array' ? 'Add at least one.' : issue.code === 'unrecognized_keys' ? 'This section is not part of a course guide.' : issue.message
  return `${where.join(' › ')}: ${message}`
}

/** A page's guide, or null. A guide saved before a rule changed is read as it is, never thrown away. */
export async function loadGuide(db: typeof Db, courseId: number): Promise<CourseGuide | null> {
  const [g] = await db.select({ content: courseGuides.content }).from(courseGuides).where(eq(courseGuides.courseId, courseId))
  return (g?.content as CourseGuide | undefined) ?? null
}
