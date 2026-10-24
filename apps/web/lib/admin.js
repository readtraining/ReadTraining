import { useEffect, useState } from "react";
import { admin as A } from "@/data/admin";
import { catalogueCourses } from "@/data/courseCatalogue";
import { categoryName } from "@/lib/taxonomy";
import { certificates as seedCertificates } from "@/data/certificates";
import { getCourseBySlug } from "@/lib/courses";
import { ADMIN_EVENT, DAY, HOUR, addWorkingDays, currentAdmin, read, update } from "@/lib/adminStore";
import { buildWork } from "@/lib/adminWork";
import { buildReviews } from "@/lib/adminReviews";

// The admin's reads and writes. There is no admin API yet (front end only, see the admin plan's Scope), so the records come from
// data/admin.js and the live catalogue, and every decision made on the admin pages (an approval, a suspension, a refund, a note)
// is kept in this browser (localStorage). Swap the bodies for API calls later; the pages only depend on the
// shapes getAdmin() returns. Browser-only: call from effects.

// reading and saving live in lib/adminStore.js (shared with lib/adminWork.js)
export { ADMIN_EVENT } from "@/lib/adminStore";
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const round = (n) => Math.round(n * 100) / 100;
const pad = (n, w) => String(n).padStart(w, "0");

// working days (Saturdays and Sundays skipped) live in lib/adminStore.js
export { addWorkingDays } from "@/lib/adminStore";

// A deadline as words and a tone: "Due in 2 days" (ok), "Due today" (warn), "Overdue by 1 day" (late).
export function dueState(due, now = Date.now()) {
  const days = Math.floor((due - now) / DAY);
  if (due < now) {
    const late = Math.max(1, Math.ceil((now - due) / DAY));
    return { tone: "late", text: `Overdue by ${late} ${late === 1 ? "day" : "days"}` };
  }
  if (days < 1) return { tone: "warn", text: "Due today" };
  return { tone: days < 2 ? "warn" : "ok", text: `Due in ${days} ${days === 1 ? "day" : "days"}` };
}

// "2 hours ago", "3 days ago"
export function ago(ms, now = Date.now()) {
  const h = Math.floor((now - ms) / HOUR);
  if (h < 1) return "Just now";
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? "day" : "days"} ago`;
}


// ---- the records ------------------------------------------------------------------------------------------------------------

const providerFor = (course) => {
  const s = course.sessions.find((x) => x.mode === "classroom") || course.sessions[0];
  return { name: s?.provider || "ReadTraining provider", city: s?.city || "Online", mode: s?.mode || "online" };
};
const days = (course) => (/day/i.test(course.duration) ? Math.max(1, Math.round(parseFloat(course.duration))) : 1);

function buildOrders(saved, now) {
  const today = isoDay(now);
  return A.orderSeeds.map((o, i) => {
    const [who, company, courseId, inDays, qty, method, flag] = o;
    const course = getCourseBySlug(courseId);
    const [first, last] = A.people[who];
    const prov = providerFor(course);
    const start = now + inDays * DAY;
    const date = isoDay(start);
    const endDate = isoDay(start + (days(course) - 1) * DAY);
    const unit = Math.min(...course.sessions.map((s) => s.price));
    const total = round(unit * qty);
    // booked before the course and never in the future; several in the last week
    const booked = Math.min(start - (14 + ((i * 5) % 20)) * DAY, now - ((i * 7) % 9) * DAY - ((i % 5) + 1) * HOUR);
    const cancelled = flag === "cancelled";
    const endedAgo = (now - Date.parse(`${endDate}T17:00:00Z`)) / DAY;
    const money = cancelled ? "reversed" : endDate >= today ? "paid" : endedAgo < 10 ? "delivered" : endedAgo < 35 ? "transferred" : "paidout";
    const state = cancelled ? "cancelled" : endDate >= today ? "upcoming" : "completed";
    const ref = `RT-2026-${pad(104512 - i * 1373, 6)}`;
    const s = saved.orders?.[ref] || {};
    const events = [
      { at: booked, text: "Order placed" },
      { at: booked + 60000, text: method === "invoice" ? "Invoice raised on 30-day terms" : `Paid by ${A.orders.methods[method].toLowerCase()}` },
      { at: booked + 120000, text: "Confirmation emailed" },
      // providers send joining instructions about 6 days before; closer than that without them = at risk
      ...(inDays <= 6 && !cancelled ? [{ at: Math.min(now - HOUR, start - 6 * DAY), text: "Joining instructions sent by the provider" }] : []),
      ...(cancelled ? [{ at: booked + 4 * DAY, text: "Cancelled and refunded to card" }] : []),
      ...(money === "delivered" || money === "transferred" || money === "paidout" ? [{ at: Date.parse(`${endDate}T17:00:00Z`), text: "Session completed" }] : []),
      ...(money === "transferred" || money === "paidout" ? [{ at: Date.parse(`${endDate}T17:00:00Z`) + 2 * DAY, text: "Provider's share transferred" }] : []),
      ...(money === "paidout" ? [{ at: Date.parse(`${endDate}T17:00:00Z`) + 25 * DAY, text: "Paid out to the provider" }] : []),
      ...(s.events || []),
    ].filter((e) => e.at <= now).sort((a, b) => b.at - a.at);
    return {
      ref,
      booked,
      buyer: { name: `${first} ${last}`, email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`, company: company === null ? null : A.companies[company] },
      method,
      po: method === "invoice" ? `PO-${pad(4410 + i * 7, 5)}` : null,
      invoice: method === "invoice" ? `INV-2026-${pad(318 + i, 4)}` : null,
      total,
      state,
      lines: [{ courseId, title: course.title, provider: prov.name, city: prov.city, mode: prov.mode, date, endDate, qty, unit, money, delegates: Array.from({ length: Math.min(qty, 3) }, (_, k) => (k === 0 ? `${first} ${last}` : `${A.people[(who + k * 5) % A.people.length].join(" ")}`)) }],
      events,
      notes: s.notes || [],
    };
  });
}

