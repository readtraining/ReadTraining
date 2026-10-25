import { asc, categories, courseLevels, deliveryMethods, eq, subcategories, topics } from '@readtraining/db'

import { z } from 'zod'

import { createTRPCRouter, publicProcedure } from '../../trpc/trpc.mjs'
import { loadCoursePage, loadListings, locate, notFoundCourse } from './listings.mjs'

// The catalogue's one list (brief §4): categories > sub-categories > topics, delivery methods and levels. Public, read by
// the website (filters, menus, course pages), the provider's course form and the admin alike. Retired entries are left out.

export const catalogueRouter = createTRPCRouter({
  taxonomy: publicProcedure.query(async ({ ctx }) => {
    const [cats, subs, tops, methods, levels] = await Promise.all([
      ctx.db.select({ id: categories.id, slug: categories.slug, name: categories.name }).from(categories).where(eq(categories.active, true)).orderBy(asc(categories.position), asc(categories.name)),
      ctx.db
        .select({ id: subcategories.id, categoryId: subcategories.categoryId, slug: subcategories.slug, name: subcategories.name })
        .from(subcategories)
        .where(eq(subcategories.active, true))
        .orderBy(asc(subcategories.position), asc(subcategories.name)),
      ctx.db.select({ subcategoryId: topics.subcategoryId, slug: topics.slug, name: topics.name }).from(topics).where(eq(topics.active, true)).orderBy(asc(topics.position), asc(topics.name)),
      ctx.db.select({ slug: deliveryMethods.slug, name: deliveryMethods.name }).from(deliveryMethods).where(eq(deliveryMethods.active, true)).orderBy(asc(deliveryMethods.position)),
      ctx.db.select({ slug: courseLevels.slug, name: courseLevels.name }).from(courseLevels).where(eq(courseLevels.active, true)).orderBy(asc(courseLevels.position)),
    ])
    return {
      categories: cats.map((c) => ({
        slug: c.slug,
        name: c.name,
        subcategories: subs
          .filter((s) => s.categoryId === c.id)
          .map((s) => ({ slug: s.slug, name: s.name, topics: tops.filter((t) => t.subcategoryId === s.id).map((t) => ({ slug: t.slug, name: t.name })) })),
      })),
      methods,
      levels,
    }
  }),

  // The public catalogue (Milestone 2, listings.mts): every listing for the search, category and method pages, most popular first.
  listings: publicProcedure.query(({ ctx }) => loadListings(ctx.db)),

  // One course page by its address, with its providers' dates.
  course: publicProcedure.input(z.object({ slug: z.string().trim().min(1).max(120) })).query(async ({ ctx, input }) => {
    const page = await loadCoursePage(ctx.db, input.slug)
    if (!page) throw notFoundCourse()
    return page
  }),

  // The header's subject menu: each category's number of courses and its three most popular.
  menu: publicProcedure.query(async ({ ctx }) => {
    const all = await loadListings(ctx.db)
    const out: Record<string, { count: number; top: { title: string; slug: string; duration: string; methods: string[] }[] }> = {}
    for (const l of all) {
      if (!l.category) continue
      const e = (out[l.category] ??= { count: 0, top: [] })
      e.count += 1
      if (e.top.length < 3) e.top.push({ title: l.title, slug: l.slug, duration: l.duration, methods: l.methods })
    }
    return out
  }),

  // Where a typed town, place or postcode is, for "near me" search; null when it can't be found.
  locate: publicProcedure.input(z.object({ q: z.string().trim().min(2).max(80) })).query(({ input }) => locate(input.q)),
})
