// UK postcodes: the format check, the standard way of writing one, and where it is on the map. The map position comes from
// postcodes.io (free, Open Government Licence data, no key), asked once when a venue is saved, so search can sort venues by
// real distance. Only the postcode is sent. If the lookup fails the venue is still saved, without a position.

export const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

/** "sw1a1aa" → "SW1A 1AA". */
export const formatPostcode = (v: string) =>
  v
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/^(.+)(\d[A-Z]{2})$/, '$1 $2')

export async function locatePostcode(postcode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.replace(/\s+/g, ''))}`, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const body = (await res.json()) as { result?: { latitude?: number | null; longitude?: number | null } }
    const { latitude, longitude } = body.result ?? {}
    return typeof latitude === 'number' && typeof longitude === 'number' ? { lat: latitude, lng: longitude } : null
  } catch {
    return null
  }
}