function buildChanges(saved, orders, now) {
  return A.changeRequests.map((c) => {
    const order = orders[c.order];
    const s = saved.changes?.[c.id] || {};
    const status = s.status || c.status;
    const raised = now - c.daysAgo * DAY - 2 * HOUR;
    const slaDays = status === "evidence" ? A.sla.dispute : status === "approved" ? A.sla.refund : A.sla.provider;
    const from = status === "approved" ? s.at || raised + DAY : raised; // a refund's clock starts when the provider approves
    return {
      id: c.id,
      type: c.type,
      status,
      open: ["provider", "approved", "evidence"].includes(status),
      reason: c.reason,
      raised,
      due: addWorkingDays(from, slaDays),
      ref: order.ref,
      buyer: order.buyer,
      course: order.lines[0].title,
      provider: order.lines[0].provider,
      date: order.lines[0].date,
      amount: order.total,
      evidenceSent: s.evidenceSent || false,
      outcome: s.outcome || null,
      closedAt: s.at,
    };
  });
}

// ---- part 2: catalogue, sessions and venues, certificates and fees -----------------------------------------------------------

const hash = (...n) => n.reduce((h, x) => (h * 31 + x) % 9973, 7);

function buildCatalogue(saved, today) {
  return catalogueCourses.map((c) => {
    const course = getCourseBySlug(c.id);
    const dated = course.sessions.filter((s) => s.mode === "ondemand" || s.date >= today);
    const byProvider = {};
    course.sessions.forEach((s) => {
      const o = (byProvider[s.provider] ||= { provider: s.provider, modes: new Set(), from: Infinity, sessions: 0 });
      o.modes.add(s.mode);
      o.from = Math.min(o.from, s.price);
      if (s.mode === "ondemand" || s.date >= today) o.sessions += 1;
    });
    const offerings = Object.values(byProvider).map((o) => ({ ...o, modes: [...o.modes], status: saved.offerings?.[`${c.id}:${o.provider}`] || "live" }));
    return {
      id: c.id,
      title: c.title,
      slug: course.slug,
      subject: c.subject,
      category: categoryName(c.subject) || c.subject,
      duration: c.duration,
      validity: c.validity,
      level: c.level,
      methods: c.methods,
      from: Math.min(...course.sessions.map((s) => s.price)),
      upcoming: dated.length,
      offerings,
      preCourse: saved.preCourse?.[c.id] ?? A.preCourse.includes(c.id),
    };
  });
}

