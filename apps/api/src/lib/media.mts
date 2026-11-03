import { randomUUID } from 'node:crypto'

import { supabase } from './supabase.mjs'

// Course images and provider logos: the public course-media bucket (migration 0021). Anyone can view a file by its address;
// only the API uploads, through one-time signed upload addresses, after checking the person may edit that course or provider.
// Every file lives under its provider's folder: <organisation id>/courses/<course id>/… or <organisation id>/logo/…; the shared
// course pages ReadTraining's team writes keep theirs under shared/courses/<course id>/….

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

// a stored path the API made: <organisation uuid>/courses/<id>/<uuid>.<ext>, <organisation uuid>/logo/<uuid>.<ext>, or a shared
// course page's shared/courses/<id>/<uuid>.<ext>
export const MEDIA_PATH = /^([0-9a-f-]{36}\/(courses\/\d+|logo)|shared\/courses\/\d+)\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/

// ---- picture sizes ---------------------------------------------------------------------------------------------------------
// The smallest course image (the editor's hint says so): smaller ones look blurred on the course card and page.
export const MIN_COURSE_IMAGE = { width: 500, height: 300 } as const

/** Width and height read from the start of a JPG, PNG, WebP or GIF file; null when it isn't one of those (or is damaged). */
export function imageSize(b: Uint8Array): { width: number; height: number } | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const text = (at: number, n: number) => (b.length >= at + n ? String.fromCharCode(...b.subarray(at, at + n)) : '')
  // PNG: the IHDR chunk comes first
  if (b[0] === 0x89 && text(1, 3) === 'PNG' && text(12, 4) === 'IHDR' && b.length >= 24) return { width: dv.getUint32(16), height: dv.getUint32(20) }
  // GIF: the logical screen size
  if (text(0, 3) === 'GIF' && b.length >= 10) return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) }
  // WebP: lossy (VP8), lossless (VP8L) or extended (VP8X)
  if (text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP' && b.length >= 30) {
    const kind = text(12, 4)
    if (kind === 'VP8 ') return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff }
    if (kind === 'VP8L') {
      const bits = dv.getUint32(21, true)
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
    }
    if (kind === 'VP8X') return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) }
    return null
  }
  // JPEG: walk the markers to the frame header (SOF0 to SOF15, except DHT, JPG and DAC)
  if (b[0] === 0xff && b[1] === 0xd8) {
    let at = 2
    while (at + 9 < b.length) {
      if (b[at] !== 0xff) return null
      const marker = b[at + 1]
      if (marker === 0xff) { at += 1; continue } // padding
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { at += 2; continue } // markers with no length
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { height: dv.getUint16(at + 5), width: dv.getUint16(at + 7) }
      if (marker === 0xd9 || marker === 0xda) return null // end, or the image data with no frame header before it
      at += 2 + dv.getUint16(at + 2)
    }
  }
  return null
}

/** The size of a stored picture: undefined when the file isn't there (it didn't upload), null when it can't be read. */
export async function storedImageSize(path: string) {
  if (!supabase) return undefined
  const { data, error } = await supabase.storage.from(COURSE_MEDIA).download(path)
  if (error || !data) return undefined
  return imageSize(new Uint8Array(await data.arrayBuffer()))
}
