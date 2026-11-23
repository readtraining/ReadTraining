// Moves the course guides written in the web app's code (apps/web/data/courseGuides.js, kept in scripts/data/course-guides.json
// in the database's shape) into the database (course_guides), on the shared course page of each guide's catalogue topic, where
// staff then edit them (the shared page editor's Course guide step). A page that already has a guide keeps it: one an admin has
// saved is never overwritten. Each guide is checked by the same rules as a save (lib/courseGuide.mts). Safe to run again.
//
//   pnpm --filter @readtraining/api guides:import            what it would do (no change)
//   pnpm --filter @readtraining/api guides:import --confirm  do it
//   pnpm live --filter @readtraining/api guides:import [--confirm]   the same on the live project
import { readFileSync } from 'node:fs'

import { courseGuides, sql } from '@readtraining/db'

import { logActivity } from '../lib/activity.mjs'
import { guideProblem, guideSchema } from '../lib/courseGuide.mjs'
import { db } from '../lib/db.mjs'

const confirm = process.argv.includes('--confirm')
const entries = JSON.parse(readFileSync(new URL('./data/course-guides.json', import.meta.url), 'utf8')) as { topic: string; guide: unknown }[]

for (const { topic, guide } of entries) {
  const [category, subcategory, slug] = topic.split('/')
  const parsed = guideSchema.safeParse(guide)
  if (!parsed.success) {
    console.log(`${topic}: not imported, ${guideProblem(parsed.error)}`)
    continue
  }
  const pages = await db.execute<{ id: number; title: string; has: boolean }>(sql`
    select c.id, c.title, exists (select 1 from public.course_guides g where g.course_id = c.id) has
    from public.courses c
    join public.categories k on k.id = c.category_id and k.slug = ${category}
    join public.subcategories s on s.id = c.subcategory_id and s.slug = ${subcategory}
    join public.topics t on t.id = c.topic_id and t.slug = ${slug}
    where c.kind = 'shared'`)
  if (!pages.length) {
    console.log(`${topic}: no shared course page on this topic, nothing to do`)
    continue
  }
  for (const p of pages) {
    if (p.has) {
      console.log(`${topic}: "${p.title}" (${p.id}) already has a guide, kept as it is`)
      continue
    }
    if (!confirm) {
      console.log(`${topic}: would add the guide to "${p.title}" (${p.id})`)
      continue
    }
    await db.transaction(async (tx) => {
      await tx.insert(courseGuides).values({ courseId: p.id, content: parsed.data }).onConflictDoNothing()
      await tx.execute(sql`update public.courses set updated_at = now() where id = ${p.id}`)
      await logActivity(tx, { actorIdentity: 'system', action: 'system.course_guide_imported', targetType: 'course', targetId: String(p.id), metadata: { title: p.title, topic, by: 'guides:import' } })
    })
    console.log(`${topic}: added the guide to "${p.title}" (${p.id})`)
  }
}
if (!confirm) console.log('Nothing was changed. Run it again with --confirm to add them.')
process.exit(0)