function buildSessions(saved, catalogue, now) {
  const today = isoDay(now);
  const out = [];
  catalogue.forEach((c) => {
    getCourseBySlug(c.id).sessions.forEach((s, n) => {
      if (s.mode === "ondemand" || s.date < today) return;
      const id = `${c.id}-${s.id}`;
      const o = saved.sessions?.[id] || {};
      const capacity = s.mode === "classroom" ? [12, 16, 20][hash(c.id, n) % 3] : 30;
      const booked = Math.min(capacity, hash(c.id, n, 3) % (capacity + 4));
      const daysAway = Math.round((Date.parse(`${s.date}T09:00:00Z`) - now) / DAY);
      return out.push({
        id,
        courseId: c.id,
        course: c.title,
        provider: s.provider,
        mode: s.mode,
        date: s.date,
        endDate: s.endDate,
        time: s.time,
        city: s.city || "Live online",
        venue: s.address || "Live online",
        postcode: s.postcode || "",
        capacity,
        booked: o.cancelled ? 0 : booked,
        daysAway,
        // providers send joining instructions about a week before; about one in four is late
        joiningSent: o.joiningSent ?? (daysAway <= 7 && hash(c.id, n, 9) % 4 !== 0),
        salesClosed: o.salesClosed ?? booked >= capacity,
        cancelled: o.cancelled || false,
        cancelReason: o.reason || "",
        preCourse: c.preCourse,
      });
    });
  });
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.course.localeCompare(b.course)));
}

function buildVenues(sessions) {
  const map = {};
  sessions.filter((s) => s.mode === "classroom").forEach((s) => {
    const v = (map[`${s.venue}|${s.postcode}`] ||= { name: s.venue, city: s.city, postcode: s.postcode, sessions: 0 });
    if (!s.cancelled) v.sessions += 1;
  });
  return Object.values(map)
    .map((v, i) => ({ ...v, capacity: [24, 30, 40, 20][i % 4], access: i % 3 ? "Step-free access, accessible toilet" : "Step-free access, hearing loop, accessible toilet" }))
    .sort((a, b) => a.city.localeCompare(b.city));
}

const validityYears = (text) => {
  const m = /(\d+)\s*year/i.exec(text || "");
  return m ? Number(m[1]) : null;
};
export const certState = (c, now = Date.now()) => {
  if (c.revoked) return "revoked";
  if (!c.expires) return "none";
  const left = (Date.parse(c.expires) - now) / DAY;
  return left < 0 ? "expired" : left <= 90 ? "expiring" : "valid";
};

// the certificate register: the seed certificates, one for each completed order, and the ones issued here
function buildCertificates(saved, orders, catalogue) {
  const byId = Object.fromEntries(catalogue.map((c) => [c.id, c]));
  const fromOrders = orders
    .filter((o) => o.state === "completed")
    .map((o, i) => {
      const l = o.lines[0];
      const issued = isoDay(Date.parse(`${l.endDate}T00:00:00Z`) + 3 * DAY);
      const years = validityYears(byId[l.courseId]?.validity);
      return { number: `RT-2026-${pad(4900 + i * 211, 6)}`, holder: l.delegates[0], course: l.title, provider: l.provider, issued, expires: years ? isoDay(Date.parse(`${issued}T00:00:00Z`) + years * 365 * DAY) : null };
    });
  const registry = [
    ...seedCertificates.map((c) => ({ number: c.number, holder: c.name, course: c.course, provider: c.provider, issued: c.issued, expires: c.expires })),
    ...fromOrders,
    ...(saved.certsIssued || []),
  ].map((c) => {
    const r = saved.certs?.[c.number] || {};
    return { ...c, revoked: r.revoked || false, revokeReason: r.reason || "" };
  });
  return registry.sort((a, b) => (a.issued < b.issued ? 1 : -1));
}

// the names a request can be assigned to: the signed-in admin, then the demo staff
const staffNames = () => [...new Set([currentAdmin().name, ...A.staffSeeds].filter(Boolean))];

// The admin data, read again whenever an admin page changes something. Returns null until the browser has it.
export function useAdmin() {
  const [data, setData] = useState(null);
  useEffect(() => {
    const load = () => setData(getAdmin());
    load();
    window.addEventListener(ADMIN_EVENT, load);
    return () => window.removeEventListener(ADMIN_EVENT, load);
  }, []);
  return data;
}

