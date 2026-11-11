import { asc, categories, courseLevels, deliveryMethods, eq, subcategories, topics } from '@readtraining/db'

import { z } from 'zod'

import { createTRPCRouter, publicProcedure } from '../../trpc/trpc.mjs'
import { loadCoursePage, loadListings, locate } from './listings.mjs'

// The catalogue's one list (brief §4): categories > sub-categories > topics, delivery methods and levels. Public, read by
// the website (filters, menus, course pages), the provider's course form and the admin alike. Retired entries are left out.

// a town as the site writes it: as the provider typed it, with capitals when it was typed all in lower case ("bahria")
const townName = (city: string) => {
  const t = city.trim()
  return t === t.toLowerCase() ? t.replace(/\b([a-z])/g, (m) => m.toUpperCase()) : t
}

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
    // no such live page: null, an ordinary answer (not an error), so the website's saved copy of a page that has gone is replaced
    // and the page shows "not found" (Next keeps the old copy when the API answers with an error)
    return (await loadCoursePage(ctx.db, input.slug)) ?? null
  }),

  // Everything the site's navigation shows, from the live catalogue, so no menu ever offers a subject, method, town or course
  // that leads nowhere: the header's Explore and Location menus, the mobile menu, the footer, the home page's subject tiles and
  // search. Read once on the server for every page (the website's lib/catalogueServer.js loadNav, cached a minute).
  // - subjects: the active categories that have live courses, in the admin's order, with their number of courses and top three;
  // - methods: the active delivery methods that live courses use;
  // - towns: the towns live dates run in (from their venues), most courses first, with where they are;
  // - courses: the live courses, most popular first, with their subject, picture and the towns they run in.
  nav: publicProcedure.query(async ({ ctx }) => {
    const [all, cats, methods] = await Promise.all([
      loadListings(ctx.db),
      ctx.db.select({ slug: categories.slug, name: categories.name }).from(categories).where(eq(categories.active, true)).orderBy(asc(categories.position), asc(categories.name)),
      ctx.db.select({ slug: deliveryMethods.slug, name: deliveryMethods.name }).from(deliveryMethods).where(eq(deliveryMethods.active, true)).orderBy(asc(deliveryMethods.position)),
    ])
    const subjects = cats
      .map((c) => {
        const mine = all.filter((l) => l.category === c.slug)
        return { slug: c.slug, name: c.name, count: mine.length, imageUrl: mine.find((l) => l.imageUrl)?.imageUrl ?? null, top: mine.slice(0, 3).map((l) => ({ title: l.title, slug: l.slug, duration: l.duration, methods: l.methods })) }
      })
      .filter((c) => c.count > 0)
    const used = new Set(all.flatMap((l) => l.methods))
    // a town by its name, written the way it was first seen; where it is from its first venue with a map point
    const towns = new Map<string, { name: string; lat: number | null; lng: number | null; courses: number }>()
    for (const l of all) {
      const seen = new Set<string>()
      for (const v of l.venues) {
        const key = v.city.trim().toLowerCase()
        if (!key || seen.has(key)) continue
        seen.add(key)
        const t = towns.get(key) ?? { name: townName(v.city), lat: null, lng: null, courses: 0 }
        if (t.lat == null && v.lat != null && v.lng != null) Object.assign(t, { lat: v.lat, lng: v.lng })
        t.courses += 1
        towns.set(key, t)
      }
    }
    return {
      subjects,
      methods: methods.filter((m) => used.has(m.slug)),
      towns: [...towns.values()].sort((a, b) => b.courses - a.courses || a.name.localeCompare(b.name)),
      courses: all.slice(0, 300).map((l) => ({ title: l.title, slug: l.slug, subject: l.category, imageUrl: l.imageUrl, towns: [...new Set(l.venues.map((v) => townName(v.city)).filter(Boolean))] })),
    }
  }),

  // Where a typed town, place, postcode area (one or two letters: L, LS) or postcode is, for "near me" search; null when it
  // can't be found.
  locate: publicProcedure.input(z.object({ q: z.string().trim().min(1).max(80) })).query(({ input }) => locate(input.q)),
})
