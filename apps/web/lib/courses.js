import { buildCourseDetail, catalogueCourses, filterGroups, getMethodLabel, subSubjects } from "@/data/courseCatalogue";
import { coursePath } from "@/lib/routes";

// All reads for the course detail page go through here. Swap the bodies for API calls later.
// The lookup accepts a slug or the numeric id (old links and the demo data use ids; /course/<id> redirects to the slug).
const cache = new Map();

export function getCourseBySlug(slugOrId) {
  const key = String(slugOrId);
  if (cache.has(key)) return cache.get(key);
  const base = catalogueCourses.find((c) => c.slug === key || String(c.id) === key);
  const detail = base ? buildCourseDetail(base) : null;
  cache.set(key, detail);
  return detail;
}

// A course's page (/course/<slug>) from its slug or catalogue id.
export function courseHref(slugOrId) {
  const key = String(slugOrId);
  const course = catalogueCourses.find((c) => c.slug === key || String(c.id) === key);
  return coursePath(course ? course.slug : key);
}

// How a course can be booked with a date, and the choice shown first: the most popular mode (the cheapest as the fallback), and
// in a mode its cheapest session (the earliest wins a tie), so it matches the "From" price on cards and the hero. The course page,
// the catalogue card's date pop-up and the basket all start from these.
export const bookableModes = (course) => ["classroom", "online", "ondemand"].filter((m) => course.sessions.some((s) => s.mode === m));
export const firstSession = (course, mode) => course.sessions.filter((s) => s.mode === mode).reduce((best, s) => (!best || s.price < best.price ? s : best), null);
export function defaultMode(course) {
  const dated = bookableModes(course);
  if (dated.includes(course.popularMode)) return course.popularMode;
  const cheapest = (m) => Math.min(...course.sessions.filter((s) => s.mode === m).map((s) => s.price));
  return [...dated].sort((a, b) => cheapest(a) - cheapest(b))[0];
}

// Related courses come back as plain catalogue courses (the shape the listing card expects, with detailsHref).
export function getRelatedCourses(course) {
  return (course.relatedSlugs || []).map((slug) => catalogueCourses.find((c) => c.slug === slug)).filter(Boolean);
}

// Catalogue courses by id, in the order given (unknown ids are skipped).
export function getCoursesByIds(ids) {
  return ids.map((id) => catalogueCourses.find((c) => c.id === id)).filter(Boolean);
}

// A catalogue course in the shape home's course card (HomeCourseCard) reads.
export const toCourseCard = (c) => ({
  id: c.id,
  href: c.detailsHref,
  title: c.title,
  imageSrc: c.imageSrc,
  providers: c.providers,
  duration: c.duration,
  method: c.methods.map(getMethodLabel).join(" • "),
  rating: c.rating,
  ratingCount: c.popularity,
  price: c.price,
  wasPrice: c.wasPrice,
});

export function getSubjectLabel(course) {
  return filterGroups[0].options.find((o) => o.value === course.subject)?.label || "";
}

export function getSubLabel(course) {
  return (subSubjects[course.subject] || []).find((x) => x.value === course.sub)?.label || "";
}

// ---- shared formatting: lib/format.js (re-exported, so everything keeps importing it from here) ----
export { formatPrice, formatDate, formatShortDate, formatMonthYear, formatNumber, savePercent, formatDateRange } from "@/lib/format";
