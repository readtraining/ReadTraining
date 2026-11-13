import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { categories, reviews, sql, subcategories, topics } from '@readtraining/db'

import { logActivity } from '../../lib/activity.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// Customer reviews: reviews of Read Training that the website shows (the home page and Customer reviews). Every admin can see
// them; adding, changing, publishing, hiding and deleting one needs the "content" switch, and each is logged. An admin adds
// real customers' reviews copied from another site, word for word (UK law bans fake reviews): source "imported", created as
// published or hidden, with where it was first posted (`origin`, `originUrl`) when known. Any rating from 1 to 5 is kept:
// refusing a low one would be suppressing negative reviews (DMCC Act 2024). Booking reviews (source "booking", pending until
// checked) come with a later milestone; the website shows only published reviews.

export const HOME_MAX = 4
const fieldError = (field: string, message: string) => new TRPCError({ code: 'BAD_REQUEST', message, cause: Object.assign(new Error(message), { field }) })
const day = z
  .string({ invalid_type_error: 'Enter a date, like 2026-10-18.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date, like 2026-10-18.')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), 'Enter a real date.')
  .refine((v) => v <= new Date().toISOString().slice(0, 10), 'The date of a review can’t be in the future.')
const details = z
  .object({
    name: z.string().trim().min(1, 'Enter the reviewer’s name.').max(60, 'Keep the name to 60 characters or fewer.'),
    rating: z.number({ required_error: 'Choose the star rating.', invalid_type_error: 'Choose the star rating.' }).int('Choose a rating from 1 to 5 stars.').min(1, 'Choose a rating from 1 to 5 stars.').max(5, 'Choose a rating from 1 to 5 stars.'),
    text: z.string().trim().min(10, 'Enter what they wrote, at least 10 characters.').max(2000, 'Keep the review to 2,000 characters or fewer.'),
    // the day it was posted, when known (never worked out from "3 weeks ago"); `dateIsApproximate` when it is only close
    reviewDate: day.nullable(),
    dateIsApproximate: z.boolean(),
    // the catalogue place the review clearly names ("category/sub-category/topic"), or null for one about us in general
    topic: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/, 'Choose a course from the list.').nullable(),
    // where it was first posted, e.g. "Google", and a link to it there: optional
    origin: z.string().trim().min(1).max(40, 'Keep the source to 40 characters or fewer.').nullable(),
    originUrl: z.string().trim().max(500, 'Keep the link to 500 characters or fewer.').url('Enter the full link, starting https://').startsWith('https://', 'Enter the full link, starting https://').nullable(),
    onHome: z.boolean(),
    status: z.enum(['published', 'hidden']),
  })
  .superRefine((d, ctx) => {
    if (d.originUrl && !d.origin) ctx.addIssue({ code: 'custom', path: ['origin'], message: 'Enter where it was posted, like Google, to go with the link.' })
    if (d.dateIsApproximate && !d.reviewDate) ctx.addIssue({ code: 'custom', path: ['reviewDate'], message: 'Enter the date, or untick “approximate”.' })
  })
type Details = z.infer<typeof details>

// a topic that is in the catalogue list; at most HOME_MAX reviews on the home page
async function check(db: typeof Db, d: Details, id: string | null) {
  if (d.topic) {
    const [c, s, t] = d.topic.split('/')
    const [known] = await db.execute(sql`
      select 1 from ${topics} t join ${subcategories} s on s.id = t.subcategory_id join ${categories} c on c.id = s.category_id
      where c.slug = ${c} and s.slug = ${s} and t.slug = ${t}`)
    if (!known) throw fieldError('topic', 'Choose a course from the list.')
  }
  if (d.onHome) {
    const [n] = await db.execute<{ n: number }>(sql`select count(*)::int n from ${reviews} where on_home ${id ? sql`and id <> ${id}::uuid` : sql``}`)
    if (n.n >= HOME_MAX) throw fieldError('onHome', `The home page shows up to ${HOME_MAX} reviews. Take one off the home page first.`)
  }
}

type Status = 'pending' | 'published' | 'hidden'
type Row = { id: string; source: 'imported' | 'booking'; status: Status; reviewer_name: string; rating: number; body: string; review_date: string | null; date_is_approximate: boolean; topic: string | null; origin: string | null; origin_url: string | null; on_home: boolean; updated_at: string }
const shape = (r: Row) => ({ id: r.id, source: r.source, status: r.status, name: r.reviewer_name, rating: r.rating, text: r.body, reviewDate: r.review_date, dateIsApproximate: r.date_is_approximate, topic: r.topic, origin: r.origin, originUrl: r.origin_url, onHome: r.on_home, updatedAt: new Date(r.updated_at).toISOString() })
const COLUMNS = sql`id, source, status, reviewer_name, rating, body, to_char(review_date, 'YYYY-MM-DD') review_date, date_is_approximate, topic, origin, origin_url, on_home, updated_at`
// newest first: by its date when known, else when it was added
const NEWEST = sql`coalesce(review_date::timestamptz, created_at) desc, created_at desc`
const logged = (d: Details) => ({ name: d.name, rating: d.rating, topic: d.topic, origin: d.origin, onHome: d.onHome, status: d.status })
const values = (d: Details) => ({ ...d, origin: d.origin || null, originUrl: d.origin ? d.originUrl || null : null })

