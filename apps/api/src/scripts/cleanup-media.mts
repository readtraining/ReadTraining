// Course pictures and provider logos uploaded but never attached. The editor uploads straight to storage through a one-time
// address and then attaches the file (addImage, setLogo); a picture refused for its size is deleted at once, but a tab closed
// mid-upload, or a failed attach, leaves its file in the course-media bucket with nothing pointing at it. This lists those files
// and, with --confirm, deletes them. Only files more than a day old count, so an upload still in progress is never touched.
//
//   pnpm --filter @readtraining/api cleanup:media              list the stray files (no change)
//   pnpm --filter @readtraining/api cleanup:media --confirm    delete them
//   pnpm live --filter @readtraining/api cleanup:media ...     the same on the live project (look at the list first)
//
// A file counts as used when a course image (course_images.path) or a provider's logo (organisations.logo_path) points at it.
import { sql } from '@readtraining/db'

import { db } from '../lib/db.mjs'
import { COURSE_MEDIA, MEDIA_PATH, removeMedia } from '../lib/media.mjs'
import { supabase } from '../lib/supabase.mjs'

const confirm = process.argv.includes('--confirm')
const DAY = 86_400_000

if (!supabase) {
  console.error('No Supabase service settings in the environment: nothing to check.')
  process.exit(1)
}
const bucket = supabase.storage.from(COURSE_MEDIA)

// every file under a folder, walking into sub-folders (storage lists one level at a time, a page at a time)
async function walk(prefix: string): Promise<{ path: string; at: number }[]> {
  const out: { path: string; at: number }[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`Could not list ${prefix || 'the bucket'}: ${error.message}`)
    for (const f of data ?? []) {
      const path = prefix ? `${prefix}/${f.name}` : f.name
      if (f.id === null) out.push(...(await walk(path))) // a folder
      else out.push({ path, at: new Date(f.created_at ?? f.updated_at ?? 0).getTime() })
    }
    if (!data || data.length < 1000) break
  }
  return out
}

const [files, used] = await Promise.all([
  walk(''),
  db.execute<{ path: string }>(sql`select path from public.course_images union select logo_path from public.organisations where logo_path is not null`),
])
const inUse = new Set(used.map((r) => r.path))
const now = Date.now()
// only the files the API makes (MEDIA_PATH): anything else in the bucket was put there by hand and is left alone
const stray = files.filter((f) => MEDIA_PATH.test(f.path) && !inUse.has(f.path) && now - f.at > DAY)

console.log(`${files.length} files in ${COURSE_MEDIA}; ${inUse.size} in use; ${stray.length} not attached to anything and over a day old.`)
for (const f of stray) console.log(`  ${f.path}  (uploaded ${new Date(f.at).toISOString().slice(0, 10)})`)

if (!stray.length) process.exit(0)
if (!confirm) {
  console.log('\nNothing deleted. Run again with --confirm to delete these files.')
  process.exit(0)
}
for (let i = 0; i < stray.length; i += 100) await removeMedia(stray.slice(i, i + 100).map((f) => f.path))
console.log(`\nDeleted ${stray.length} files.`)
process.exit(0)
