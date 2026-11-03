import { TRPCError } from '@trpc/server'
import { sql } from '@readtraining/db'
import type { db as Db } from './db.mjs'

// A course never goes live under a retired category, sub-category, topic, delivery method or level (admin > Catalogue
// settings): it would sit under something no menu or filter offers. Retiring an entry is refused while live courses are filed
// under it (modules/admin/catalogue.mts); this is the other side, checked by every step that puts a course live (approving it
// or a change to it, resuming it, publishing a shared page), inside that step's transaction after the change, so it sees the
// course as it would go live.

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0]

/** "Name (category)" for each retired entry the course is filed under; empty when all are active. */
export async function retiredEntries(db: typeof Db | Tx, courseId: number): Promise<string[]> {
  const rows = await db.execute<{ word: string; name: string }>(sql`
    select 'category' word, e.name from public.courses c join public.categories e on e.id = c.category_id where c.id = ${courseId} and not e.active
    union all
    select 'sub-category', e.name from public.courses c join public.subcategories e on e.id = c.subcategory_id where c.id = ${courseId} and not e.active
    union all
    select 'topic', e.name from public.courses c join public.topics e on e.id = c.topic_id where c.id = ${courseId} and not e.active
    union all
    select 'delivery method', e.name from public.courses c join public.delivery_methods e on e.slug = c.method where c.id = ${courseId} and not e.active
    union all
    select 'level', e.name from public.courses c join public.course_levels e on e.slug = c.level where c.id = ${courseId} and not e.active`)
  return rows.map((r) => `${r.name} (${r.word})`)
}

/** Throws (rolling back the transaction it runs in) when the course would go live under a retired entry. `who` picks the advice. */
export async function refuseRetired(db: typeof Db | Tx, courseId: number, who: 'admin' | 'provider') {
  const retired = await retiredEntries(db, courseId)
  if (!retired.length) return
  const list = retired.join(', ')
  const one = retired.length === 1
  throw new TRPCError({
    code: 'CONFLICT',
    message:
      who === 'admin'
        ? `This course can't go live: ${list} ${one ? 'is' : 'are'} retired in Catalogue settings. Restore ${one ? 'it' : 'them'} there, or ask for the course to be moved, first.`
        : `This course can't go back live: ${list} ${one ? 'is' : 'are'} no longer offered on ReadTraining. Edit the course to choose another, or contact us.`,
  })
}