export function getAdmin() {
  const saved = read();
  const now = Date.now();
  const fees = A.feeDefaults; // the demo reports use the default card fee
  const orders = buildOrders(saved, now);
  const changes = buildChanges(saved, orders, now);
  const openChanges = changes.filter((c) => c.open);
  const catalogue = buildCatalogue(saved, isoDay(now));
  const sessions = buildSessions(saved, catalogue, now);
  const certificates = buildCertificates(saved, orders, catalogue);
  const work = buildWork(saved, now); // Phase 2: requests, Security Jobs, business accounts (lib/adminWork.js)
  const reviews = buildReviews(saved, now); // B3: review moderation (lib/adminReviews.js)
  return {
    now,
    ...work,
    orders,
    changes,
    catalogue,
    sessions,
    venues: buildVenues(sessions),
    certificates,
    reviews,
    staff: staffNames(),
    fees,
    counts: {
      changes: openChanges.length,
      overdue: openChanges.filter((c) => c.due < now).length + work.workCounts.requestsOverdue,
      ...work.workCounts,
      reviews: reviews.filter((r) => r.challenge).length,
    },
  };
}

// ---- the writes ---------------------------------------------------------------------------------------------------------------


const orderEvent = (s, ref, text) => {
  const cur = s.orders?.[ref] || {};
  s.orders = { ...(s.orders || {}), [ref]: { ...cur, events: [...(cur.events || []), { at: Date.now(), text }] } };
};
export const resendConfirmation = (order) =>
  update((s) => {
    orderEvent(s, order.ref, `Confirmation emailed again by ${currentAdmin().name}`);
  });
export const addOrderNote = (order, text) =>
  update((s) => {
    const cur = s.orders?.[order.ref] || {};
    s.orders = { ...(s.orders || {}), [order.ref]: { ...cur, notes: [{ at: Date.now(), who: currentAdmin().name, text }, ...(cur.notes || [])] } };
  });

// what each action does to a request: its new status and the order timeline line
const CHANGE_ACTIONS = {
  approve: { status: "approved", event: "Provider approved the cancellation" },
  refundCard: { status: "refunded", outcome: "card", event: "Refunded to card" },
  refundWallet: { status: "refunded", outcome: "wallet", event: "Refunded to wallet credit (customer's choice)" },
  decline: { status: "rejected", event: "Request declined" },
  move: { status: "moved", event: "Moved to a new date" },
  evidence: { evidenceSent: true, event: "Dispute evidence sent to the card issuer" },
  won: { status: "won", event: "Card dispute won" },
  lost: { status: "lost", event: "Card dispute lost; provider's share reversed" },
};
export function actOnChange(change, action) {
  const a = CHANGE_ACTIONS[action];
  update((s) => {
    const cur = s.changes?.[change.id] || {};
    s.changes = { ...(s.changes || {}), [change.id]: { ...cur, ...(a.status ? { status: a.status, at: Date.now() } : {}), ...(a.outcome ? { outcome: a.outcome } : {}), ...(a.evidenceSent ? { evidenceSent: true } : {}) } };
    orderEvent(s, change.ref, a.event);
  });
}

// ---- part 2 writes ----------------------------------------------------------------------------------------------------------
const setSession = (session, patch) =>
  update((s) => {
    s.sessions = { ...(s.sessions || {}), [session.id]: { ...(s.sessions?.[session.id] || {}), ...patch } };
  });
export const markJoiningSent = (session) => setSession(session, { joiningSent: true });
export const setSalesClosed = (session, closed) => setSession(session, { salesClosed: closed });
export const cancelSession = (session, reason) => setSession(session, { cancelled: true, reason });


export const revokeCertificate = (cert, reason) =>
  update((s) => {
    s.certs = { ...(s.certs || {}), [cert.number]: { revoked: true, reason } };
  });
export const reinstateCertificate = (cert) =>
  update((s) => {
    s.certs = { ...(s.certs || {}), [cert.number]: { revoked: false } };
  });
// a new certificate number: RT-<year>-<six digits>, never one already in the register
export function issueCertificate({ holder, course, provider, issued, years }, existing) {
  const used = new Set(existing.map((c) => c.number));
  let n = 5000 + existing.length * 7;
  let number;
  do {
    n += 1;
    number = `RT-${issued.slice(0, 4)}-${pad(n, 6)}`;
  } while (used.has(number));
  const expires = years ? isoDay(Date.parse(`${issued}T00:00:00Z`) + years * 365 * DAY) : null;
  update((s) => {
    s.certsIssued = [...(s.certsIssued || []), { number, holder, course, provider, issued, expires }];
  });
  return number;
}

