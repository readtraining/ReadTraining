import { useEffect, useState } from "react";
import { admin as A } from "@/data/admin";
import { catalogueCourses, subjects } from "@/data/courseCatalogue";
import { certificates as seedCertificates } from "@/data/certificates";
import { getCourseBySlug } from "@/lib/courses";
import { getProviders } from "@/lib/providers";

// The admin's reads and writes. There is no admin API yet (front end only, see the admin plan's Scope), so the records come from
// data/admin.js and the live catalogue, and every decision made on the admin pages (an approval, a suspension, a refund, a note)
// is kept in this browser (localStorage) with an audit entry. Swap the bodies for API calls later; the pages only depend on the
// shapes getAdmin() returns. Browser-only: call from effects.

const KEY = "rt-admin";
// every write tells the open admin pages (the sidebar counts, the page's own list) to read again
export const ADMIN_EVENT = "rt-admin-change";
const DAY = 86400000;
const HOUR = 3600000;
const read = () => {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "null") || {};
  } catch {
    return {};
  }
};
const write = (next) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
};
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const round = (n) => Math.round(n * 100) / 100;
const pad = (n, w) => String(n).padStart(w, "0");

// n working days after `ms` (Saturdays and Sundays skipped; bank holidays come with the backend)
export function addWorkingDays(ms, n) {
  let t = ms;
  let left = n;
  while (left > 0) {
    t += DAY;
    const d = new Date(t).getUTCDay();
    if (d !== 0 && d !== 6) left -= 1;
  }
  return t;
}

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

const audit = (saved, action, target) => {
  saved.audit = [{ at: Date.now(), who: A.staff.name, action, target }, ...(saved.audit || [])].slice(0, 200);
};

// ---- the records ------------------------------------------------------------------------------------------------------------

function buildProviders(saved, now, defaultRate) {
  const listed = getProviders().map((p, i) => {
    const s = saved.providers?.[p.slug] || {};
    const accIn = A.accreditation[p.slug] ?? 200 + i * 23;
    return {
      slug: p.slug,
      name: p.name,
      city: p.city,
      contact: `${p.name.split(" ")[0]} team`,
      email: `bookings@${p.slug}.example`,
      status: s.status || (A.suspended.includes(p.slug) ? "suspended" : "active"),
      courses: p.courses.length,
      subjects: p.subjects,
      commission: s.commission ?? A.commissionOverrides[p.slug] ?? defaultRate,
      hold: s.hold ?? false,
      joined: isoDay(now - (400 + i * 37) * DAY),
      company: pad(10000000 + i * 734219, 8).slice(0, 8),
      vat: i % 3 ? "Registered" : "Not registered",
      documents: [
        { key: "acc", type: "Accreditation", ref: `${["Highfield", "Qualsafe", "CITB ATO", "BIIAB"][i % 4]} centre ${pad(1200 + i * 317, 4)}`, expires: isoDay(now + accIn * DAY), verified: s.verified?.acc ?? true },
        { key: "ins", type: "Insurance", ref: "Public liability £5m", expires: isoDay(now + (180 + i * 11) * DAY), verified: s.verified?.ins ?? true },
      ],
      notes: s.notes || [],
      listed: true,
    };
  });
  const applied = A.applications.map((a) => {
    const s = saved.providers?.[a.slug] || {};
    return {
      slug: a.slug,
      name: a.name,
      city: a.city,
      contact: a.contact,
      email: a.email,
      status: s.status || a.status,
      courses: 0,
      subjects: a.specialisms,
      commission: s.commission ?? defaultRate,
      hold: s.hold ?? false,
      applied: now - a.daysAgo * DAY - 3 * HOUR,
      company: a.company,
      vat: a.vat,
      documents: a.documents.map(([type, ref, inDays], k) => ({ key: `d${k}`, type, ref, expires: isoDay(now + inDays * DAY), verified: s.verified?.[`d${k}`] ?? false })),
      notes: s.notes || [],
      listed: false,
    };
  });
  return [...applied, ...listed];
}

