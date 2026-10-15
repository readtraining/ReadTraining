import { testCentres } from "@/data/testCentres";

// Finding a CSCS test centre, used in the browser (the directory and the test page's finder), so it imports the small centre list
// only. A postcode or town is turned into a location with postcodes.io (the free UK postcode service); the centres are then sorted
// by straight-line distance. If the lookup fails, centres whose town or postcode matches the words are shown instead.
export const PROVIDER = "Pearson VUE";
export const centreName = (c) => `${c.town} Test Centre`;
export const allCentres = () => [...testCentres].sort((a, b) => a.town.localeCompare(b.town));

const toRad = (d) => (d * Math.PI) / 180;
export function distanceMiles(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}
export const nearestTo = (point, list = testCentres) =>
  list.map((c) => ({ ...c, miles: distanceMiles(point, c) })).sort((a, b) => a.miles - b.miles);

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export function matchText(query, list = allCentres()) {
  const q = norm(query);
  if (!q) return list;
  return list.filter((c) => norm(c.town).includes(q) || norm(c.postcode).startsWith(q) || norm(c.address.join(" ")).includes(q));
}

// A location for a postcode, part postcode (outward code) or place name; null when nothing is found or the service is down.
export async function locate(query) {
  const q = query.trim();
  if (!q) return null;
  const base = "https://api.postcodes.io";
  const get = async (url) => {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()).result;
  };
  try {
    if (/\d/.test(q)) {
      // a full postcode is checked first (postcodes.io answers 404 for one that doesn't exist); otherwise its first part is used
      if (await get(`${base}/postcodes/${encodeURIComponent(q)}/validate`)) {
        const full = await get(`${base}/postcodes/${encodeURIComponent(q)}`);
        if (full) return { lat: full.latitude, lng: full.longitude, label: full.postcode };
      }
      const outward = q.toUpperCase().split(/\s+/)[0];
      if (!/^[A-Z]{1,2}\d[A-Z\d]?$/.test(outward)) return null;
      const out = await get(`${base}/outcodes/${encodeURIComponent(outward)}`);
      if (out) return { lat: out.latitude, lng: out.longitude, label: out.outcode };
      return null;
    }
    const places = await get(`${base}/places?q=${encodeURIComponent(q)}&limit=1`);
    const p = places && places[0];
    return p ? { lat: p.latitude, lng: p.longitude, label: p.name_1 } : null;
  } catch {
    return null;
  }
}
