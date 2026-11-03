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
// (the database insists), so those are not renamed. A retired entry leaves the filters and menus and can be restored; one that was
// never used (a test or a mistake) can then be deleted (`remove`, below). An entry with live courses filed under it can't be retired (its courses would sit under a subject, method or
// level no menu or filter offers): the refusal says how many and names a few, so they can be moved or paused first.

const KINDS = ['category', 'subcategory', 'topic', 'method', 'level'] as const
type Kind = (typeof KINDS)[number]
const TABLE = { category: categories, subcategory: subcategories, topic: topics, method: deliveryMethods, level: courseLevels }
// the column that holds the parent, for the kinds that have one
const PARENT = { subcategory: sql`category_id`, topic: sql`subcategory_id` } as const
const WORD = { category: 'category', subcategory: 'sub-category', topic: 'topic', method: 'delivery method', level: 'level' }
const byKey = (kind: Kind) => (kind === 'method' || kind === 'level' ? sql`slug` : sql`id`)
// the course column that files a course under an entry, compared with the entry's key as text
const FILED = { category: sql`category_id::text`, subcategory: sql`subcategory_id::text`, topic: sql`topic_id::text`, method: sql`method`, level: sql`level` } as const

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
type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0]
async function rows(db: typeof Db | Tx, k: Kind): Promise<Row[]> {
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
      // in one transaction with the entry locked: a course approved at the same moment (which locks the entries it is filed under,
      // lib/retired.mts) either goes live first and is counted here, or waits and is refused there
      await ctx.db.transaction(async (tx) => {
        const [row] = await tx.execute<{ name: string; active: boolean }>(sql`select name, active from ${TABLE[input.kind]} where ${byKey(input.kind)}::text = ${input.key} for update`)
        if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'That part of the list no longer exists. Reload the page.' })
        if (row.active === input.active) return // already so
        if (!input.active) {
          const live = await tx.execute<{ title: string }>(sql`
            select title from public.courses where status = 'live' and ${FILED[input.kind]} = ${input.key} order by title limit 4`)
          if (live.length) {
            const [n] = await tx.execute<{ n: number }>(sql`select count(*)::int n from public.courses where status = 'live' and ${FILED[input.kind]} = ${input.key}`)
            const names = live.slice(0, 3).map((c) => c.title).join(', ') + (n.n > 3 ? ` and ${n.n - 3} more` : '')
            const one = n.n === 1
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `${row.name} can't be retired while ${n.n} live ${one ? 'course is' : 'courses are'} filed under it (${names}). Move ${one ? 'it' : 'them'} to another ${WORD[input.kind]}, or pause ${one ? 'it' : 'them'}, first.`,
            })
          }
        }
        await tx.execute(sql`update ${TABLE[input.kind]} set active = ${input.active} where ${byKey(input.kind)}::text = ${input.key}`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: input.active ? 'admin.catalogue_restored' : 'admin.catalogue_retired', targetType: input.kind, targetId: input.key, metadata: { kind: input.kind, name: row.name }, ip: ctx.ip })
      })
      return { ok: true }
    }),

  // Delete a retired entry that nothing has ever used (a test or a mistake): no course of any status filed under it, no change
  // waiting for approval moving one there, no date taught that way, no coupon limited to it, and no review or site content (the home
  // page's featured courses) naming it. A category goes with its sub-categories and topics, a sub-category with its topics, as long
  // as none of those is used either. Anything in use is refused, saying where, so it stays retired instead.
  remove: adminProcedure('admin.catalogue.edit')
    .input(z.object({ kind, key }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.execute<{ name: string; active: boolean; slug: string }>(sql`select name, active, slug from ${TABLE[input.kind]} where ${byKey(input.kind)}::text = ${input.key}`)
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'That part of the list no longer exists. Reload the page.' })
      if (row.active) throw new TRPCError({ code: 'BAD_REQUEST', message: `Retire ${row.name} first. Only a retired entry that nothing uses can be deleted.` })

      // the entry and everything under it: ids for courses and pending changes, and their paths ("category/sub/topic") for reviews,
      // site content and coupons
      const under = await ctx.db.execute<{ kind: 'category' | 'subcategory' | 'topic'; id: string; slug: string; path: string }>(
        input.kind === 'category'
          ? sql`select 'category' kind, c.id::text id, c.slug, c.slug path from public.categories c where c.id::text = ${input.key}
                union all select 'subcategory', s.id::text, s.slug, c.slug || '/' || s.slug from public.subcategories s join public.categories c on c.id = s.category_id where c.id::text = ${input.key}
                union all select 'topic', t.id::text, t.slug, c.slug || '/' || s.slug || '/' || t.slug from public.topics t join public.subcategories s on s.id = t.subcategory_id join public.categories c on c.id = s.category_id where c.id::text = ${input.key}`
          : input.kind === 'subcategory'
            ? sql`select 'subcategory' kind, s.id::text id, s.slug, c.slug || '/' || s.slug path from public.subcategories s join public.categories c on c.id = s.category_id where s.id::text = ${input.key}
                  union all select 'topic', t.id::text, t.slug, c.slug || '/' || s.slug || '/' || t.slug from public.topics t join public.subcategories s on s.id = t.subcategory_id join public.categories c on c.id = s.category_id where s.id::text = ${input.key}`
            : input.kind === 'topic'
              ? sql`select 'topic' kind, t.id::text id, t.slug, c.slug || '/' || s.slug || '/' || t.slug path from public.topics t join public.subcategories s on s.id = t.subcategory_id join public.categories c on c.id = s.category_id where t.id::text = ${input.key}`
              : sql`select null::text kind, null::text id, null::text slug, null::text path where false`,
      )
      const ids = (k: string) => under.filter((u) => u.kind === k).map((u) => u.id)
      const paths = under.map((u) => u.path)
      const uses: string[] = []
      const count = async (q: ReturnType<typeof sql>) => Number((await ctx.db.execute<{ n: number }>(q))[0]?.n ?? 0)
      const inList = (list: string[]) => sql.raw(`(${list.map((x) => `'${x.replace(/'/g, "''")}'`).join(',')})`)
      let courses = 0
      let pending = 0
      if (input.kind === 'method' || input.kind === 'level') {
        courses = await count(sql`select count(*)::int n from public.courses where ${FILED[input.kind]} = ${input.key}`)
        if (input.kind === 'method') {
          const dates = await count(sql`select count(*)::int n from public.cohorts where method = ${input.key}`)
          if (dates) uses.push(`${dates} course ${dates === 1 ? 'date' : 'dates'}`)
        } else pending = await count(sql`select count(*)::int n from public.course_revisions where status = 'pending' and content->>'level' = ${row.slug}`)
      } else {
        const where = [ids('category').length ? sql`category_id::text in ${inList(ids('category'))}` : null, ids('subcategory').length ? sql`subcategory_id::text in ${inList(ids('subcategory'))}` : null, ids('topic').length ? sql`topic_id::text in ${inList(ids('topic'))}` : null].filter(Boolean)
        if (where.length) courses = await count(sql`select count(*)::int n from public.courses where ${sql.join(where as ReturnType<typeof sql>[], sql` or `)}`)
        const slugs = under.map((u) => u.slug)
        pending = await count(sql`select count(*)::int n from public.course_revisions where status = 'pending' and (content->>'category' in ${inList(slugs)} or content->>'subcategory' in ${inList(slugs)} or content->>'topic' in ${inList(slugs)})`)
        if (input.kind === 'category') {
          const coupons = await count(sql`select count(*)::int n from public.coupons where ${row.slug} = any(categories)`)
          if (coupons) uses.push(`${coupons} ${coupons === 1 ? 'coupon' : 'coupons'}`)
        }
        const reviews = await count(sql`select count(*)::int n from public.reviews where ${sql.join(paths.map((p) => sql`topic = ${p} or topic like ${p + '/%'}`), sql` or `)}`)
        if (reviews) uses.push(`${reviews} customer ${reviews === 1 ? 'review' : 'reviews'}`)
        const content = await count(sql`select count(*)::int n from public.site_content where ${sql.join(paths.map((p) => sql`value::text like ${'%"' + p + '%'}`), sql` or `)}`)
        if (content) uses.push('the site content (the home page’s featured courses)')
      }
      if (courses) uses.unshift(`${courses} ${courses === 1 ? 'course' : 'courses'} (live, draft or paused)`)
      if (pending) uses.push(`${pending} course ${pending === 1 ? 'change' : 'changes'} waiting for approval`)
      if (uses.length) {
        const also = under.length > 1 ? ' (or its sub-categories and topics)' : ''
        throw new TRPCError({ code: 'BAD_REQUEST', message: `${row.name} can't be deleted: ${uses.join(', ')} ${uses.length === 1 && !uses[0].includes('content') ? 'uses' : 'use'} it${also}. It stays retired, so nobody sees it.` })
      }
      await ctx.db.transaction(async (tx) => {
        if (ids('topic').length) await tx.execute(sql`delete from public.topics where id::text in ${inList(ids('topic'))}`)
        if (ids('subcategory').length) await tx.execute(sql`delete from public.subcategories where id::text in ${inList(ids('subcategory'))}`)
        if (input.kind === 'category' || input.kind === 'method' || input.kind === 'level') await tx.execute(sql`delete from ${TABLE[input.kind]} where ${byKey(input.kind)}::text = ${input.key}`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.catalogue_deleted', targetType: input.kind, targetId: input.key, metadata: { kind: input.kind, name: row.name, with: under.length - (input.kind === 'method' || input.kind === 'level' ? 0 : 1) }, ip: ctx.ip })
      })
      return { ok: true }
    }),

  // Move an entry one place up or down among its neighbours (the order the site shows them in).
  move: adminProcedure('admin.catalogue.edit')
    .input(z.object({ kind, key, direction: z.enum(['up', 'down']) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        // the order is read under a lock on the list, so two moves at the same moment take turns: each one moves from the order the
        // other left, and no two entries end up in the same place
        await tx.execute(sql`select 1 from ${TABLE[input.kind]} for update`)
        const all = await rows(tx, input.kind)
        const me = all.find((r) => r.key === input.key)
        if (!me) throw new TRPCError({ code: 'NOT_FOUND', message: 'That part of the list no longer exists. Reload the page.' })
        const siblings = all.filter((r) => r.parent === me.parent)
        const i = siblings.indexOf(me)
        const j = input.direction === 'up' ? i - 1 : i + 1
        if (j < 0 || j >= siblings.length) throw new TRPCError({ code: 'CONFLICT', message: input.direction === 'up' ? 'This is already first. Reload the page to see the order.' : 'This is already last. Reload the page to see the order.' })
        ;[siblings[i], siblings[j]] = [siblings[j], siblings[i]]
        // renumber the neighbours 0, 1, 2… in their new order
        for (const [n, r] of siblings.entries()) if (r.position !== n) await tx.execute(sql`update ${TABLE[input.kind]} set position = ${n} where ${byKey(input.kind)}::text = ${r.key}`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.catalogue_moved', targetType: input.kind, targetId: input.key, metadata: { kind: input.kind, name: me.name, direction: input.direction }, ip: ctx.ip })
        return { ok: true }
      })
    }),
})