// the document's state: expired, expiring within 30 days, or fine
export const docState = (doc, now = Date.now()) => {
  const left = (Date.parse(doc.expires) - now) / DAY;
  return left < 0 ? "expired" : left <= 30 ? "expiring" : "ok";
};

// why a provider cannot be approved yet: an expired document, or one nobody has verified
export const approvalBlockers = (provider, now = Date.now()) =>
  provider.documents.flatMap((d) => [...(docState(d, now) === "expired" ? [`${d.type} expired`] : []), ...(!d.verified ? [`${d.type} not verified`] : [])]);

function buildApprovals(saved, providers, now) {
  const bySlug = Object.fromEntries(providers.map((p) => [p.slug, p]));
  const items = [
    ...A.applications.map((a) => ({
      id: `app-${a.slug}`,
      type: "application",
      title: a.name,
      provider: a.name,
      providerSlug: a.slug,
      detail: `${a.city} · ${a.specialisms.map((s) => s.replace(/-/g, " ")).join(", ")} · ${a.documents.length} documents`,
      submitted: now - a.daysAgo * DAY - 3 * HOUR,
      baseStatus: a.status === "changes" ? "changes" : "pending",
    })),
    ...A.submissions.map((x) => {
      const course = getCourseBySlug(x.courseId);
      return {
        id: x.id,
        type: x.type,
        title: course?.title || "Course",
        provider: bySlug[x.provider]?.name || x.provider,
        providerSlug: x.provider,
        detail: x.detail,
        submitted: now - x.hoursAgo * HOUR,
        baseStatus: "pending",
      };
    }),
  ];
  return items
    .map((it) => {
      const d = saved.decisions?.[it.id];
      const blockers = it.type === "application" && bySlug[it.providerSlug] ? approvalBlockers(bySlug[it.providerSlug], now) : [];
      return { ...it, status: d?.status || it.baseStatus, reason: d?.reason || "", decidedAt: d?.at, due: addWorkingDays(it.submitted, A.sla.approval), blockers };
    })
    .sort((a, b) => a.submitted - b.submitted);
}

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

// ---- part 2: catalogue, sessions and venues, learners and certificates, staff and fees ---------------------------------------

const hash = (...n) => n.reduce((h, x) => (h * 31 + x) % 9973, 7);
const SUBJECT_LABEL = Object.fromEntries(subjects.map((x) => [x.value, x.label]));

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
      category: SUBJECT_LABEL[c.subject] || c.subject,
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

function buildLearners(saved, orders, catalogue, now) {
  const learners = A.people.map(([first, last], i) => {
    const name = `${first} ${last}`;
    const mine = orders.filter((o) => o.buyer.name === name);
    const s = saved.learners?.[`l${i + 1}`] || {};
    const seedCredit = i % 4 === 2 ? [{ at: now - (40 + i) * DAY, amount: 10, type: "welcome", note: "Welcome credit", who: "System" }] : [];
    const credits = [...(s.wallet || []), ...seedCredit];
    return {
      id: `l${i + 1}`,
      name,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      phone: `07700 900${String(100 + i * 37).slice(-3)}`,
      joined: now - (120 + i * 19) * DAY,
      orders: mine,
      lastBooked: mine.length ? Math.max(...mine.map((o) => o.booked)) : null,
      wallet: credits,
      balance: round(credits.reduce((sum, w) => sum + w.amount, 0)),
      consents: { email: s.consents?.email ?? i % 2 === 0, sms: s.consents?.sms ?? i % 3 === 0 },
      status: s.closed ? "closed" : "active",
    };
  });
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
  return { learners, certificates: registry.sort((a, b) => (a.issued < b.issued ? 1 : -1)) };
}

