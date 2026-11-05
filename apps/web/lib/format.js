// Shared formatting (fixed locale and time zone so the server and the browser print the same text). Kept apart from lib/courses
// so a client component (the basket, the header's mini basket) can format a price or a date without loading the catalogue.
const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatPrice = (n) => gbp.format(Number(n) || 0);
const dateFmt = (opts) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts });
// A day ("2026-07-17") that is a real date. Anything else (an old saved basket, a hand-edited address) prints as nothing
// instead of throwing, so one bad value can't break the page around it.
export const isDay = (iso) => {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(iso);
};
const day = (opts) => (iso) => (isDay(iso) ? dateFmt(opts).format(new Date(`${iso}T00:00:00Z`)) : "");
export const formatDate = day({ weekday: "short", day: "numeric", month: "short", year: "numeric" });
// "17 Jul 2026": dates in tables and lists, where the weekday is clutter
export const formatDay = day({ day: "numeric", month: "short", year: "numeric" });
export const formatShortDate = day({ day: "numeric", month: "short" });
export const formatMonthYear = day({ month: "long", year: "numeric" });
export const formatNumber = (n) => new Intl.NumberFormat("en-GB").format(n);
export const savePercent = (price, wasPrice) => (wasPrice > price ? Math.round((1 - price / wasPrice) * 100) : 0);

// "Tue 20 Oct to Sun 25 Oct 2026" for multi-day courses, a single date otherwise.
export const formatDateRange = (startIso, endIso) => {
  if (!endIso || endIso === startIso) return formatDate(startIso);
  const d = (iso, opts) => day(opts)(iso);
  return `${d(startIso, { weekday: "short", day: "numeric", month: "short" })} to ${d(endIso, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`.replace(/,/g, "");
};
