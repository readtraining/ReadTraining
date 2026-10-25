import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { siteContent, siteContentVersions, sql } from '@readtraining/db'

import { can } from '@readtraining/permissions'

import { EMAIL_KEY, editableTemplate, wordsSchema } from '../../emails/templates.mjs'
import { logActivity } from '../../lib/activity.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { adminProcedure, createTRPCRouter, publicProcedure, refuse } from '../../trpc/trpc.mjs'

// The site's editable content (Part B, B2), one value per key. The website reads them all at once (public); a key with no
// value uses the website's built-in wording. Admins with the "content" switch save one key at a time; each save is checked
// against that key's shape, logged, and kept as a version (so earlier wording can be looked at and brought back).
//
// Keys: trust, featured, testimonials, video, seo (fixed); faq:<set> (one page's FAQ list: any name in the safe pattern, the
// website decides which sets exist); page:<slug> (a legal document: terms, privacy, cookies, accessibility, provider-terms);
// email:<template> (an automated email's words, emails/templates.mts: never sent to the website).
// `seo` is a platform setting (the "platform.settings" switch); everything else needs the "content" switch.

const text = (min: number, max: number, what: string) => z.string().trim().min(min, `Enter the ${what}.`).max(max, `Keep the ${what} to ${max} characters or fewer.`)
const whole = { required_error: 'Enter a whole number.', invalid_type_error: 'Enter a whole number.' }
const count = z.number(whole).int('Enter a whole number.').min(0, 'Enter a whole number.').max(100_000_000, 'Enter a smaller number.')
const day = z
  .string({ required_error: 'Enter a date.', invalid_type_error: 'Enter a date.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date, like 2026-10-18.')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), 'Enter a real date.')

// ---- the fixed keys -------------------------------------------------------------------------------------------------------
const FIXED = {
  // the trust numbers pages quote: the average rating, how many verified reviews, customers and courses. Each may be empty
  // (null): the site then leaves it out. A rating is only shown with its number of reviews, so they are set together.
  trust: z
    .object({
      rating: z.number({ invalid_type_error: 'Enter a rating from 1 to 5.' }).min(1, 'Enter a rating from 1 to 5.').max(5, 'Enter a rating from 1 to 5.').refine((n) => Math.round(n * 10) === n * 10, 'Use one decimal place, like 4.9.').nullable(),
      reviews: count.nullable(),
      customers: count.nullable(),
      courses: count.nullable(),
    })
    .superRefine((d, ctx) => {
      if ((d.rating === null) !== (d.reviews === null)) ctx.addIssue({ code: 'custom', path: [d.rating === null ? 'rating' : 'reviews'], message: 'Enter both the rating and the number of reviews, or leave both empty.' })
    }),
  // the homepage's "Popular courses and qualifications": tabs, each with up to four courses (by course number)
  featured: z.object({
    groups: z
      .array(
        z.object({
          name: text(2, 40, 'tab name'),
          courses: z.array(z.number().int().positive()).min(1, 'Choose at least one course.').max(4, 'Choose up to 4 courses.').refine((a) => new Set(a).size === a.length, 'Choose each course once.'),
        }),
      )
      .min(1, 'Keep at least one tab.')
      .max(4, 'Keep to 4 tabs or fewer.'),
  }),
  // the written testimonials (all on Customer reviews; up to four ticked for the homepage)
  testimonials: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        author: text(2, 60, 'name'),
        position: text(0, 120, 'course and place'),
        text: text(10, 800, 'review'),
        source: z.enum(['', 'Google', 'Trustpilot']),
        home: z.boolean(),
      }),
    )
    .min(1, 'Keep at least one testimonial.')
    .max(40, 'Keep to 40 testimonials or fewer.')
    .refine((a) => a.filter((t) => t.home).length <= 4, 'Choose up to 4 testimonials for the homepage.'),
  // the words on the homepage's video story (the video itself stays as it is)
  video: z.object({ author: text(2, 60, 'name'), position: text(0, 120, 'course and place'), quote: text(5, 200, 'quote') }),
  // Platform settings: the search-engine words for the homepage, and the description any page without its own uses
  seo: z.object({ homeTitle: text(10, 70, 'homepage title'), homeDescription: text(50, 160, 'homepage description'), siteDescription: text(50, 160, 'default description') }),
} as const

