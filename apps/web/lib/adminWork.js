import { adminWork as W, businessSeeds, candidateSeeds, employers, requestSeeds, roles } from "@/data/adminWork";
import { testCentres } from "@/data/testCentres";
import { readInbox } from "@/lib/inbox";
import { DAY, HOUR, addWorkingDays, update } from "@/lib/adminStore";

// Admin Phase 2 reads and writes: Requests and fulfilment, Security Jobs and Business accounts. The records are the demo ones in
// data/adminWork.js plus what visitors sent from the site's forms in this browser (lib/inbox.js); the team's changes are saved
// in this browser (lib/adminStore.js). lib/admin.js getAdmin() adds these to the admin data. Swap for API calls later.

const R = W.requests;
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const say = (event) => ({ at: Date.now(), text: event });

// ---- requests ------------------------------------------------------------------------------------------------------------------
const centreName = (slug) => testCentres.find((c) => c.slug === slug)?.town;
const fromInbox = (x) => {
  const d = x.data || {};
  const name = d.name || [d.firstName, d.lastName].filter(Boolean).join(" ");
  const base = { ref: x.reference, name, email: d.email || "", phone: d.phone || "", company: d.company || "", at: x.at, status: "new", live: true };
  if (x.kind === "quote") return { ...base, kind: "quote", title: `Group quote${d.course ? `: ${d.course}` : ""}`, details: [["Course", d.course || "Not given"], ["People", d.people || "Not given"], ["Message", d.message || ""]] };
  if (x.kind === "licence") return { ...base, kind: "licence", title: `${d.type || "Licence"} application`, details: [["What they need", d.type], ["Application", d.application], ["Notes", d.notes]], docs: ["Proof of the qualification for the card or licence", "Photo ID"], price: null };
  if (x.kind === "training") return { ...base, kind: "training", title: `Training request: ${d.licence || "forklift"}`, details: [["Truck", d.truck], ["Experience", d.experience], ["People", d.people], ["Postcode", d.postcode]] };
  if (x.kind === "test") return { ...base, kind: "test", title: `CITB HS&E test booking (${d.type || "test"})`, price: 41.99, details: [["Test", d.type], ["Centre", centreName(d.centre) ? `${centreName(d.centre)} Test Centre` : "Not chosen yet"], ["When", d.when], ["Notes", d.notes]] };
  if (x.kind === "contact") return { ...base, kind: "contact", title: `Contact: ${d.topic || "message"}`, details: [["Topic", d.topic], ["Booking", d.reference], ["Message", d.message]] };
  return null;
};

function buildRequests(saved, now) {
  const live = readInbox().filter((x) => x.kind !== "job").map(fromInbox).filter(Boolean);
  const seeds = requestSeeds.map((s) => ({ ...s, at: now - s.hoursAgo * HOUR }));
  return [...live, ...seeds]
    .map((r) => {
      const s = saved.requests?.[r.ref] || {};
      const status = s.status || r.status;
      return {
        ...r,
        details: (r.details || []).filter(([, v]) => v),
        status,
        assignee: s.assignee ?? r.assignee ?? "",
        checked: s.checked ?? r.checked ?? [],
        amount: s.amount ?? r.amount ?? null,
        cancelReason: s.cancelReason || "",
        notes: s.notes || [],
        events: [...(s.events || []), say(`Request received (${R.kinds[r.kind]})`)].map((e, i, all) => (i === all.length - 1 ? { ...e, at: r.at } : e)),
        open: !["done", "cancelled"].includes(status),
        due: addWorkingDays(r.at, R.sla),
      };
    })
    .sort((a, b) => b.at - a.at);
}

const setRequest = (r, patch, action) =>
  update((s) => {
    const cur = s.requests?.[r.ref] || {};
    s.requests = { ...(s.requests || {}), [r.ref]: { ...cur, ...patch, events: [say(action), ...(cur.events || [])] } };
  });

