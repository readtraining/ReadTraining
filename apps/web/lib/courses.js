import { buildCourseDetail, catalogueCourses } from "@/data/courseCatalogue";
import { categoryName, getTaxonomy, methodName, subcategoryName } from "@/lib/taxonomy";

// All reads for the course detail page go through here. Swap the bodies for API calls later.
// The lookup accepts a slug or the numeric id (old links and the demo data use ids; /course/<id> redirects to the slug).
// cached per catalogue list (the details carry its names), so a renamed method shows without a restart
let cache = new Map();
let cacheFor;

export function getCourseBySlug(slugOrId) {
  if (cacheFor !== getTaxonomy()) [cache, cacheFor] = [new Map(), getTaxonomy()];
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
  method: c.methods.map(methodName).join(" • "),
  rating: c.rating,
  ratingCount: c.rating ? c.popularity : 0,
  price: c.price,
  wasPrice: c.wasPrice,
  badge: c.badge || "",
  skillSaver: Boolean(c.skillSaver),
});

// names from the catalogue list (server code awaits loadTaxonomy() first)
export const getSubjectLabel = (course) => categoryName(course.subject);
export const getSubLabel = (course) => subcategoryName(course.subject, course.sub);

// ---- shared formatting: lib/format.js (re-exported, so everything keeps importing it from here) ----
export { formatPrice, formatDate, formatShortDate, formatMonthYear, formatNumber, savePercent, formatDateRange } from "@/lib/format";