// ---- one page's FAQ list --------------------------------------------------------------------------------------------------
const faqSet = z.object({
  items: z
    .array(z.object({ q: text(5, 200, 'question'), a: text(5, 3000, 'answer') }))
    .min(1, 'Keep at least one question.')
    .max(30, 'Keep to 30 questions or fewer.'),
})
const FAQ_KEY = /^faq:[a-z0-9][a-z0-9-]{0,60}$/
const MAX_FAQ_SETS = 80

// ---- a legal document -----------------------------------------------------------------------------------------------------
// sections of titled blocks: a paragraph (text with [label](link) and **bold**), a bullet list, or a table (first row = headings)
const LEGAL = ['terms', 'privacy', 'cookies', 'accessibility', 'provider-terms'] as const
const block = z.union([
  z.string().trim().min(1, 'Remove the empty paragraph.').max(6000, 'Keep each paragraph to 6,000 characters or fewer.'),
  z.object({ type: z.literal('ul'), items: z.array(z.string().trim().min(1).max(800, 'Keep each bullet to 800 characters or fewer.')).min(1).max(60) }),
  z
    .object({
      type: z.literal('table'),
      caption: z.string().trim().max(200).optional(),
      rows: z.array(z.array(z.string().trim().max(600, 'Keep each table cell to 600 characters or fewer.')).min(1).max(8, 'A table can have up to 8 columns.')).min(2, 'A table needs a heading row and at least one row.').max(80),
    })
    .refine((t) => t.rows.every((r) => r.length === t.rows[0].length), 'Every row of a table needs the same number of columns.'),
])
const legalDoc = z
  .object({
    lead: z.string().trim().max(400, 'Keep the introduction to 400 characters or fewer.'),
    updated: day,
    effective: day,
    draft: z.boolean(),
    sections: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'A section needs a web address made of letters, numbers and hyphens.').max(60),
          title: text(2, 120, 'section title'),
          blocks: z.array(block).min(1, 'A section needs some text.').max(80),
        }),
      )
      .min(1, 'Keep at least one section.')
      .max(60, 'Keep to 60 sections or fewer.'),
  })
  .refine((d) => new Set(d.sections.map((s) => s.id)).size === d.sections.length, 'Two sections have the same web address.')

function schemaFor(key: string): z.ZodTypeAny | null {
  if (key in FIXED) return FIXED[key as keyof typeof FIXED]
  if (FAQ_KEY.test(key)) return faqSet
  const m = /^page:([a-z-]+)$/.exec(key)
  if (m && (LEGAL as readonly string[]).includes(m[1])) return legalDoc
  const e = EMAIL_KEY.exec(key)
  if (e && editableTemplate(e[1])) return wordsSchema(e[1])
  return null
}
// the switch a key's changes need
const actionFor = (key: string) => (key === 'seo' ? 'admin.platform.settings' : 'admin.content.edit') as 'admin.platform.settings' | 'admin.content.edit'
const isPublic = (key: string) => !EMAIL_KEY.test(key)
const keyInput = z.string().max(80)
const unknownKey = () => new TRPCError({ code: 'BAD_REQUEST', message: 'That content does not exist.' })

/** The provider terms version a new provider accepts: the date the saved provider terms were last updated, else the built-in one. */
export async function providerTermsVersion(db: typeof Db, builtIn: string) {
  const [row] = await db.execute<{ updated: string | null }>(sql`select value->>'updated' updated from ${siteContent} where key = 'page:provider-terms'`)
  return row?.updated ?? builtIn
}

