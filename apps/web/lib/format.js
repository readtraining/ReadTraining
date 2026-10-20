// Shared formatting (fixed locale and time zone so the server and the browser print the same text). Kept apart from lib/courses
// so a client component (the basket, the header's mini basket) can format a price or a date without loading the catalogue.
const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatPrice = (n) => gbp.format(Number(n) || 0);
const dateFmt = (opts) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts });
export const formatDate = (iso) => dateFmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${iso}T00:00:00Z`));
// "17 Jul 2026": dates in tables and lists, where the weekday is clutter
export const formatDay = (iso) => dateFmt({ day: "numeric", month: "short", year: "numeric" }).format(new Date(`${iso}T00:00:00Z`));
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
