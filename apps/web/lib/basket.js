import { basket as copy } from "@/data/basket";

// The basket's rules and sums, in one place: the basket page, the checkout and the header all read these. A line is a course
// on one date (`sessionId`); `quantity` is its delegates; `selected` false leaves it out of this booking. Every way in adds a date;
// an older saved line without one asks for it in the basket's date pop-up. Swap the promo lookup for an API call later.

// the package chosen on a date sold in packages (`bundle`, a provider's price plan) is part of the line: the same date with
// another package is another line
export const lineKey = (item) => `${item.id}:${item.sessionId || ""}${item.bundle?.key ? `:${item.bundle.key}` : ""}`;
export const MAX_DELEGATES = 20;
// the most delegates one line can have: 20, or fewer when its date has fewer places
export const maxDelegates = (item) => Math.min(MAX_DELEGATES, Number(item.places) || MAX_DELEGATES);
// A ticked line is part of this booking; unticked lines stay in the basket for later and are left out of the total and payment.
export const isSelected = (item) => item.selected !== false;

// The basket line for a course on one session (from the course page, the catalogue card's date pop-up or a date changed in the
// basket). A date sold in packages keeps them on the line (`packages`, for "Change package") with the one chosen (`pkgKey`): the
// line's price is that package's. Without one chosen yet the line asks for it (lineIssues).
export const lineFor = (course, session, pkgKey = null) => ({
  id: course.id,
  title: course.title,
  imageSrc: course.imageSrc,
  slug: course.slug,
  subject: course.subject,
  ...priced(session, session.packages?.find((p) => p.key === pkgKey) ?? null),
  packages: session.packages ?? null,
  sessionId: session.id,
  mode: session.mode,
  date: session.date,
  endDate: session.endDate,
  time: session.time,
  venue: session.address,
  city: session.city,
  postcode: session.postcode,
  provider: session.provider,
  providerSlug: session.providerSlug ?? null,
  skillSaver: Boolean(session.skillSaver), // in Skill Saver: the learner's discount comes off this line
  places: session.places ?? null,
});

// One line per course and date: an undated line goes once the same course has a dated one, and the same course on the same date
// twice becomes one line with the delegates added up (a date changed in the basket onto a date already there).
export function mergeLines(list) {
  const out = [];
  for (const item of list) {
    if (!item.sessionId && list.some((o) => o.id === item.id && o.sessionId)) continue;
    const twin = out.find((o) => lineKey(o) === lineKey(item));
    if (twin) twin.quantity = Math.min(maxDelegates(twin), (Number(twin.quantity) || 1) + (Number(item.quantity) || 1));
    else out.push({ ...item });
  }
  return out;
}
export { modeLabel } from "@/lib/courseModes";
export const hasDate = (item) => Boolean(item.sessionId && item.date);

const basePrice = (item) => Number(item.price ?? item.discountedPrice) || 0;
const wasBase = (item) => {
  const was = Number(item.wasPrice ?? item.originalPrice) || 0;
  return was > basePrice(item) ? was : 0;
};
const rule = (list, item) => item.mode === "classroom" && list.subjects.includes(item.subject);
export const needsFirstAid = (item) => rule(copy.firstAid, item);

// The price fields of a line: the chosen package's price (and its was-price, from its "Save £"), or the date's own.
function priced(session, pkg) {
  if (!pkg) return { price: session.price, wasPrice: session.wasPrice ?? session.price, bundle: null };
  return { price: pkg.price, wasPrice: pkg.wasPrice ?? pkg.price, bundle: { key: pkg.key, name: pkg.name } };
}
// A line sold in packages: the change that chooses package `key` (its price and name). Null when the line has no such package.
export const choosePackage = (item, key) => {
  const pkg = item.packages?.find((p) => p.key === key);
  return pkg ? { price: pkg.price, wasPrice: pkg.wasPrice ?? pkg.price, bundle: { key: pkg.key, name: pkg.name } } : null;
};
// the package a line was booked with ({ key, name }), or null
export const bundleOf = (item) => (item.bundle?.key ? item.bundle : null);
// a line on a date sold in packages with none chosen yet (its date was changed in the basket to one on another plan)
export const needsPackage = (item) => Boolean(item.packages?.length) && !item.packages.some((p) => p.key === item.bundle?.key);

// What one delegate pays and what it would have been without offers, then the line's totals.
export function lineParts(item) {
  const addOn = needsFirstAid(item) && item.firstAid === "add" ? copy.firstAid.add.price : 0;
  const addOnWas = addOn && copy.firstAid.add.wasPrice > addOn ? copy.firstAid.add.wasPrice : 0;
  const unit = basePrice(item) + addOn;
  const unitWas = wasBase(item) ? wasBase(item) + addOnWas : addOnWas ? unit - addOn + addOnWas : 0;
  const quantity = Math.min(maxDelegates(item), Math.max(1, Number(item.quantity) || 1)); // a date changed to one with fewer places
  return { unit, unitWas: unitWas > unit ? unitWas : 0, quantity, total: unit * quantity, was: unitWas > unit ? unitWas * quantity : 0, addOn };
}

// What stops a line from going to payment (shown on the line, and listed under the Proceed button).
export function lineIssues(item) {
  const issues = [];
  if (!hasDate(item)) issues.push("Choose a date");
  else if (needsPackage(item)) issues.push("Choose a package");
  else if (needsFirstAid(item) && !item.firstAid) issues.push("Confirm your first aid qualification");
  return issues;
}

export const promoFor = (code) => {
  const key = String(code || "").trim().toUpperCase();
  const found = copy.promo.codes[key];
  return found ? { code: key, ...found } : null;
};

const round2 = (n) => Math.round(n * 100) / 100;

// The sums for some lines. `saver` is the signed-in learner's Skill Saver level (lib/useSkillSaver.js), or null: its discount
// comes off each Skill Saver course's line total, then a promo code applies to what is left. `saverEligible` says whether any
// line is a Skill Saver course (the basket asks signed-out visitors to log in for it). DEMO: once there is a backend the server
// works out the Skill Saver discount and the price charged; the browser only shows them.
export function basketTotals(items, promo = null, saver = null) {
  const parts = items.map(lineParts);
  const subtotal = parts.reduce((sum, p) => sum + p.total, 0);
  const saving = parts.reduce((sum, p) => sum + (p.was ? p.was - p.total : 0), 0);
  const saverEligible = items.some((item) => item.skillSaver);
  const saverAmount = saver ? round2(items.reduce((sum, item, i) => sum + (item.skillSaver ? (parts[i].total * saver.discount) / 100 : 0), 0)) : 0;
  const skillSaver = saverAmount > 0 ? { level: saver.level, percent: saver.discount, amount: saverAmount } : null;
  const afterSaver = round2(subtotal - saverAmount);
  const discount = promo ? Math.round(afterSaver * promo.percent) / 100 : 0;
  const delegates = parts.reduce((sum, p) => sum + p.quantity, 0);
  return { subtotal, saving, skillSaver, saverEligible, discount, total: round2(afterSaver - discount), delegates };
}

// Everything that stops the basket going to payment, one sentence each, naming the course.
export const basketIssues = (items) => items.flatMap((item) => lineIssues(item).map((issue) => `${issue}: ${item.title}`));
