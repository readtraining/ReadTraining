import { buildCourseDetail, catalogueCourses, filterGroups, subSubjects } from "@/data/courseCatalogue";

// All reads for the course detail page go through here. Swap the bodies for API calls later.
// The route segment is still /template/courses/[id] (every card links there), so the lookup accepts a slug or the numeric id.
const cache = new Map();

export function getCourseBySlug(slugOrId) {
  const key = String(slugOrId);
  if (cache.has(key)) return cache.get(key);
  const base = catalogueCourses.find((c) => c.slug === key || String(c.id) === key);
  const detail = base ? buildCourseDetail(base) : null;
  cache.set(key, detail);
  return detail;
}

// Related courses come back as plain catalogue courses (the shape the listing card expects, with detailsHref).
export function getRelatedCourses(course) {
  return (course.relatedSlugs || []).map((slug) => catalogueCourses.find((c) => c.slug === slug)).filter(Boolean);
}

export function getSubjectLabel(course) {
  return filterGroups[0].options.find((o) => o.value === course.subject)?.label || "";
}

export function getSubLabel(course) {
  return (subSubjects[course.subject] || []).find((x) => x.value === course.sub)?.label || "";
}

// ---- shared formatting (fixed locale and time zone so the server and the browser print the same text) ----
const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatPrice = (n) => gbp.format(Number(n) || 0);
const dateFmt = (opts) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts });
export const formatDate = (iso) => dateFmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${iso}T00:00:00Z`));
export const formatShortDate = (iso) => dateFmt({ day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00Z`));
export const formatMonthYear = (iso) => dateFmt({ month: "long", year: "numeric" }).format(new Date(`${iso}T00:00:00Z`));
export const formatNumber = (n) => new Intl.NumberFormat("en-GB").format(n);
export const savePercent = (price, wasPrice) => (wasPrice > price ? Math.round((1 - price / wasPrice) * 100) : 0);

// "Tue 20 Oct to Sun 25 Oct 2026" for multi-day courses, a single date otherwise.
export const formatDateRange = (startIso, endIso) => {
  if (!endIso || endIso === startIso) return formatDate(startIso);
  const d = (iso, opts) => dateFmt(opts).format(new Date(`${iso}T00:00:00Z`));
  return `${d(startIso, { weekday: "short", day: "numeric", month: "short" })} to ${d(endIso, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`.replace(/,/g, "");
};
