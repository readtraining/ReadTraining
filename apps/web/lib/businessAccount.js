import { businessAccount as biz } from "@/data/businessAccount";
import { getCourseBySlug } from "@/lib/courses";

// The Business account's reads and writes. There are no business endpoints in apps/api yet, so the demo company from
// data/businessAccount.js is the starting point and every change made on the pages (a learner added, a place assigned or freed,
// the balance paid) is kept in this browser (localStorage). Swap the bodies for API calls later; the pages only depend on the
// shape getBusiness() returns. Browser-only: call from effects.

const KEY = "rt-business"; // { learners: [added], assigned: { [purchaseId]: [learnerId] }, paid: [invoiceNumber], team: [added], removed: [id] }
const DAY = 86400000;
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

// Everything the pages show, with real dates, course titles, learner names and the sums.
export function getBusiness() {
  const saved = read();
  const now = Date.now();
  const today = isoDay(now);
  const soon = isoDay(now + 90 * DAY);
  const learners = [...biz.people, ...(saved.learners || [])];
  const byId = Object.fromEntries(learners.map((l) => [l.id, l]));

  const purchases = biz.purchases.map((p) => {
    const course = getCourseBySlug(p.courseId);
    const start = now + p.startIn * DAY;
    const assigned = (saved.assigned?.[p.id] ?? p.assigned).filter((id) => byId[id]);
    const date = isoDay(start);
    const endDate = isoDay(start + (p.days - 1) * DAY);
    const state = p.cancelled ? "cancelled" : endDate >= today ? "upcoming" : "past";
    return {
      ...p,
      title: course?.title || "Course",
      slug: course?.slug,
      date,
      endDate,
      bookedAt: isoDay(now - p.bookedDaysAgo * DAY),
      assigned,
      free: Math.max(0, p.places - assigned.length),
      total: round(p.unit * p.places),
      state,
      cancelledAt: p.cancelled ? isoDay(now - p.cancelled.daysAgo * DAY) : undefined,
    };
  });

  const certificates = biz.certificates
    .filter((c) => byId[c.learnerId])
    .map((c) => {
      const expires = isoDay(now + c.expiresInDays * DAY);
      return { ...c, learner: byId[c.learnerId].name, title: getCourseBySlug(c.courseId)?.title || "Course", expires, state: expires < today ? "expired" : expires <= soon ? "renew" : "valid" };
    })
    .sort((a, b) => (a.expires < b.expires ? -1 : 1));

  const paid = new Set(saved.paid || []);
  const invoices = biz.invoices.map((i) => {
    const due = isoDay(now + i.dueIn * DAY);
    const isPaid = i.paid || paid.has(i.number);
    return { ...i, date: isoDay(now - i.daysAgo * DAY), due, status: isPaid ? "paid" : due < today ? "overdue" : "due" };
  });
  const open = invoices.filter((i) => i.status !== "paid");
  const used = round(open.reduce((s, i) => s + i.amount, 0));
  const nextDue = open.map((i) => i.due).sort()[0] || null;

  // each learner's training (places assigned on upcoming or past courses) and certificates
  const people = learners.map((l) => {
    const training = purchases.filter((p) => p.state !== "cancelled" && p.assigned.includes(l.id)).sort((a, b) => (a.date < b.date ? -1 : 1));
    const certs = certificates.filter((c) => c.learnerId === l.id);
    return { ...l, training, upcoming: training.filter((p) => p.state === "upcoming"), certificates: certs, renewal: certs.some((c) => c.state !== "valid") };
  });

  return {
    company: biz.company,
    learners: people,
    purchases,
    certificates,
    invoices,
    credit: { limit: biz.company.limit, used, available: round(biz.company.limit - used), due: used, dueDate: nextDue, terms: biz.company.terms },
  };
}

// A learner added on the Learners page: invited until they accept (simulated).
export async function addLearner({ name, email, job }) {
  await new Promise((r) => setTimeout(r, 500));
  const saved = read();
  const learner = { id: `n${Date.now()}`, name: name.trim(), email: email.trim(), job: job.trim(), status: "invited" };
  write({ ...saved, learners: [...(saved.learners || []), learner] });
  return learner;
}

// Give a place on a course to a learner, or free it again.
function setAssigned(purchaseId, update) {
  const saved = read();
  const base = biz.purchases.find((p) => p.id === purchaseId);
  if (!base) return;
  const current = saved.assigned?.[purchaseId] ?? base.assigned;
  write({ ...saved, assigned: { ...(saved.assigned || {}), [purchaseId]: update(current, base) } });
}
export const assignPlace = (purchaseId, learnerId) => setAssigned(purchaseId, (list, p) => (list.includes(learnerId) || list.length >= p.places ? list : [...list, learnerId]));
export const unassignPlace = (purchaseId, learnerId) => setAssigned(purchaseId, (list) => list.filter((id) => id !== learnerId));

// Pay every open invoice (simulated card payment).
export async function payBalance(numbers) {
  await new Promise((r) => setTimeout(r, 900));
  const saved = read();
  write({ ...saved, paid: [...new Set([...(saved.paid || []), ...numbers])] });
}

// ---- team (/business/team) --------------------------------------------------------------------------------------------------
// The colleagues who manage the account besides the owner: the demo team plus any added here, minus any removed.
export function getTeam() {
  const saved = read();
  const removed = new Set(saved.removed || []);
  return [...biz.teamMembers, ...(saved.team || [])].filter((m) => !removed.has(m.id));
}
// A member added on the Team page: invited until they accept (simulated).
export async function addTeamMember({ first, last, email }) {
  await new Promise((r) => setTimeout(r, 500));
  const saved = read();
  const member = { id: `t${Date.now()}`, first: first.trim(), last: last.trim(), email: email.trim(), role: "member", status: "invited" };
  write({ ...saved, team: [...(saved.team || []), member] });
  return member;
}
export function removeTeamMember(id) {
  const saved = read();
  write({ ...saved, removed: [...new Set([...(saved.removed || []), id])] });
}
