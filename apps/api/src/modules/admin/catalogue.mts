import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { categories, courseLevels, deliveryMethods, sql, subcategories, topics } from '@readtraining/db'

import { logActivity } from '../../lib/activity.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// Catalogue settings (Part B, B1): the catalogue's one list (categories > sub-categories > topics, delivery methods, levels)
// that the site's filters and menus, the provider's course form and the admin all read. Every admin can see it; changing it
// needs the "catalogue" switch, and every change is logged.
// Web addresses never change, because courses and links point at them: a new entry's address is made from its name once;
// categories, sub-categories and topics can be renamed (the name only); a delivery method's or level's address IS its name
// (the database insists), so those are not renamed. Nothing is deleted: a retired entry leaves the filters and menus and can
// be restored.

const KINDS = ['category', 'subcategory', 'topic', 'method', 'level'] as const
type Kind = (typeof KINDS)[number]
const TABLE = { category: categories, subcategory: subcategories, topic: topics, method: deliveryMethods, level: courseLevels }
// the column that holds the parent, for the kinds that have one
const PARENT = { subcategory: sql`category_id`, topic: sql`subcategory_id` } as const
const WORD = { category: 'category', subcategory: 'sub-category', topic: 'topic', method: 'delivery method', level: 'level' }
const byKey = (kind: Kind) => (kind === 'method' || kind === 'level' ? sql`slug` : sql`id`)

