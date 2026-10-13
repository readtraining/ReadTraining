import { locationCourses, slugify } from "@/data/home/menu";
import { getCourseBySlug } from "@/lib/courses";

// A course in a town or city (/course-locations/<course>-in-<city>, the Locations menu's links): the course page with its
// dates limited to that town's venues. Swap the bodies for API calls later.
// Returns null for an unknown course or town; `venues` is empty when the course has no venue there (the page then sends the
// visitor to the course finder).
export function getCourseLocation(slug) {
  const place = locationCourses.find((c) => c.id && slug.startsWith(`${c.locationSlug}-in-`));
  if (!place) return null;
  const city = place.places?.find((c) => slugify(c) === slug.slice(`${place.locationSlug}-in-`.length)); // only the towns the menu lists for this course
  const base = getCourseBySlug(place.id);
  if (!city || !base) return null;

  const sessions = base.sessions.filter((s) => s.mode === "classroom" && s.city.toLowerCase() === city.toLowerCase());
  const byVenue = new Map();
  for (const s of sessions) {
    const key = `${s.address}|${s.postcode}`;
    if (!byVenue.has(key)) byVenue.set(key, { name: s.address, postcode: s.postcode, next: s.date, from: s.price, count: 0 });
    const v = byVenue.get(key);
    v.count += 1;
    if (s.date < v.next) v.next = s.date;
    if (s.price < v.from) v.from = s.price;
  }
  const venues = [...byVenue.values()];
  const n = venues.length;
  const course = {
    ...base,
    title: `${base.title} in ${city}`,
    summary: `Complete your ${base.title} in ${city} at ${n === 1 ? "our venue" : `one of ${n} venues`}, with dates to suit your schedule.`,
    sessions,
  };
  return { place, city, course, venues };
}
