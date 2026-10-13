import { useEffect, useState } from "react";
import { pw, seedProvider } from "@/data/providerWorkspace";
import { formatPrice } from "@/lib/format";

// The provider workspace's reads and writes. There is no provider API yet (front end only), so the records start from
// seedProvider() and every change made in the workspace is kept in this browser (localStorage `rt-provider`), with an event so
// every open page reads again. DEMO: swap read/update for API calls later; the pages only depend on the shapes useProvider()
// returns and on the actions below. Browser-only: call from effects and handlers.

const KEY = "rt-provider";
export const PROVIDER_EVENT = "rt-provider-change";
export const DAY = 86400000;
const VERSION = 1;

const readRaw = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) || "null");
    if (saved && saved.version === VERSION) return saved;
  } catch {}
  const fresh = seedProvider(Date.now());
  write(fresh);
  return fresh;
};
const write = (next) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
};

// one change: read, change, save, tell the open pages. `fn` changes the record in place and may return a value (a new id).
export function updateProvider(fn) {
  const state = readRaw();
  const out = fn(state);
  write(state);
  try {
    window.dispatchEvent(new Event(PROVIDER_EVENT));
  } catch {}
  return out;
}

// DEMO: start again from the demo records (Settings has no button for this; used by tests).
export const resetProvider = () => {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(PROVIDER_EVENT));
  } catch {}
};

// ---- small helpers ---------------------------------------------------------------------------------------------------------

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const round2 = (n) => Math.round(n * 100) / 100;
const nextId = (prefix, list, key = "id") => {
  const n = list.reduce((m, x) => Math.max(m, Number(String(x[key]).replace(/\D/g, "")) || 0), 0);
  return `${prefix}${n + 1}`;
};
const notify = (state, text, href) => {
  state.notifications.unshift({ id: nextId("N", state.notifications), at: Date.now(), text, href, read: false });
};
export const learnerName = (l) => (l ? `${l.first} ${l.last}`.trim() : "");
export const customerName = (c) => `${c.first} ${c.last}`.trim();

// "09:30 to 16:30"
export const timeRange = (s) => `${s.from} to ${s.to}`;
// the first and last day of a cohort
export const cohortSpan = (k) => {
  const days = k.sessions.map((s) => s.date).sort();
  const ends = k.sessions.map((s) => s.end || s.date).sort();
  return { first: days[0], last: ends[ends.length - 1] };
};

// ---- money -----------------------------------------------------------------------------------------------------------------

// What an order earns the provider. The card fee (3%) comes off the gross first and is kept on refunds; commission (30%) is taken
// on ReadTraining marketplace sales only, on what is left after refunds and the card fee. Unpaid, cancelled and disputed orders
// earn nothing until they are settled.
export function orderMoney(o) {
  const settled = ["paid", "partial", "refunded"].includes(o.status);
  if (!settled) return { gross: 0, fee: 0, commission: 0, net: 0, held: o.status === "dispute" ? o.total : 0 };
  const fee = ["card", "link"].includes(o.payment) ? round2((o.total * pw.fee.card) / 100) : 0;
  const kept = Math.max(0, o.total - o.refunded);
  const commission = o.channel === "marketplace" ? round2((Math.max(0, kept - fee) * pw.fee.commission) / 100) : 0;
  return { gross: o.total, fee, commission, net: round2(kept - fee - commission), held: 0 };
}

// ---- derived view ----------------------------------------------------------------------------------------------------------

export function cohortStatus(k, enrolments, today = todayIso()) {
  if (k.cancelled) return "cancelled";
  const mine = enrolments.filter((e) => e.cohortId === k.id);
  const passed = mine.filter((e) => e.result === "pass");
  const certs = passed.filter((e) => e.certificate);
  if (certs.length && certs.length === passed.length && mine.every((e) => e.result)) return "certificated";
  if (certs.length) return "partial";
  const { first, last } = cohortSpan(k);
  if (last < today) return "completed";
  if (first <= today) return "progress";
  return "upcoming";
}

