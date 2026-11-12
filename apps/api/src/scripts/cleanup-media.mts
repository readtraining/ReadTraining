// Pictures uploaded but never attached: course pictures and provider logos (the course-media bucket) and profile photos (the
// avatars bucket). Each is uploaded straight to storage through a one-time address and then attached (addImage, setLogo,
// setPhoto); a picture refused for its size is deleted at once, and a replaced logo or photo is deleted when it is replaced, but a
// tab closed mid-upload, or a failed attach, leaves its file with nothing pointing at it. This lists those files and, with
// --confirm, deletes them. Only files more than a day old count, so an upload still in progress is never touched.
//
//   pnpm --filter @readtraining/api cleanup:media              list the stray files (no change)
//   pnpm --filter @readtraining/api cleanup:media --confirm    delete them
//   pnpm live --filter @readtraining/api cleanup:media ...     the same on the live project (look at the list first)
//
// A file counts as used when a course image (course_images.path), a provider's logo (organisations.logo_path) or a profile's
// photo (profiles.avatar_url) points at it. Only the file names the API makes are looked at: anything else in a bucket was put
// there by hand and is left alone.
import { sql } from '@readtraining/db'

import { db } from '../lib/db.mjs'
import { COURSE_MEDIA, MEDIA_PATH } from '../lib/media.mjs'
import { AVATARS, supabase } from '../lib/supabase.mjs'

const confirm = process.argv.includes('--confirm')
const DAY = 86_400_000

if (!supabase) {
  console.error('No Supabase service settings in the environment: nothing to check.')
  process.exit(1)
}
const storage = supabase.storage

// every file under a folder, walking into sub-folders (storage lists one level at a time, a page at a time)
async function walk(bucket: string, prefix = ''): Promise<{ path: string; at: number }[]> {
  const out: { path: string; at: number }[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`Could not list ${prefix || bucket}: ${error.message}`)
    for (const f of data ?? []) {
      const path = prefix ? `${prefix}/${f.name}` : f.name
      if (f.id === null) out.push(...(await walk(bucket, path))) // a folder
      else out.push({ path, at: new Date(f.created_at ?? f.updated_at ?? 0).getTime() })
    }
    if (!data || data.length < 1000) break
  }
  return out
}

const BUCKETS = [
  { bucket: COURSE_MEDIA, name: MEDIA_PATH, used: sql`select path from public.course_images union select logo_path from public.organisations where logo_path is not null` },
  { bucket: AVATARS, name: /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/, used: sql`select avatar_url path from public.profiles where avatar_url is not null` },
]
const now = Date.now()
const strays: { bucket: string; paths: string[] }[] = []
for (const b of BUCKETS) {
  const [files, used] = await Promise.all([walk(b.bucket), db.execute<{ path: string }>(b.used)])
  const inUse = new Set(used.map((r) => r.path))
  const stray = files.filter((f) => b.name.test(f.path) && !inUse.has(f.path) && now - f.at > DAY)
  console.log(`${files.length} files in ${b.bucket}; ${inUse.size} in use; ${stray.length} not attached to anything and over a day old.`)
  for (const f of stray) console.log(`  ${b.bucket}/${f.path}  (uploaded ${new Date(f.at).toISOString().slice(0, 10)})`)
  if (stray.length) strays.push({ bucket: b.bucket, paths: stray.map((f) => f.path) })
}

if (!strays.length) process.exit(0)
if (!confirm) {
  console.log('\nNothing deleted. Run again with --confirm to delete these files.')
  process.exit(0)
}
let deleted = 0
for (const { bucket, paths } of strays) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await storage.from(bucket).remove(paths.slice(i, i + 100))
    if (error) console.error(`${bucket}: could not remove some files`, error.message)
    else deleted += Math.min(100, paths.length - i)
  }
}
console.log(`\nDeleted ${deleted} files.`)
process.exit(0)
