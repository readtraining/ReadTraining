import { buildCourseDetail, catalogueCourses, filterGroups, getMethodLabel, subSubjects } from "@/data/courseCatalogue";

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

// Course links and booking modes live in light modules (no catalogue), re-exported here for server code
export { courseHref } from "@/data/courseSlugs";
export { bookableModes, firstSession, defaultMode } from "@/lib/courseModes";

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