export const canDeleteCourse = (s, id) => !s.orders.some((o) => o.lines.some((l) => l.courseId === id)) && !s.enrolments.some((e) => e.courseId === id);
export const canChangeFormat = (s, id) => !s.orders.some((o) => o.lines.some((l) => l.courseId === id));
export const venueInUse = (s, id) => s.cohorts.some((k) => k.venueId === id && !k.cancelled && cohortSpan(k).last >= todayIso());
export const packageCourses = (s, id) => s.courses.filter((c) => c.pricing.type === "tiered" && c.pricing.packageId === id);

// Everything the pages read, worked out once per change.
function derive(s) {
  const today = todayIso();
  const course = Object.fromEntries(s.courses.map((c) => [c.id, c]));
  const learner = Object.fromEntries(s.learners.map((l) => [l.id, l]));
  const venue = Object.fromEntries(s.venues.map((v) => [v.id, v]));
  const member = Object.fromEntries(s.team.map((t) => [t.id, t]));
  const pack = Object.fromEntries(s.packages.map((p) => [p.id, p]));

  const cohorts = s.cohorts.map((k) => {
    const booked = s.enrolments.filter((e) => e.cohortId === k.id);
    const span = cohortSpan(k);
    return { ...k, ...span, status: cohortStatus(k, s.enrolments, today), booked: booked.length, left: Math.max(0, k.max - booked.length), course: course[k.courseId], venue: venue[k.venueId], tutor: member[k.tutorId] };
  });
  const cohort = Object.fromEntries(cohorts.map((k) => [k.id, k]));

  const orders = s.orders.map((o) => ({ ...o, money: orderMoney(o) }));

  // payouts: each settled order goes in the first payout dated on or after it
  const payoutsSorted = [...s.payouts].sort((a, b) => a.date.localeCompare(b.date));
  const inPayout = {};
  orders.forEach((o) => {
    if (!o.money.net) return;
    const p = payoutsSorted.find((x) => x.date >= isoDay(o.at));
    if (p) (inPayout[p.id] ||= []).push(o.ref);
  });
  const payouts = payoutsSorted.map((p) => ({ ...p, orders: inPayout[p.id] || [], amount: round2((inPayout[p.id] || []).reduce((t, ref) => t + orders.find((o) => o.ref === ref).money.net, 0)) })).reverse();

  // transactions: sale, card fee and commission, refunds, disputes, cancellations and payouts
  const tx = [];
  orders.forEach((o) => {
    const m = o.money;
    if (o.status === "cancelled") tx.push({ at: o.at, type: "cancel", ref: o.ref, amount: 0, text: "Order cancelled before payment" });
    if (o.status === "dispute") tx.push({ at: o.at + 2 * DAY, type: "dispute", ref: o.ref, amount: -o.total, text: "Held while the card dispute is open" });
    if (!m.gross) return;
    tx.push({ at: o.at, type: "purchase", ref: o.ref, amount: o.total, text: `${course[o.lines[0].courseId]?.title || "Course"} × ${o.lines[0].qty}` });
    if (m.fee) tx.push({ at: o.at, type: "fee", ref: o.ref, amount: -m.fee, text: `Card fee ${pw.fee.card}%` });
    if (m.commission) tx.push({ at: o.at, type: "fee", ref: o.ref, amount: -m.commission, text: `Commission ${pw.fee.commission}%` });
    if (o.refunded) {
      const r = s.refunds.find((x) => x.orderRef === o.ref && x.status === "approved");
      tx.push({ at: r?.decided || o.at + DAY, type: "refund", ref: o.ref, amount: -o.refunded, text: "Refund to the customer" });
    }
  });
  payouts.forEach((p) => p.amount && p.status === "paid" && tx.push({ at: Date.parse(`${p.date}T09:00:00Z`), type: "payout", ref: p.id, amount: -p.amount, text: "Paid to your bank account" }));
  tx.sort((a, b) => b.at - a.at);
  const transactions = tx.map((t, i) => ({ ...t, id: `TX-${String(tx.length - i).padStart(4, "0")}` }));

  const enrolments = s.enrolments.map((e) => ({ ...e, learner: learner[e.learnerId], course: course[e.courseId], cohort: cohort[e.cohortId] }));

  const checklist = {
    profile: Boolean(s.org.headline && s.org.bio && s.org.policy),
    course: s.courses.some((c) => c.status === "approved" || c.status === "pending"),
    cohort: cohorts.some((k) => k.status === "upcoming"),
    payouts: s.org.payout.connected,
  };

  return {
    ...s,
    today,
    byId: { course, learner, venue, member, pack, cohort },
    cohorts, orders, payouts, transactions, enrolments, checklist,
    counts: {
      reviews: s.reviews.filter((r) => !r.reply).length,
      refunds: s.refunds.filter((r) => r.status === "open").length,
      unread: s.notifications.filter((n) => !n.read).length,
      leads: s.leads.filter((l) => l.status === "new").length,
      questions: s.qa.filter((q) => !q.answer).length,
    },
  };
}

