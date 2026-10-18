import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { siteContent, sql } from '@readtraining/db'

import { logActivity } from '../../lib/activity.mjs'
import { adminProcedure, createTRPCRouter, publicProcedure } from '../../trpc/trpc.mjs'

// The site's editable content (Part B, B2), one value per key. The website reads them all at once (public); a key with no
// value uses the website's built-in wording. Admins with the "content" switch save one key at a time; each save is checked
// against that key's shape and logged.

const text = (min: number, max: number, what: string) =>
  z.string().trim().min(min, `Enter the ${what}.`).max(max, `Keep the ${what} to ${max} characters or fewer.`)
const whole = { required_error: 'Enter a whole number.', invalid_type_error: 'Enter a whole number.' }
const count = z.number(whole).int('Enter a whole number.').min(0, 'Enter a whole number.').max(100_000_000, 'Enter a smaller number.')

export const CONTENT = {
  // the trust numbers every page quotes: the average rating, how many verified reviews, customers and courses
  trust: z.object({
    rating: z.number({ required_error: 'Enter a rating from 1 to 5.', invalid_type_error: 'Enter a rating from 1 to 5.' }).min(1, 'Enter a rating from 1 to 5.').max(5, 'Enter a rating from 1 to 5.').refine((n) => Math.round(n * 10) === n * 10, 'Use one decimal place, like 4.9.'),
    reviews: count,
    customers: count,
    courses: count,
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
} as const
export type ContentKey = keyof typeof CONTENT
const KEYS = Object.keys(CONTENT) as ContentKey[]

export const contentRouter = createTRPCRouter({
  // Everything that has been set (keys never set are left out, so the website uses its own wording for them).
  site: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute<{ key: string; value: unknown }>(sql`select key, value from ${siteContent}`)
    return Object.fromEntries(rows.filter((r) => (KEYS as string[]).includes(r.key)).map((r) => [r.key, r.value])) as Partial<Record<ContentKey, unknown>>
  }),

  // When each key was last changed and by whom (the admin's content page).
  changes: adminProcedure('admin.panel.open').query(async ({ ctx }) => {
    const rows = await ctx.db.execute<{ key: string; updated_at: string; first_name: string | null; last_name: string | null; email: string | null }>(sql`
      select c.key, c.updated_at, p.first_name, p.last_name, u.email
      from ${siteContent} c left join auth.users u on u.id = c.updated_by left join public.profiles p on p.id = c.updated_by`)
    return Object.fromEntries(rows.map((r) => [r.key, { at: new Date(r.updated_at).toISOString(), by: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.email || '' }]))
  }),

  // One key's new value, checked against that key's shape; the first problem is the answer's message (with where it is).
  save: adminProcedure('admin.content.edit')
    .input(z.object({ key: z.enum(KEYS as [ContentKey, ...ContentKey[]]), value: z.unknown() }))
    .mutation(async ({ ctx, input }) => {
      const { key } = input
      const parsed = CONTENT[key].safeParse(input.value)
      if (!parsed.success) {
        const issue = parsed.error.issues[0]
        throw new TRPCError({ code: 'BAD_REQUEST', message: issue.message, cause: Object.assign(new Error(issue.message), { field: issue.path.join('.') }) })
      }
      const value = parsed.data
      await ctx.db.transaction(async (tx) => {
        await tx
          .insert(siteContent)
          .values({ key, value, updatedBy: ctx.user.id })
          .onConflictDoUpdate({ target: siteContent.key, set: { value, updatedBy: ctx.user.id, updatedAt: new Date() } })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.content_updated', targetType: 'content', targetId: key, metadata: { key }, ip: ctx.ip })
      })
      return { ok: true }
    }),

  // Back to the website's built-in wording for one key (its saved value is removed).
  reset: adminProcedure('admin.content.edit')
    .input(z.object({ key: z.enum(KEYS as [ContentKey, ...ContentKey[]]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const removed = await tx.execute<{ key: string }>(sql`delete from ${siteContent} where key = ${input.key} returning key`)
        if (removed.length) await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.content_reset', targetType: 'content', targetId: input.key, metadata: { key: input.key }, ip: ctx.ip })
      })
      return { ok: true }
    }),
})
