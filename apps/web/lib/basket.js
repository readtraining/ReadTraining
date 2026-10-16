import { basket as copy } from "@/data/basket";
import { isSkillSaverCourse } from "@/lib/skillSaver";

// The basket's rules and sums, in one place: the basket page, the checkout and the header all read these. A line is a course
// on one date (`sessionId`); `quantity` is its delegates; `selected` false leaves it out of this booking. Every way in adds a date;
// an older saved line without one asks for it in the basket's date pop-up. Swap the promo lookup for an API call later.

export const lineKey = (item) => `${item.id}:${item.sessionId || ""}`;
export const MAX_DELEGATES = 20;
// A ticked line is part of this booking; unticked lines stay in the basket for later and are left out of the total and payment.
export const isSelected = (item) => item.selected !== false;

// The basket line for a course on one session (from the course page, the catalogue card's date pop-up or a date changed in the basket).
export const lineFor = (course, session) => ({
  id: course.id,
  title: course.title,
  imageSrc: course.imageSrc,
  slug: course.slug,
  subject: course.subject,
  price: session.price,
  wasPrice: session.wasPrice ?? session.price,
  sessionId: session.id,
  mode: session.mode,
  date: session.date,
  endDate: session.endDate,
  time: session.time,
  venue: session.address,
  city: session.city,
  postcode: session.postcode,
  provider: session.provider,
});

// One line per course and date: an undated line goes once the same course has a dated one, and the same course on the same date
// twice becomes one line with the delegates added up (a date changed in the basket onto a date already there).
export function mergeLines(list) {
  const out = [];
  for (const item of list) {
    if (!item.sessionId && list.some((o) => o.id === item.id && o.sessionId)) continue;
    const twin = out.find((o) => lineKey(o) === lineKey(item));
    if (twin) twin.quantity = Math.min(MAX_DELEGATES, (Number(twin.quantity) || 1) + (Number(item.quantity) || 1));
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
export const hasPackages = (item) => rule(copy.packages, item);
export const needsFirstAid = (item) => rule(copy.firstAid, item);

export const packageOf = (item) => copy.packages.items.find((p) => p.key === (item.package || "saver")) || copy.packages.items[0];

// What one delegate pays and what it would have been without offers, then the line's totals.
export function lineParts(item) {
  const pkg = hasPackages(item) ? packageOf(item).price : 0;
  const addOn = needsFirstAid(item) && item.firstAid === "add" ? copy.firstAid.add.price : 0;
  const addOnWas = addOn ? copy.firstAid.add.wasPrice : 0;
  const unit = basePrice(item) + pkg + addOn;
  const unitWas = wasBase(item) ? wasBase(item) + pkg + addOnWas : addOnWas ? unit - addOn + addOnWas : 0;
  const quantity = Math.max(1, Number(item.quantity) || 1);
  return { unit, unitWas: unitWas > unit ? unitWas : 0, quantity, total: unit * quantity, was: unitWas > unit ? unitWas * quantity : 0, pkg, addOn };
}

// What stops a line from going to payment (shown on the line, and listed under the Proceed button).
export function lineIssues(item) {
  const issues = [];
  if (!hasDate(item)) issues.push("Choose a date");
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
  const saverEligible = items.some((item) => isSkillSaverCourse(item.id));
  const saverAmount = saver ? round2(items.reduce((sum, item, i) => sum + (isSkillSaverCourse(item.id) ? (parts[i].total * saver.discount) / 100 : 0), 0)) : 0;
  const skillSaver = saverAmount > 0 ? { level: saver.level, percent: saver.discount, amount: saverAmount } : null;
  const afterSaver = round2(subtotal - saverAmount);
  const discount = promo ? Math.round(afterSaver * promo.percent) / 100 : 0;
  const delegates = parts.reduce((sum, p) => sum + p.quantity, 0);
  return { subtotal, saving, skillSaver, saverEligible, discount, total: round2(afterSaver - discount), delegates };
}

// Everything that stops the basket going to payment, one sentence each, naming the course.
export const basketIssues = (items) => items.flatMap((item) => lineIssues(item).map((issue) => `${issue}: ${item.title}`));
