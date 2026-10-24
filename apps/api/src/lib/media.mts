import { randomUUID } from 'node:crypto'

import { supabase } from './supabase.mjs'

// Course images and provider logos: the public course-media bucket (migration 0021). Anyone can view a file by its address;
// only the API uploads, through one-time signed upload addresses, after checking the person may edit that course or provider.
// Every file lives under its provider's folder: <organisation id>/courses/<course id>/… or <organisation id>/logo/….

export const COURSE_MEDIA = 'course-media'
export const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' } as const
export type ImageType = keyof typeof IMAGE_TYPES

const base = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')

/** The public address of a stored file (null for none). */
export const mediaUrl = (path: string | null | undefined) => (path ? `${base}/storage/v1/object/public/${COURSE_MEDIA}/${path}` : null)

/** A one-time upload address for a new file in `folder`. The browser uploads to it; then the caller saves the returned path. */
export async function mediaUploadUrl(folder: string, contentType: ImageType) {
  if (!supabase) return null
  const path = `${folder}/${randomUUID()}.${IMAGE_TYPES[contentType]}`
  const { data, error } = await supabase.storage.from(COURSE_MEDIA).createSignedUploadUrl(path)
  return error || !data ? null : { path: data.path, token: data.token }
}

/** Was this file really uploaded (it exists in the bucket)? */
export async function mediaExists(path: string) {
  if (!supabase) return false
  const slash = path.lastIndexOf('/')
  const { data } = await supabase.storage.from(COURSE_MEDIA).list(path.slice(0, slash), { search: path.slice(slash + 1) })
  return Boolean(data?.some((f) => f.name === path.slice(slash + 1)))
}

/** Deletes stored files (errors are only reported: a left-over file is harmless). */
export async function removeMedia(paths: string[]) {
  if (!supabase || !paths.length) return
  const { error } = await supabase.storage.from(COURSE_MEDIA).remove(paths)
  if (error) console.error('course-media: could not remove files', error.message)
}

// a stored path the API made: <uuid>/courses/<id>/<uuid>.<ext> or <uuid>/logo/<uuid>.<ext>
export const MEDIA_PATH = /^[0-9a-f-]{36}\/(courses\/\d+|logo)\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/
