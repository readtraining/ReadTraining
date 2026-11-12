import { licencesHub, licences } from "@/data/licences";
import { pickCourses } from "@/lib/catalogueData";
import { formatPrice, toCourseCard } from "@/lib/courses";

// Reads for the licence and card guides (/licences, /licences/<slug>). Swap these for API calls when licences live in the database.
export const licenceHref = (slug) => `/licences/${slug}`;
export const getLicenceSlugs = () => licences.map((l) => l.slug);
export const getLicence = (slug) => licences.find((l) => l.slug === slug) || null;
export const getGroup = (key) => licencesHub.groups.find((g) => g.key === key) || null;
export const relatedLicences = (l) => (l.related || []).map(getLicence).filter(Boolean);
// The live courses that lead to a licence (`l.courses`: picks, data/courseTopics.js), as the home page's course cards.
// `courses`: every live course (lib/catalogueServer.js loadCatalogue).
export const licenceCourses = (l, courses) => pickCourses(courses, l.courses || []).map(toCourseCard);

// The costs frame's rows with their amounts: a course row takes the lowest price of the live courses under its pick ("From
// £x"; "No dates listed yet" while none has a price), a fee row its fixed amount, a quote row its text. The estimated total adds
// the course and fee rows that are not optional; it reads "From" when a course price is in it. No total when nothing can be
// added up.
export function licenceCosts(l, courses) {
  const t = licencesHub.page;
  const price = (pick) => {
    const prices = pickCourses(courses, [pick], Infinity).map((c) => c.price).filter((p) => p != null);
    return prices.length ? Math.min(...prices) : undefined;
  };
  const rows = l.costs.rows.map((r) => {
    const amount = r.course ? price(r.course) : r.amount;
    const value = r.value || (r.course ? (amount === undefined ? t.noCourse : `${t.from} ${formatPrice(amount)}`) : amount === undefined ? "" : formatPrice(amount));
    return { ...r, amount, value };
  });
  const counted = rows.filter((r) => !r.optional && typeof r.amount === "number");
  const total = counted.length > 1 ? { label: t.total, value: `${counted.some((r) => r.course) ? `${t.from} ` : ""}${formatPrice(counted.reduce((sum, r) => sum + r.amount, 0))}` } : null;
  return { rows, total };
}