export const adminReviewsRouter = createTRPCRouter({
  // Every review, newest first, with the count in each status for the tabs, and how many are on the home page.
  list: adminProcedure('admin.panel.open')
    .input(z.object({ status: z.enum(['published', 'hidden', 'pending']).optional() }))
    .query(async ({ ctx, input }) => {
      const where = input.status ? sql`where status = ${input.status}` : sql``
      const rows = await ctx.db.execute<Row>(sql`select ${COLUMNS} from ${reviews} ${where} order by ${NEWEST} limit 500`)
      const [n] = await ctx.db.execute<{ published: number; hidden: number; pending: number; home: number }>(sql`
        select count(*) filter (where status = 'published')::int published, count(*) filter (where status = 'hidden')::int hidden,
               count(*) filter (where status = 'pending')::int pending, count(*) filter (where on_home)::int home
        from ${reviews}`)
      return { reviews: rows.map(shape), counts: n, homeMax: HOME_MAX }
    }),

  create: adminProcedure('admin.content.edit')
    .input(details)
    .mutation(async ({ ctx, input }) => {
      await check(ctx.db, input, null)
      const v = values(input)
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx.execute<{ id: string }>(sql`
          insert into ${reviews} (source, status, reviewer_name, rating, body, review_date, date_is_approximate, topic, origin, origin_url, on_home, created_by)
          values ('imported', ${v.status}, ${v.name}, ${v.rating}, ${v.text}, ${v.reviewDate}::date, ${v.dateIsApproximate}, ${v.topic}, ${v.origin}, ${v.originUrl}, ${v.onHome}, ${ctx.user.id}::uuid)
          returning id`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.review_created', targetType: 'review', targetId: row.id, metadata: logged(input), ip: ctx.ip })
        return { id: row.id }
      })
    }),

  // Change an imported review (a booking review's words are the learner's: only its status changes, through setStatus).
  update: adminProcedure('admin.content.edit')
    .input(details.and(z.object({ id: z.string().uuid() })))
    .mutation(async ({ ctx, input }) => {
      await check(ctx.db, input, input.id)
      const v = values(input)
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx.execute<{ id: string }>(sql`
          update ${reviews} set status = ${v.status}, reviewer_name = ${v.name}, rating = ${v.rating}, body = ${v.text}, review_date = ${v.reviewDate}::date,
                 date_is_approximate = ${v.dateIsApproximate}, topic = ${v.topic}, origin = ${v.origin}, origin_url = ${v.originUrl}, on_home = ${v.onHome}, updated_at = now()
          where id = ${input.id}::uuid and source = 'imported' returning id`)
        if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'That review no longer exists.' })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.review_updated', targetType: 'review', targetId: row.id, metadata: logged(input), ip: ctx.ip })
        return { ok: true }
      })
    }),

  // Publish a review on the website, or hide it (it stays here and can be published again).
  setStatus: adminProcedure('admin.content.edit')
    .input(z.object({ id: z.string().uuid(), status: z.enum(['published', 'hidden']) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx.execute<{ id: string; reviewer_name: string }>(sql`
          update ${reviews} set status = ${input.status}, updated_at = now() where id = ${input.id}::uuid returning id, reviewer_name`)
        if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'That review no longer exists.' })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: input.status === 'published' ? 'admin.review_published' : 'admin.review_hidden', targetType: 'review', targetId: row.id, metadata: { name: row.reviewer_name }, ip: ctx.ip })
        return { ok: true }
      })
    }),

  // Delete an imported review for good (one added by mistake, or a customer asked for it to come down). A booking review is
  // never deleted here: it is hidden, so the learner's review stays on record.
  remove: adminProcedure('admin.content.edit')
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx.execute<{ id: string; reviewer_name: string; rating: number }>(sql`
          delete from ${reviews} where id = ${input.id}::uuid and source = 'imported' returning id, reviewer_name, rating`)
        if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'That review no longer exists.' })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.review_deleted', targetType: 'review', targetId: row.id, metadata: { name: row.reviewer_name, rating: row.rating }, ip: ctx.ip })
        return { ok: true }
      })
    }),
})

/** The website's reviews: the published ones, newest first, at most 1,000 (content.reviews; the page shows them a few at a time). */
export async function publishedReviews(db: typeof Db) {
  const rows = await db.execute<Row>(sql`select ${COLUMNS} from ${reviews} where status = 'published' order by ${NEWEST} limit 1000`)
  return rows.map((r) => ({ id: r.id, name: r.reviewer_name, rating: r.rating, text: r.body, date: r.review_date, dateIsApproximate: r.date_is_approximate, topic: r.topic, origin: r.origin, originUrl: r.origin_url, onHome: r.on_home }))
}