function buildStaff(saved, now) {
  const seeded = A.staffSeeds.map(([name, email, role, twofa, hoursAgo]) => ({ name, email, role, twofa, last: now - hoursAgo * HOUR - 20 * 60000, invited: false }));
  const all = [...seeded, ...(saved.staff || []).map((s) => ({ ...s, twofa: false, last: null, invited: true }))];
  return all.map((s) => ({ ...s, role: saved.roles?.[s.email] || s.role }));
}

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
  const fees = { ...A.feeDefaults, ...(saved.fees || {}) };
  const providers = buildProviders(saved, now, fees.commission);
  const approvals = buildApprovals(saved, providers, now);
  const orders = buildOrders(saved, now);
  const changes = buildChanges(saved, orders, now);
  const pending = approvals.filter((a) => a.status === "pending");
  const openChanges = changes.filter((c) => c.open);
  const catalogue = buildCatalogue(saved, isoDay(now));
  const sessions = buildSessions(saved, catalogue, now);
  const { learners, certificates } = buildLearners(saved, orders, catalogue, now);
  return {
    now,
    providers,
    approvals,
    orders,
    changes,
    catalogue,
    sessions,
    venues: buildVenues(sessions),
    learners,
    certificates,
    staff: buildStaff(saved, now),
    fees,
    audit: saved.audit || [],
    counts: {
      approvals: pending.length,
      applications: providers.filter((p) => ["applied", "review"].includes(p.status)).length,
      changes: openChanges.length,
      overdue: pending.filter((a) => a.due < now).length + openChanges.filter((c) => c.due < now).length,
    },
  };
}

// ---- the writes (each one also writes an audit entry) ------------------------------------------------------------------------

const update = (fn) => {
  const saved = read();
  fn(saved);
  write(saved);
  try {
    window.dispatchEvent(new Event(ADMIN_EVENT));
  } catch {}
};

export function decideApproval(item, status, reason = "") {
  update((s) => {
    s.decisions = { ...(s.decisions || {}), [item.id]: { status, reason, at: Date.now() } };
    // approving or rejecting an application moves the provider too
    if (item.type === "application") {
      const next = status === "approved" ? "active" : status === "rejected" ? "closed" : "changes";
      s.providers = { ...(s.providers || {}), [item.providerSlug]: { ...(s.providers?.[item.providerSlug] || {}), status: next } };
    }
    audit(s, `${status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Asked for changes on"} ${A.approvals.types[item.type].toLowerCase()}`, `${item.title} (${item.provider})`);
  });
}

const setProvider = (slug, patch, action, name) =>
  update((s) => {
    s.providers = { ...(s.providers || {}), [slug]: { ...(s.providers?.[slug] || {}), ...patch } };
    audit(s, action, name);
  });
export const setProviderStatus = (p, status) => setProvider(p.slug, { status }, `Set provider status to ${A.providers.statuses[status]}`, p.name);
export const setProviderHold = (p, hold) => setProvider(p.slug, { hold }, hold ? "Placed a payout hold" : "Lifted the payout hold", p.name);
export const setProviderCommission = (p, commission) => setProvider(p.slug, { commission }, `Set commission to ${commission}%`, p.name);
export const verifyProviderDoc = (p, doc) =>
  update((s) => {
    const cur = s.providers?.[p.slug] || {};
    s.providers = { ...(s.providers || {}), [p.slug]: { ...cur, verified: { ...(cur.verified || {}), [doc.key]: true } } };
    audit(s, `Verified ${doc.type.toLowerCase()} document`, p.name);
  });
export const addProviderNote = (p, text) =>
  update((s) => {
    const cur = s.providers?.[p.slug] || {};
    s.providers = { ...(s.providers || {}), [p.slug]: { ...cur, notes: [{ at: Date.now(), who: A.staff.name, text }, ...(cur.notes || [])] } };
    audit(s, "Added a note", p.name);
  });

const orderEvent = (s, ref, text) => {
  const cur = s.orders?.[ref] || {};
  s.orders = { ...(s.orders || {}), [ref]: { ...cur, events: [...(cur.events || []), { at: Date.now(), text }] } };
};
export const resendConfirmation = (order) =>
  update((s) => {
    orderEvent(s, order.ref, `Confirmation emailed again by ${A.staff.name}`);
    audit(s, "Resent the confirmation", order.ref);
  });
export const addOrderNote = (order, text) =>
  update((s) => {
    const cur = s.orders?.[order.ref] || {};
    s.orders = { ...(s.orders || {}), [order.ref]: { ...cur, notes: [{ at: Date.now(), who: A.staff.name, text }, ...(cur.notes || [])] } };
    audit(s, "Added a note", order.ref);
  });

