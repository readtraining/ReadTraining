import { asc, categories, courseLevels, deliveryMethods, eq, subcategories, topics } from '@readtraining/db'

import { createTRPCRouter, publicProcedure } from '../../trpc/trpc.mjs'

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
})