export const nextStatus = (r) => {
  const steps = R.steps[r.kind];
  const i = steps.indexOf(r.status);
  return i >= 0 && i < steps.length - 1 ? steps[i + 1] : null;
};
export const nextLabel = (r) => {
  const n = R.next[r.status];
  return typeof n === "string" ? n : n ? n[r.kind] || n.default : "";
};
export const advanceRequest = (r, extra = {}) => {
  const to = nextStatus(r);
  if (to) setRequest(r, { status: to, ...extra }, `${R.statuses[to]}${extra.amount ? ` (£${extra.amount})` : ""}`);
};
export const assignRequest = (r, name) => setRequest(r, { assignee: name }, name ? `Assigned to ${name}` : "Unassigned");
export const toggleRequestDoc = (r, i) => {
  const on = r.checked.includes(i);
  setRequest(r, { checked: on ? r.checked.filter((x) => x !== i) : [...r.checked, i] }, `${on ? "Unticked" : "Checked"}: ${r.docs[i]}`);
};
export const cancelRequest = (r, reason) => setRequest(r, { status: "cancelled", cancelReason: reason }, `Cancelled: ${reason}`);
export const addRequestNote = (r, text) =>
  update((s) => {
    const cur = s.requests?.[r.ref] || {};
    s.requests = { ...(s.requests || {}), [r.ref]: { ...cur, notes: [{ at: Date.now(), who: "Sara Ahmed", text }, ...(cur.notes || [])] } };
  });

// ---- Security Jobs ------------------------------------------------------------------------------------------------------------
const roleById = Object.fromEntries(roles.map((r) => [r.id, { ...r, employerName: employers.find((e) => e.id === r.employer)?.name }]));
const candidateFromInbox = (x) => {
  const d = x.data || {};
  const digits = (d.licenceNumber || "").replace(/\D/g, "");
  return {
    ref: x.reference, name: [d.firstName, d.lastName].filter(Boolean).join(" "), email: d.email, phone: d.phone, postcode: (d.postcode || "").toUpperCase(), city: "",
    licence: { type: d.licenceType, last4: digits.slice(-4), expiry: d.licenceExpiry }, shifts: d.shifts || [], travel: d.travel, start: d.start,
    eligibility: d.eligibility || {}, at: x.at, status: "new", intros: [], live: true,
  };
};

function buildJobs(saved, now) {
  const live = readInbox().filter((x) => x.kind === "job").map(candidateFromInbox);
  const seeds = candidateSeeds.map((c) => ({ ...c, at: now - c.daysAgo * DAY, intros: (c.intros || []).map((i) => ({ ...i, at: now - i.daysAgo * DAY, consent: i.consent ? { at: now - i.consent.daysAgo * DAY, how: i.consent.how } : null })) }));
  const candidates = [...live, ...seeds].map((c) => {
    const s = saved.candidates?.[c.ref] || {};
    const intros = [...c.intros.filter((i) => !s.intros?.[i.role]), ...Object.entries(s.intros || {}).map(([role, i]) => ({ role, ...i }))]
      .map((i) => ({ ...i, roleInfo: roleById[i.role] }))
      .sort((a, b) => b.at - a.at);
    return { ...c, status: s.status || c.status, intros, notes: s.notes || [] };
  });
  const placedBy = (employerId) => candidates.filter((c) => c.intros.some((i) => i.status === "started" && i.roleInfo?.employer === employerId)).length;
  return {
    candidates: candidates.sort((a, b) => b.at - a.at),
    roles: Object.values(roleById),
    employers: employers.map((e) => ({ ...e, roles: roles.filter((r) => r.employer === e.id).length, placed: placedBy(e.id) })),
  };
}

const setCandidate = (c, fn) =>
  update((s) => {
    const cur = s.candidates?.[c.ref] || {};
    s.candidates = { ...(s.candidates || {}), [c.ref]: fn(cur) };
  });
const currentIntro = (c, role) => c.intros.find((i) => i.role === role) || {};
export const setCandidateStatus = (c, status) => setCandidate(c, (cur) => ({ ...cur, status }));
export const offerRole = (c, role) =>
  setCandidate(c, (cur) => ({ ...cur, status: cur.status === "new" || cur.status === "screening" || !cur.status ? "shortlisted" : cur.status, intros: { ...(cur.intros || {}), [role]: { status: "asked", at: Date.now(), consent: null } } }));
export const recordConsent = (c, role, how) =>
  setCandidate(c, (cur) => ({ ...cur, intros: { ...(cur.intros || {}), [role]: { ...currentIntro(c, role), roleInfo: undefined, status: "consent", at: Date.now(), consent: { at: Date.now(), how } } } }));
// introducing (sharing the candidate's details with the employer) is only possible after a recorded yes for that role
export const moveIntro = (c, role, status) => {
  const i = currentIntro(c, role);
  if (status === "introduced" && !i.consent) return;
  const statusFor = { introduced: "introduced", interview: "interview", started: "started" }[status];
  setCandidate(c, (cur) => ({ ...cur, ...(statusFor ? { status: statusFor } : {}), intros: { ...(cur.intros || {}), [role]: { ...i, roleInfo: undefined, status, at: Date.now() } } }));
};
export const addCandidateNote = (c, text) => setCandidate(c, (cur) => ({ ...cur, notes: [{ at: Date.now(), who: "Sara Ahmed", text }, ...(cur.notes || [])] }));