// The workspace's records and derived lists; null on the server and the first render, then the stored state.
export function useProvider() {
  const [data, setData] = useState(null);
  useEffect(() => {
    const load = () => setData(derive(readRaw()));
    load();
    const onStorage = (e) => e.key === KEY && load();
    window.addEventListener(PROVIDER_EVENT, load);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PROVIDER_EVENT, load);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return data;
}

// ---- courses ---------------------------------------------------------------------------------------------------------------

export const createCourse = (format) => updateProvider((s) => {
  const id = nextId("C", s.courses);
  s.courses.unshift({
    id, title: "", subtitle: "", details: "", format, level: "beginner", category: "", features: [], objectives: [], topics: [], faqs: [], venues: [], media: [],
    status: "draft", enrolment: "public", pricing: { type: "flat", price: 0 }, curriculum: [],
    settings: { modes: [], clr: { enabled: false, fields: ["name", "result"], custom: [] }, reschedule: { enabled: false, paid: false, fee: 0 }, resit: { exam: false, allowed: false, paid: false, title: "", price: 0 }, confirmation: "", seo: { title: "", description: "", keywords: [] }, marketplace: true },
    updated: Date.now(), rating: 0,
  });
  return id;
});
// replace top-level fields (title, objectives, pricing, curriculum…); a live course goes back to review when its page changes
export const saveCourse = (id, patch) => updateProvider((s) => {
  const c = s.courses.find((x) => x.id === id);
  if (!c) return;
  Object.assign(c, patch, { updated: Date.now() });
});
export const saveCourseSettings = (id, key, value) => updateProvider((s) => {
  const c = s.courses.find((x) => x.id === id);
  if (!c) return;
  c.settings[key] = value;
  c.updated = Date.now();
});
export const submitCourse = (id) => updateProvider((s) => {
  const c = s.courses.find((x) => x.id === id);
  if (!c) return;
  c.status = "pending";
  c.updated = Date.now();
  notify(s, `${c.title || "Your course"} was sent for review`, `/provider/courses/${id}`);
});
export const duplicateCourse = (id) => updateProvider((s) => {
  const c = s.courses.find((x) => x.id === id);
  if (!c) return null;
  const copy = JSON.parse(JSON.stringify(c));
  copy.id = nextId("C", s.courses);
  copy.title = `Copy of ${c.title || "untitled course"}`.slice(0, 80);
  copy.status = "draft";
  copy.updated = Date.now();
  copy.rating = 0;
  s.courses.unshift(copy);
  return copy.id;
});
export const deleteCourse = (id) => updateProvider((s) => {
  if (!canDeleteCourse(s, id)) return false;
  s.courses = s.courses.filter((c) => c.id !== id);
  s.cohorts = s.cohorts.filter((k) => k.courseId !== id);
  s.qa = s.qa.filter((q) => q.courseId !== id);
  return true;
});

// ---- cohorts ---------------------------------------------------------------------------------------------------------------

// add or change a run of a course; returns its id
export const saveCohort = (k) => updateProvider((s) => {
  if (k.id) {
    const i = s.cohorts.findIndex((x) => x.id === k.id);
    if (i >= 0) s.cohorts[i] = { ...s.cohorts[i], ...k };
    return k.id;
  }
  const id = nextId("K", s.cohorts);
  s.cohorts.push({ cancelled: false, details: "", tutorId: "", venueId: "", packageId: "", ...k, id });
  return id;
});
export const cancelCohort = (id) => updateProvider((s) => {
  const k = s.cohorts.find((x) => x.id === id);
  if (!k) return;
  k.cancelled = true;
  const n = s.enrolments.filter((e) => e.cohortId === id).length;
  notify(s, `Cohort cancelled. ${n} ${n === 1 ? "learner was" : "learners were"} told and offered another date or a refund.`, `/provider/cohorts/${id}`);
});
export const setAttendance = (enrolmentId, attended) => updateProvider((s) => {
  const e = s.enrolments.find((x) => x.id === enrolmentId);
  if (e) {
    e.attended = attended;
    if (!attended) e.result = null;
  }
});
export const setResult = (enrolmentId, result) => updateProvider((s) => {
  const e = s.enrolments.find((x) => x.id === enrolmentId);
  if (e && !e.certificate) e.result = result;
});
export const saveRecord = (enrolmentId, clr) => updateProvider((s) => {
  const e = s.enrolments.find((x) => x.id === enrolmentId);
  if (e) e.clr = { ...e.clr, ...clr };
});
// certificates for everyone in the cohort who passed and has none yet; returns how many were issued
export const issueCertificates = (cohortId) => updateProvider((s) => {
  let n = 0;
  s.enrolments.filter((e) => e.cohortId === cohortId && e.result === "pass" && !e.certificate).forEach((e) => {
    n += 1;
    e.certificate = { no: `NF-${cohortId}-${e.id.replace(/\D/g, "")}`, issued: Date.now() };
  });
  return n;
});

// ---- learners and orders ---------------------------------------------------------------------------------------------------

export const findLearner = (s, email) => s.learners.find((l) => l.email.toLowerCase() === email.trim().toLowerCase()) || null;

// A manual order. lines: [{ courseId, cohortId, plan, price, learners: [{ id } | { first, last, email, phone }] }].
// Card and free orders are paid at once; a payment link or an offline payment stays Incomplete until it is marked paid.
export const createOrder = ({ customer, lines, payment, receipt, joining }) => updateProvider((s) => {
  const ref = `NF-${s.orders.reduce((m, o) => Math.max(m, Number(o.ref.replace(/\D/g, ""))), 24800) + 1}`;
  const ensure = (p) => {
    if (p.id) return p.id;
    const found = findLearner(s, p.email);
    if (found) return found.id;
    const id = nextId("L", s.learners);
    s.learners.push({ id, first: p.first, last: p.last, email: p.email, phone: p.phone || "", company: customer.company || "", added: Date.now() });
    return id;
  };
  const builtLines = lines.map((l) => ({ courseId: l.courseId, cohortId: l.cohortId || "", plan: l.plan || "", price: payment === "free" ? 0 : Number(l.price), qty: l.learners.length, learnerIds: l.learners.map(ensure) }));
  const status = payment === "card" || payment === "free" ? "paid" : "incomplete";
  const notes = [];
  if (receipt) notes.push({ at: Date.now(), who: s.me.name, text: "Receipt emailed to the customer." });
  if (joining) notes.push({ at: Date.now(), who: s.me.name, text: "Joining instructions emailed to each learner." });
  if (payment === "link") notes.push({ at: Date.now(), who: s.me.name, text: `Payment link sent to ${customer.email}.` });
  s.orders.unshift({ ref, at: Date.now(), channel: "manual", status, payment, customer, lines: builtLines, total: builtLines.reduce((t, l) => t + l.price * l.qty, 0), refunded: 0, notes });
  builtLines.forEach((l) => l.learnerIds.forEach((learnerId) => {
    s.enrolments.push({ id: nextId("E", s.enrolments), orderRef: ref, cohortId: l.cohortId, courseId: l.courseId, learnerId, attended: null, result: null, certificate: null, progress: l.cohortId ? null : 0, clr: {} });
  }));
  return ref;
});
export const markOrderPaid = (ref) => updateProvider((s) => {
  const o = s.orders.find((x) => x.ref === ref);
  if (o && o.status === "incomplete") {
    o.status = "paid";
    o.notes.unshift({ at: Date.now(), who: s.me.name, text: "Marked as paid." });
  }
});
export const cancelOrder = (ref, reason) => updateProvider((s) => {
  const o = s.orders.find((x) => x.ref === ref);
  if (!o || o.status !== "incomplete") return;
  o.status = "cancelled";
  o.notes.unshift({ at: Date.now(), who: s.me.name, text: `Cancelled: ${reason}` });
  s.enrolments = s.enrolments.filter((e) => e.orderRef !== ref);
});
// refund part or all of a paid order; a learner's place is removed when their id is given
export const refundOrder = (ref, amount, reason, learnerId) => updateProvider((s) => {
  const o = s.orders.find((x) => x.ref === ref);
  if (!o) return;
  o.refunded = round2(Math.min(o.total, o.refunded + Number(amount)));
  o.status = o.refunded >= o.total ? "refunded" : "partial";
  o.notes.unshift({ at: Date.now(), who: s.me.name, text: `Refunded ${formatPrice(amount)}: ${reason}` });
  if (learnerId) s.enrolments = s.enrolments.filter((e) => !(e.orderRef === ref && e.learnerId === learnerId));
  if (o.status === "refunded") s.enrolments = s.enrolments.filter((e) => e.orderRef !== ref);
});
export const addOrderNote = (ref, text) => updateProvider((s) => {
  const o = s.orders.find((x) => x.ref === ref);
  if (o) o.notes.unshift({ at: Date.now(), who: s.me.name, text });
});
export const decideRefund = (id, approve, note) => {
  let req;
  updateProvider((s) => {
    req = s.refunds.find((r) => r.id === id);
    if (!req || req.status !== "open") return;
    req.status = approve ? "approved" : "declined";
    req.note = note;
    req.decided = Date.now();
  });
  if (approve && req) refundOrder(req.orderRef, req.amount, note || "Refund request approved", req.learnerId);
};

// ---- reviews, enquiries, questions -----------------------------------------------------------------------------------------

export const replyReview = (id, reply) => updateProvider((s) => {
  const r = s.reviews.find((x) => x.id === id);
  if (r) r.reply = reply;
});
export const setLeadStatus = (id, status) => updateProvider((s) => {
  const l = s.leads.find((x) => x.id === id);
  if (l) l.status = status;
});
export const answerQuestion = (id, answer) => updateProvider((s) => {
  const q = s.qa.find((x) => x.id === id);
  if (q) q.answer = answer;
});
export const addQuestion = (courseId, question, answer) => updateProvider((s) => {
  s.qa.unshift({ id: nextId("QA", s.qa), courseId, question, answer, from: "provider", at: Date.now() });
});
export const deleteQuestion = (id) => updateProvider((s) => {
  s.qa = s.qa.filter((q) => q.id !== id);
});

// ---- settings and libraries ------------------------------------------------------------------------------------------------

export const saveOrg = (patch) => updateProvider((s) => {
  Object.assign(s.org, patch);
});
// DEMO: only the last 4 digits are kept; the real bank details go to the payment provider, never to us
export const connectPayout = ({ holder, sort, account }) => updateProvider((s) => {
  s.org.payout = { connected: true, holder, sort: sort.replace(/\D/g, "").replace(/(\d{2})(\d{2})(\d{2})/, "$1-$2-$3"), last4: account.slice(-4) };
});
export const disconnectPayout = () => updateProvider((s) => {
  s.org.payout = { connected: false, holder: "", sort: "", last4: "" };
});

export const saveVenue = (v) => updateProvider((s) => {
  if (v.id) {
    const i = s.venues.findIndex((x) => x.id === v.id);
    if (i >= 0) s.venues[i] = { ...s.venues[i], ...v };
    return v.id;
  }
  const id = nextId("V", s.venues);
  s.venues.push({ active: true, ...v, id });
  return id;
});
export const setVenueActive = (id, active) => updateProvider((s) => {
  const v = s.venues.find((x) => x.id === id);
  if (v) v.active = active;
});
export const deleteVenue = (id) => updateProvider((s) => {
  if (venueInUse(s, id)) return false;
  s.venues = s.venues.filter((v) => v.id !== id);
  s.courses.forEach((c) => (c.venues = c.venues.filter((x) => x !== id)));
  return true;
});

export const saveFaq = (f) => updateProvider((s) => {
  if (f.id) {
    const i = s.faqs.findIndex((x) => x.id === f.id);
    if (i >= 0) s.faqs[i] = { ...s.faqs[i], ...f };
    return f.id;
  }
  const id = nextId("F", s.faqs);
  s.faqs.push({ ...f, id });
  return id;
});
export const deleteFaq = (id) => updateProvider((s) => {
  s.faqs = s.faqs.filter((f) => f.id !== id);
  s.courses.forEach((c) => (c.faqs = c.faqs.filter((x) => x !== id)));
});

const emptyTier = () => ({ price: 0, discount: 0, perks: [] });
export const savePackage = (p) => updateProvider((s) => {
  if (p.id) {
    const i = s.packages.findIndex((x) => x.id === p.id);
    if (i >= 0) s.packages[i] = { ...s.packages[i], ...p };
    return p.id;
  }
  const id = nextId("P", s.packages);
  s.packages.push({ name: "", active: true, features: [], tiers: { saver: emptyTier(), flexi: emptyTier(), premium: emptyTier() }, ...p, id, created: Date.now() });
  return id;
});
export const setPackageActive = (id, active) => updateProvider((s) => {
  const p = s.packages.find((x) => x.id === id);
  if (p) p.active = active;
});
export const deletePackage = (id) => updateProvider((s) => {
  if (packageCourses(s, id).length) return false;
  s.packages = s.packages.filter((p) => p.id !== id);
  return true;
});

export const inviteMember = (email, role) => updateProvider((s) => {
  if (s.team.some((t) => t.email.toLowerCase() === email.toLowerCase())) return false;
  s.team.push({ id: nextId("T", s.team), name: "", email, role, status: "pending" });
  return true;
});
export const changeRole = (id, role) => updateProvider((s) => {
  const t = s.team.find((x) => x.id === id);
  if (t && !t.owner) t.role = role;
});
export const removeMember = (id) => updateProvider((s) => {
  s.team = s.team.filter((t) => t.id !== id || t.owner);
  s.cohorts.forEach((k) => k.tutorId === id && (k.tutorId = ""));
});

export const markRead = (id) => updateProvider((s) => {
  const n = s.notifications.find((x) => x.id === id);
  if (n) n.read = true;
});
export const markAllRead = () => updateProvider((s) => {
  s.notifications.forEach((n) => (n.read = true));
});
