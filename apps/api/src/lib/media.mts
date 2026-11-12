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
// The smallest provider logo (the settings form says so; apps/web/lib/images.js has every picture rule).
export const MIN_LOGO = { width: 200, height: 200 } as const

/** Width and height of a JPG, PNG, WebP or GIF file; null when it isn't one of those, or is damaged: read from its start, and
 *  the file must also end the way its kind does, so a fake or cut-off file (a real header with nothing whole after it) is refused. */
export function imageSize(b: Uint8Array): { width: number; height: number } | null {
  return complete(b) ? headerSize(b) : null
}

// Whether the file ends as its kind must: PNG with its IEND chunk, GIF with its trailer byte, WebP as long as its RIFF header says,
// JPEG with its end-of-image marker (some cameras add a few bytes after it, so the last kilobyte is looked through).
function complete(b: Uint8Array): boolean {
  const n = b.length
  const text = (at: number, len: number) => (at >= 0 && n >= at + len ? String.fromCharCode(...b.subarray(at, at + len)) : '')
  if (b[0] === 0x89 && text(1, 3) === 'PNG') return text(n - 8, 4) === 'IEND'
  if (text(0, 3) === 'GIF') return b[n - 1] === 0x3b
  if (text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') return n >= 12 && n >= new DataView(b.buffer, b.byteOffset, n).getUint32(4, true) + 8
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = n - 2; i >= Math.max(2, n - 1024); i--) if (b[i] === 0xff && b[i + 1] === 0xd9) return true
    return false
  }
  return false
}

function headerSize(b: Uint8Array): { width: number; height: number } | null {
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