// what each action does to a request: its new status, the order timeline line and the audit words
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
    audit(s, a.event, `${change.ref} · ${A.changes.types[change.type]}`);
  });
}

// ---- part 2 writes ----------------------------------------------------------------------------------------------------------
export const setPreCourse = (course, on) =>
  update((s) => {
    s.preCourse = { ...(s.preCourse || {}), [course.id]: on };
    audit(s, on ? "Turned on pre-course e-learning" : "Turned off pre-course e-learning", course.title);
  });
export const setOfferingStatus = (course, offering, status) =>
  update((s) => {
    s.offerings = { ...(s.offerings || {}), [`${course.id}:${offering.provider}`]: status };
    audit(s, status === "paused" ? "Paused an offering" : "Resumed an offering", `${course.title} (${offering.provider})`);
  });
const setSession = (session, patch, action) =>
  update((s) => {
    s.sessions = { ...(s.sessions || {}), [session.id]: { ...(s.sessions?.[session.id] || {}), ...patch } };
    audit(s, action, `${session.course} · ${session.date} · ${session.city}`);
  });
export const markJoiningSent = (session) => setSession(session, { joiningSent: true }, "Marked joining instructions as sent");
export const setSalesClosed = (session, closed) => setSession(session, { salesClosed: closed }, closed ? "Closed sales" : "Opened sales");
export const cancelSession = (session, reason) => setSession(session, { cancelled: true, reason }, `Cancelled the session and notified ${session.booked} ${session.booked === 1 ? "delegate" : "delegates"}`);

const setLearner = (learner, fn, action) =>
  update((s) => {
    const cur = s.learners?.[learner.id] || {};
    s.learners = { ...(s.learners || {}), [learner.id]: fn(cur) };
    audit(s, action, learner.name);
  });
export const addWalletCredit = (learner, amount, note) =>
  setLearner(learner, (cur) => ({ ...cur, wallet: [{ at: Date.now(), amount, type: "goodwill", note, who: A.staff.name }, ...(cur.wallet || [])] }), `Added £${amount.toFixed(2)} goodwill credit`);
export const setConsent = (learner, key, on) => setLearner(learner, (cur) => ({ ...cur, consents: { ...learner.consents, ...(cur.consents || {}), [key]: on } }), `${on ? "Turned on" : "Turned off"} ${key === "email" ? "marketing emails" : "marketing texts"}`);
export const closeAccount = (learner) => setLearner(learner, (cur) => ({ ...cur, closed: true }), "Closed the account");
export const logExport = (learner) => update((s) => audit(s, "Downloaded the learner's data", learner.name));

export const revokeCertificate = (cert, reason) =>
  update((s) => {
    s.certs = { ...(s.certs || {}), [cert.number]: { revoked: true, reason } };
    audit(s, "Revoked a certificate", `${cert.number} (${cert.holder})`);
  });
export const reinstateCertificate = (cert) =>
  update((s) => {
    s.certs = { ...(s.certs || {}), [cert.number]: { revoked: false } };
    audit(s, "Reinstated a certificate", `${cert.number} (${cert.holder})`);
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
    audit(s, "Issued a certificate", `${number} (${holder})`);
  });
  return number;
}

export const inviteStaff = ({ name, email, role }) =>
  update((s) => {
    s.staff = [...(s.staff || []), { name, email, role }];
    audit(s, `Invited a staff member as ${A.settings.roles.find((r) => r.key === role).label}`, `${name} (${email})`);
  });
export const setStaffRole = (member, role) =>
  update((s) => {
    s.roles = { ...(s.roles || {}), [member.email]: role };
    audit(s, `Changed role to ${A.settings.roles.find((r) => r.key === role).label}`, member.name);
  });
export const saveFees = (fees, before) =>
  update((s) => {
    s.fees = fees;
    const changed = Object.keys(fees).filter((k) => fees[k] !== before[k]);
    audit(s, changed.length ? `Changed ${changed.map((k) => A.settings.fees[k].label.toLowerCase()).join(", ")}` : "Saved fee settings with no changes", "Fees and payouts");
  });