export const contentRouter = createTRPCRouter({
  // Everything that has been set (keys never set are left out, so the website uses its own wording for them).
  site: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute<{ key: string; value: unknown }>(sql`select key, value from ${siteContent}`)
    return Object.fromEntries(rows.filter((r) => isPublic(r.key) && schemaFor(r.key)).map((r) => [r.key, r.value])) as Record<string, unknown>
  }),

  // When each key was last changed and by whom (the admin's content page).
  changes: adminProcedure('admin.panel.open').query(async ({ ctx }) => {
    const rows = await ctx.db.execute<{ key: string; updated_at: string; first_name: string | null; last_name: string | null; email: string | null }>(sql`
      select c.key, c.updated_at, p.first_name, p.last_name, u.email
      from ${siteContent} c left join auth.users u on u.id = c.updated_by left join public.profiles p on p.id = c.updated_by`)
    return Object.fromEntries(rows.map((r) => [r.key, { at: new Date(r.updated_at).toISOString(), by: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.email || '' }]))
  }),

  // One key's saved versions, newest first (who and when; the wording itself comes from `version`).
  history: adminProcedure('admin.panel.open')
    .input(z.object({ key: keyInput }))
    .query(async ({ ctx, input }) => {
      if (!schemaFor(input.key)) throw unknownKey()
      const rows = await ctx.db.execute<{ id: number; saved_at: string; reset: boolean; first_name: string | null; last_name: string | null; email: string | null }>(sql`
        select v.id, v.saved_at, v.value = 'null'::jsonb reset, p.first_name, p.last_name, u.email
        from ${siteContentVersions} v left join auth.users u on u.id = v.saved_by left join public.profiles p on p.id = v.saved_by
        where v.key = ${input.key} order by v.id desc limit 20`)
      return rows.map((r) => ({ id: Number(r.id), at: new Date(r.saved_at).toISOString(), by: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.email || '', reset: r.reset }))
    }),

  // The wording of one saved version (to look at, or bring back into the form).
  version: adminProcedure('admin.panel.open')
    .input(z.object({ key: keyInput, id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (!schemaFor(input.key)) throw unknownKey()
      const [row] = await ctx.db.execute<{ value: unknown }>(sql`select value from ${siteContentVersions} where id = ${input.id} and key = ${input.key}`)
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'That version no longer exists.' })
      return { value: row.value }
    }),

  // One key's new value, checked against that key's shape; the first problem is the answer's message (with where it is).
  save: adminProcedure('admin.panel.open')
    .input(z.object({ key: keyInput, value: z.unknown() }))
    .mutation(async ({ ctx, input, path }) => {
      const schema = schemaFor(input.key)
      if (!schema) throw unknownKey()
      if (!can(ctx.actor, actionFor(input.key))) await refuse(ctx, actionFor(input.key), null, path)
      const parsed = schema.safeParse(input.value)
      if (!parsed.success) {
        const issue = parsed.error.issues[0]
        throw new TRPCError({ code: 'BAD_REQUEST', message: issue.message, cause: Object.assign(new Error(issue.message), { field: issue.path.join('.') }) })
      }
      const value = parsed.data
      await ctx.db.transaction(async (tx) => {
        if (FAQ_KEY.test(input.key)) {
          const [n] = await tx.execute<{ n: number; has: boolean | null }>(sql`select count(*)::int n, bool_or(key = ${input.key}) has from ${siteContent} where key like 'faq:%'`)
          if (!n.has && n.n >= MAX_FAQ_SETS) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Too many FAQ lists have been changed.' })
        }
        await tx
          .insert(siteContent)
          .values({ key: input.key, value, updatedBy: ctx.user.id })
          .onConflictDoUpdate({ target: siteContent.key, set: { value, updatedBy: ctx.user.id, updatedAt: new Date() } })
        await tx.insert(siteContentVersions).values({ key: input.key, value, savedBy: ctx.user.id })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.content_updated', targetType: 'content', targetId: input.key, metadata: { key: input.key }, ip: ctx.ip })
      })
      return { ok: true }
    }),

  // Back to the website's built-in wording for one key (its saved value is removed; the history keeps what it was).
  reset: adminProcedure('admin.panel.open')
    .input(z.object({ key: keyInput }))
    .mutation(async ({ ctx, input, path }) => {
      if (!schemaFor(input.key)) throw unknownKey()
      if (!can(ctx.actor, actionFor(input.key))) await refuse(ctx, actionFor(input.key), null, path)
      await ctx.db.transaction(async (tx) => {
        const removed = await tx.execute<{ key: string }>(sql`delete from ${siteContent} where key = ${input.key} returning key`)
        if (!removed.length) return
        // a reset is kept as the JSON value null ("back to the built-in wording"), not as a missing value
        await tx.insert(siteContentVersions).values({ key: input.key, value: sql`'null'::jsonb`, savedBy: ctx.user.id })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.content_reset', targetType: 'content', targetId: input.key, metadata: { key: input.key }, ip: ctx.ip })
      })
      return { ok: true }
    }),
})