// ---- business accounts --------------------------------------------------------------------------------------------------------
const B = W.businesses;
function buildBusinesses(saved, now) {
  return businessSeeds.map((b) => {
    const s = saved.businesses?.[b.slug] || {};
    const invoices = b.invoices.map(([no, issuedAgo, amount, status, po]) => {
      const issued = now - issuedAgo * DAY;
      const due = issued + B.termsDays * DAY;
      const paid = s.paid?.includes(no) || status === "paid";
      const late = Math.floor((now - due) / DAY);
      return { no, issued: isoDay(issued), due: isoDay(due), amount, po, late, status: paid ? "paid" : late > 0 ? "overdue" : "due", reminded: s.reminded?.[no] || null };
    });
    const unpaid = invoices.filter((i) => i.status !== "paid");
    const aged = { current: 0, d30: 0, d60: 0, d61: 0 };
    unpaid.forEach((i) => { aged[i.late <= 0 ? "current" : i.late <= 30 ? "d30" : i.late <= 60 ? "d60" : "d61"] += i.amount; });
    const owed = unpaid.reduce((n, i) => n + i.amount, 0);
    const limit = s.limit ?? b.limit;
    const credit = s.credit || b.credit;
    // as on Hurak, credit is offered by us to regular customers; these checks say who qualifies (rule: data/adminWork.js)
    const months = Math.floor(b.sinceDays / 30.4);
    const rule = B.eligibility;
    const checks = [
      { key: "months", label: `A customer for ${rule.months} months or more`, value: `${months} ${months === 1 ? "month" : "months"}`, ok: months >= rule.months },
      { key: "courses", label: `${rule.courses} or more courses booked in the last 12 months`, value: `${b.courses12} booked`, ok: b.courses12 >= rule.courses },
      { key: "spend", label: `£${rule.spend.toLocaleString("en-GB")} or more spent in the last 12 months`, value: `£${b.spend12.toLocaleString("en-GB")}`, ok: b.spend12 >= rule.spend },
    ];
    return {
      ...b,
      credit,
      checks,
      eligible: credit === "none" && checks.every((c) => c.ok),
      limit,
      used: owed,
      available: Math.max(0, limit - owed),
      invoices,
      owed,
      overdue: unpaid.filter((i) => i.status === "overdue").reduce((n, i) => n + i.amount, 0),
      aged,
      since: isoDay(now - b.sinceDays * DAY),
      notes: s.notes || [],
    };
  });
}
const setBusiness = (b, fn) =>
  update((s) => {
    const cur = s.businesses?.[b.slug] || {};
    s.businesses = { ...(s.businesses || {}), [b.slug]: fn(cur) };
  });
export const offerCredit = (b, limit) => setBusiness(b, (cur) => ({ ...cur, credit: "approved", limit }));
export const changeCreditLimit = (b, limit) => setBusiness(b, (cur) => ({ ...cur, limit }));
export const setCreditHold = (b, hold) => setBusiness(b, (cur) => ({ ...cur, credit: hold ? "suspended" : "approved" }));
export const remindInvoice = (b, inv) => setBusiness(b, (cur) => ({ ...cur, reminded: { ...(cur.reminded || {}), [inv.no]: Date.now() } }));
export const markInvoicePaid = (b, inv) => setBusiness(b, (cur) => ({ ...cur, paid: [...(cur.paid || []), inv.no] }));
export const addBusinessNote = (b, text) => setBusiness(b, (cur) => ({ ...cur, notes: [{ at: Date.now(), who: "Sara Ahmed", text }, ...(cur.notes || [])] }));

// everything Phase 2 adds to getAdmin()
export function buildWork(saved, now) {
  const requests = buildRequests(saved, now);
  const jobs = buildJobs(saved, now);
  const businesses = buildBusinesses(saved, now);
  const open = requests.filter((r) => r.open);
  return {
    requests,
    ...jobs,
    businesses,
    workCounts: {
      requests: open.length,
      requestsOverdue: open.filter((r) => r.status === "new" && r.due < now).length,
      candidates: jobs.candidates.filter((c) => c.status === "new").length,
      credit: businesses.filter((b) => b.eligible).length,
      debt: businesses.filter((b) => b.overdue > 0).length,
    },
  };
}
