// Web-address names (slugs): lower-case words joined by hyphens, accents and symbols removed ("Café & Bar" → "cafe-and-bar").
// Used for provider and business addresses and for course pages.

export const slugify = (s: string, fallback = 'item', max = 60) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '') || fallback

/** `base`, or `base-2`, `base-3`… whichever is not in `taken` (the slugs already used that start with `base`). */
export function freeSlug(base: string, taken: Iterable<string>) {
  const used = new Set(taken)
  let slug = base
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`
  return slug
}