// the address made from a name, exactly as the database's rule for methods and levels makes it
export const addressOf = (name: string) =>
  name
    .replace(/[^A-Za-z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '')

const fieldError = (field: string, message: string) => new TRPCError({ code: 'BAD_REQUEST', message, cause: Object.assign(new Error(message), { field }) })
const name = z
  .string()
  .trim()
  .min(2, 'Enter a name of at least 2 characters.')
  .max(60, 'Keep the name to 60 characters or fewer.')
  .refine((v) => /[A-Za-z]/.test(v), 'Enter a name with letters in it.')
const kind = z.enum(KINDS)
const key = z.string().min(1).max(80)

type Row = { key: string; parent: string | null; slug: string; name: string; position: number; active: boolean }

// one kind's rows: its key (id, or the address for methods and levels), parent, address, name, place and whether it's in use
async function rows(db: typeof Db, k: Kind): Promise<Row[]> {
  const parent = k === 'subcategory' || k === 'topic' ? sql`${PARENT[k]}::text` : sql`null`
  return db.execute<Row>(sql`select ${byKey(k)}::text "key", ${parent} parent, slug, name, position, active from ${TABLE[k]} order by position, name`)
}

export const catalogueAdminRouter = createTRPCRouter({
  // The whole list, retired entries included, in order.
  list: adminProcedure('admin.panel.open').query(async ({ ctx }) => {
    const [cats, subs, tops, methods, levels] = await Promise.all(KINDS.map((k) => rows(ctx.db, k)))
    const strip = ({ parent, ...r }: Row) => r
    return {
      categories: cats.map((c) => ({ ...strip(c), subcategories: subs.filter((s) => s.parent === c.key).map((s) => ({ ...strip(s), topics: tops.filter((t) => t.parent === s.key).map(strip) })) })),
      methods: methods.map(strip),
      levels: levels.map(strip),
    }
  }),

  // A new entry at the end of its list. Its address is made from the name and must be new among its neighbours.
  add: adminProcedure('admin.catalogue.edit')
    .input(z.object({ kind, parent: key.optional(), name }))
    .mutation(async ({ ctx, input }) => {
      const slug = addressOf(input.name)
      if (!slug) throw fieldError('name', 'Enter a name with letters in it.')
      const needsParent = input.kind === 'subcategory' || input.kind === 'topic'
      if (needsParent && !input.parent) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Choose where it goes.' })
      const where = needsParent ? sql`${PARENT[input.kind as 'subcategory' | 'topic']} = ${input.parent}::uuid` : sql`true`
      if (needsParent) {
        const parentTable = input.kind === 'subcategory' ? categories : subcategories
        const [p] = await ctx.db.execute(sql`select 1 from ${parentTable} where id = ${input.parent}::uuid`)
        if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'That part of the list no longer exists. Reload the page.' })
      }
      const [taken] = await ctx.db.execute<{ name: string }>(sql`select name from ${TABLE[input.kind]} where ${where} and slug = ${slug}`)
      if (taken) throw fieldError('name', `There is already a ${WORD[input.kind]} called “${taken.name}” here. Restore it or choose another name.`)
      const [{ next }] = await ctx.db.execute<{ next: number }>(sql`select coalesce(max(position), -1) + 1 next from ${TABLE[input.kind]} where ${where}`)
      const created = await ctx.db.transaction(async (tx) => {
        const cols = needsParent ? sql`(${PARENT[input.kind as 'subcategory' | 'topic']}, slug, name, position)` : sql`(slug, name, position)`
        const vals = needsParent ? sql`(${input.parent}::uuid, ${slug}, ${input.name}, ${next})` : sql`(${slug}, ${input.name}, ${next})`
        const [row] = await tx.execute<{ key: string }>(sql`insert into ${TABLE[input.kind]} ${cols} values ${vals} returning ${byKey(input.kind)}::text "key"`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.catalogue_added', targetType: input.kind, targetId: row.key, metadata: { kind: input.kind, name: input.name, address: slug }, ip: ctx.ip })
        return row
      })
      return { key: created.key, slug }
    }),

  // A new name for a category, sub-category or topic. Its web address stays as it is.
  rename: adminProcedure('admin.catalogue.edit')
    .input(z.object({ kind: z.enum(['category', 'subcategory', 'topic']), key, name }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.execute<{ name: string }>(sql`select name from ${TABLE[input.kind]} where id = ${input.key}::uuid`)
      if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'That part of the list no longer exists. Reload the page.' })
      if (before.name === input.name) return { ok: true }
      await ctx.db.transaction(async (tx) => {
        await tx.execute(sql`update ${TABLE[input.kind]} set name = ${input.name} where id = ${input.key}::uuid`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.catalogue_renamed', targetType: input.kind, targetId: input.key, metadata: { kind: input.kind, from: before.name, to: input.name }, ip: ctx.ip })
      })
      return { ok: true }
    }),

  // Retire (out of filters and menus) or restore an entry.
  setActive: adminProcedure('admin.catalogue.edit')
    .input(z.object({ kind, key, active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.execute<{ name: string; active: boolean }>(sql`select name, active from ${TABLE[input.kind]} where ${byKey(input.kind)}::text = ${input.key}`)
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'That part of the list no longer exists. Reload the page.' })
      if (row.active === input.active) return { ok: true }
      await ctx.db.transaction(async (tx) => {
        await tx.execute(sql`update ${TABLE[input.kind]} set active = ${input.active} where ${byKey(input.kind)}::text = ${input.key}`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: input.active ? 'admin.catalogue_restored' : 'admin.catalogue_retired', targetType: input.kind, targetId: input.key, metadata: { kind: input.kind, name: row.name }, ip: ctx.ip })
      })
      return { ok: true }
    }),

  // Move an entry one place up or down among its neighbours (the order the site shows them in).
  move: adminProcedure('admin.catalogue.edit')
    .input(z.object({ kind, key, direction: z.enum(['up', 'down']) }))
    .mutation(async ({ ctx, input }) => {
      const all = await rows(ctx.db, input.kind)
      const me = all.find((r) => r.key === input.key)
      if (!me) throw new TRPCError({ code: 'NOT_FOUND', message: 'That part of the list no longer exists. Reload the page.' })
      const siblings = all.filter((r) => r.parent === me.parent)
      const i = siblings.indexOf(me)
      const j = input.direction === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= siblings.length) return { ok: true }
      ;[siblings[i], siblings[j]] = [siblings[j], siblings[i]]
      await ctx.db.transaction(async (tx) => {
        // renumber the neighbours 0, 1, 2… in their new order
        for (const [n, r] of siblings.entries()) if (r.position !== n) await tx.execute(sql`update ${TABLE[input.kind]} set position = ${n} where ${byKey(input.kind)}::text = ${r.key}`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.catalogue_moved', targetType: input.kind, targetId: input.key, metadata: { kind: input.kind, name: me.name, direction: input.direction }, ip: ctx.ip })
      })
      return { ok: true }
    }),
})
