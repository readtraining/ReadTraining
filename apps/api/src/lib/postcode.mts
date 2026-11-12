// UK postcodes: the format check, the standard way of writing one, and where it is on the map. The map position comes from
// postcodes.io (free, Open Government Licence data, no key), asked when a venue is saved, so search can sort venues by real
// distance, and to check the venue's town (placeVenue). Only the postcode and the town are sent. If postcodes.io can't be asked
// the venue is still saved, without a position (so its town isn't used by public pages until it is checked again).

export const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

/** "sw1a1aa" → "SW1A 1AA". */
export const formatPostcode = (v: string) =>
  v
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/^(.+)(\d[A-Z]{2})$/, '$1 $2')

type Answer = { ok: true; result: unknown } | { ok: false; status: number } | null // null: postcodes.io couldn't be asked

// when postcodes.io last failed to answer: background checks (re-checking venues) wait a minute before asking again
let downUntil = 0
/** Whether postcodes.io failed to answer in the last minute. */
export const lookupDown = () => Date.now() < downUntil

async function ask(path: string): Promise<Answer> {
  try {
    const res = await fetch(`https://api.postcodes.io${path}`, { signal: AbortSignal.timeout(4000) })
    if (res.status === 404) return { ok: false, status: 404 }
    if (res.status >= 500 || res.status === 429) throw new Error(`postcodes.io ${res.status}`)
    if (!res.ok) return null
    return { ok: true, result: ((await res.json()) as { result?: unknown }).result }
  } catch {
    downUntil = Date.now() + 60_000
    return null
  }
}

// "Stoke-on-Trent" and "stoke on trent" read the same. The town typed counts whole (it can't have a comma, schedule.mts); a
// postcodes.io name is read up to its comma ("Bristol, City of" is Bristol)
const placeKey = (v: string) => v.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
// "Newcastle" is short for "Newcastle upon Tyne" and "Stoke" for "Stoke-on-Trent", but "North" isn't "North Reddish": a short name
// matches only a longer one that goes on with upon, on, under, in, le or by
const sameTown = (typed: string, name: string | null | undefined) => {
  const a = placeKey(typed)
  const b = placeKey((name ?? '').split(',')[0])
  return Boolean(a && b) && (a === b || /^(upon|on|under|in|le|by) /.test(b.startsWith(`${a} `) ? b.slice(a.length + 1) : ''))
}
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}
const NEAR_KM = 40 // a town typed as "London" for a venue in Uxbridge is still right

type Place = { at: { lat: number; lng: number } | null; problem: { field: 'postcode' | 'city'; message: string } | null; unchecked: boolean }
const point = (r: { latitude?: number | null; longitude?: number | null }) => (typeof r.latitude === 'number' && typeof r.longitude === 'number' ? { lat: r.latitude, lng: r.longitude } : null)
const UNCHECKED: Place = { at: null, problem: null, unchecked: true }

/**
 * A venue's place, checked when it is saved: its position (from the postcode) and, when something is wrong, what to fix.
 * The postcode must exist and still be in use, and the town must be a UK place near it (or one of the postcode's own areas: its
 * district, county, ward, parish or region), so a typing slip, a made-up postcode or a town abroad never becomes a public town
 * page. If postcodes.io can't be asked, nothing is refused: the answer is `unchecked` (saved without a position, checked again
 * later).
 */
export async function placeVenue(postcode: string, town: string): Promise<Place> {
  const compact = postcode.replace(/\s+/g, '')
  const pc = await ask(`/postcodes/${encodeURIComponent(compact)}`)
  if (!pc) return UNCHECKED
  let at: { lat: number; lng: number } | null = null
  let areas: (string | null | undefined)[] = []
  if (pc.ok) {
    const r = pc.result as { latitude?: number | null; longitude?: number | null; admin_district?: string; admin_county?: string; admin_ward?: string; parish?: string; region?: string }
    at = point(r)
    areas = [r.admin_district, r.admin_county, r.admin_ward, r.parish?.replace(/, unparished area$/i, '')]
    // the region only as a whole name ("London"): its first word alone ("South" of "South East") is no town
    if (r.region && placeKey(town) === placeKey(r.region)) return { at, problem: null, unchecked: false }
  } else {
    // a postcode that is no longer used (M1 1AA since 2009) can't be found on the map: refused
    const old = await ask(`/terminated_postcodes/${encodeURIComponent(compact)}`)
    if (!old) return UNCHECKED
    if (old.ok) return { at: null, problem: { field: 'postcode', message: `${postcode} is no longer in use. Enter the venue's current postcode.` }, unchecked: false }
    // one too new for the open data yet is placed by its district (the part before the space, M1 of M1 1AE); a district that
    // doesn't exist either (ZZ99 9ZZ) means the postcode is made up or mistyped: refused
    const out = await ask(`/outcodes/${encodeURIComponent(compact.slice(0, -3))}`)
    if (!out) return UNCHECKED
    if (!out.ok) return { at: null, problem: { field: 'postcode', message: `We couldn't find ${postcode}. Check the postcode.` }, unchecked: false }
    const o = out.result as { latitude?: number | null; longitude?: number | null; admin_district?: string[]; admin_county?: string[]; admin_ward?: string[]; parish?: string[] }
    at = point(o)
    areas = [...(o.admin_district ?? []), ...(o.admin_county ?? []), ...(o.admin_ward ?? []), ...(o.parish ?? []).map((p) => p.replace(/, unparished area$/i, ''))]
  }
  if (areas.some((a) => sameTown(town, a))) return { at, problem: null, unchecked: false }
  const places = await ask(`/places?q=${encodeURIComponent(placeKey(town))}&limit=100`)
  // the town couldn't be checked: no position yet, so it isn't used as a town page until it is
  if (!places) return UNCHECKED
  if (!places.ok) return { at, problem: null, unchecked: false }
  const list = ((places.result as { name_1?: string; name_2?: string; latitude?: number; longitude?: number }[] | null) ?? []).filter((p) => sameTown(town, p.name_1) || sameTown(town, p.name_2))
  const near = list.some((p) => !at || (typeof p.latitude === 'number' && typeof p.longitude === 'number' && km(at, { lat: p.latitude, lng: p.longitude }) <= NEAR_KM))
  if (near) return { at, problem: null, unchecked: false }
  return {
    at,
    problem: {
      field: 'city',
      message: list.length ? `${town.trim()} isn't near ${postcode}. Check the town and the postcode.` : `We couldn't find ${town.trim()} in the UK. Enter the town or city the venue is in.`,
    },
    unchecked: false,
  }
}
