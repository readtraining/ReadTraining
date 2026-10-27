import { categoryName, methodName, subcategoryName } from "@/lib/taxonomy";

// Helpers the course pages and course cards share (the courses themselves come from the API: lib/catalogueServer.js on the
// server, lib/catalogueData.js for their shapes). Light enough for the browser.

// booking modes live in lib/courseModes.js, re-exported here for server code
export { bookableModes, firstSession, defaultMode } from "@/lib/courseModes";

// A catalogue course (lib/catalogueData.js toCatalogueCourse) in the shape home's course card (HomeCourseCard) reads.
export const toCourseCard = (c) => ({
  id: c.id,
  href: c.detailsHref,
  title: c.title,
  imageSrc: c.imageSrc,
  providers: c.providers,
  duration: c.duration,
  method: c.methods.map(methodName).join(" • "),
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
