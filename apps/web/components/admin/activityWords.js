import { admin as A } from "@/data/admin";
import { actionLabel, formatWhen } from "./adminParts";

// An activity log entry (API admin.activity.list) in words, for the Activity log, the Dashboard and the learner and provider
// pages. What an entry stored beyond who, what and when is shown as one short line of the facts worth reading (a reason, a
// change from one value to another, an amount); an IP address, the browser, the sign-in level and internal ids are kept in the
// log for an investigation but never shown (UK GDPR: personal data, shown only where it is needed).

const copy = A.activity;
const s = copy.summary;
const ROLES = A.learners.detail.roles;
const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? "");
const CATALOGUE = new Set(["category", "subcategory", "topic", "method", "level"]);
const pounds = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `${n < 0 ? "−" : ""}£${Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const percent = (v) => (v === "default" ? s.platformDefault : `${v}%`);
const level = (v) => copy.values[v] ?? v;
const day = (v) => {
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
};
const fieldWords = (list) => {
  const words = [...new Set(list.map((f) => copy.fields[f] ?? String(f).replace(/([A-Z])/g, " $1").toLowerCase()))];
  return words.length > 4 ? `${words.slice(0, 4).join(", ")} and ${words.length - 4} more` : words.join(", ");
};

/** What happened: the action in words, and for a refused attempt what the person tried to do. */
export function entryLabel(e) {
  if (e.action !== "access.denied") return actionLabel(e.action);
  const what = copy.attempted[e.metadata?.attempted];
  return what ? fill(copy.refused, { what }) : copy.refusedSomething;
}

/** The facts worth reading, as one line ("" when there are none). */
export function entrySummary(e) {
  const m = e.metadata ?? {};
  const parts = [];
  const add = (text) => text && parts.push(text);
  const a = e.action;

  // a change from one value to another, where the action itself doesn't already say it
  if (a === "admin.updated" && m.from && m.to) add(fill(s.access, { v: `${level(m.from)} → ${level(m.to)}` }));
  else if (a === "provider.member_role_changed" && m.from && m.to) add(fill(s.role, { v: `${ROLES[m.from] ?? m.from} → ${ROLES[m.to] ?? m.to}` }));
  else if ((a === "admin.catalogue_renamed" || a === "provider.renamed" || a === "cohort.moved") && m.from && m.to) add(fill(s.change, { from: m.from, to: m.to }));
  if (m.fromPercent !== undefined && m.toPercent !== undefined) add(fill(s.commission, { from: percent(m.fromPercent), to: percent(m.toPercent) }));
  if (m.preset && a !== "admin.updated") add(fill(s.access, { v: level(m.preset) }));
  if (m.refundLimit !== undefined && m.refundLimit !== null) add(fill(s.refundLimit, { v: m.refundLimit }));
  if (m.role && a !== "provider.member_role_changed") add(fill(s.role, { v: ROLES[m.role] ?? m.role }));
  if (CATALOGUE.has(e.target?.type) && m.kind) add(copy.catalogueKinds[m.kind] ?? null);
  if (m.topic && typeof m.topic === "object" && m.topic.to) add(fill(s.topic, { v: m.topic.to }));
  if (m.method && a.startsWith("course.option_")) add(copy.methods[m.method] ?? m.method);
  if (m.startsOn) add(fill(s.startsOn, { v: day(m.startsOn) }));
  if (Array.isArray(m.fields) && m.fields.length) add(fill(s.fields, { v: fieldWords(m.fields) }));
  if (m.packagesChanged === true) add(s.packages);
  if (a === "provider.faqs_updated" && m.count !== undefined) add(fill(s.count, { v: m.count }));
  if (m.registered !== undefined) add(s.registered[String(m.registered)]);
  if (m.rating !== undefined && a.startsWith("admin.review_")) add(fill(s.rating, { v: m.rating }));
  if (a.startsWith("admin.coupon_") && m.value !== undefined && s.coupon[m.kind]) add(fill(s.coupon[m.kind], { v: m.value }));
  if (m.pounds !== undefined) add(pounds(m.pounds));
  if (m.sent !== undefined && m.of !== undefined) add(fill(s.sent, { sent: m.sent, of: m.of }));
  if (a === "admin.staff_access_ended" && s.ended[m.how]) add(s.ended[m.how]);
  if (typeof m.via === "string" && m.via.includes(":")) add(s.script);
  // a person's own words last: the reason, our team's message, the provider's note
  if (m.reason && typeof m.reason === "string") add(fill(s.reason, { v: m.reason }));
  if (m.message) add(fill(s.message, { v: m.message }));
  if (m.reply) add(fill(s.reply, { v: m.reply }));
  if (m.note) add(fill(s.note, { v: m.note }));
  if (m.staff) parts.unshift(s.staff);
  return parts.join(" · ");
}

/** What it affected, in words ("" when nothing: a sign-in, or a refused page with no account named). */
export function entryTarget(e) {
  const t = e.target;
  if (!t || t.type === "session") return "";
  if (CATALOGUE.has(t.type)) return e.metadata?.to ?? e.metadata?.name ?? t.label;
  if (t.type === "content") {
    const id = String(t.id ?? "");
    if (copy.contentKeys[id]) return copy.contentKeys[id];
    // an FAQ set or an email's wording by its name; any other key in words, never as a code
    const [kind, name] = id.includes(":") ? id.split(/:(.*)/s) : ["", id];
    const words = name.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
    if (kind === "faq") return `FAQs: ${words}`;
    if (kind === "email") return `Email: ${words}`;
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  // a refused page or request: the account it was on, or which part of the site
  if (t.type === "page" || t.type === "procedure") {
    if (e.organisation) return e.organisation;
    const part = String(t.type === "page" ? t.id : e.metadata?.attempted ?? "").replace(/^\//, "").split(/[/.]/)[0];
    return copy.pages[part] ?? "";
  }
  return t.label ?? "";
}

/** A run of the same entry: "4 times since 09:50" (with the day when it started on an earlier one). */
export function entryTimes(e) {
  if (!e.times || e.times < 2) return "";
  const first = new Date(e.firstAt);
  const sameDay = first.toDateString() === new Date(e.at).toDateString();
  const when = sameDay ? first.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : formatWhen(first.getTime());
  return fill(copy.times, { n: e.times, first: when });
}
