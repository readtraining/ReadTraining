import React from "react";
import { dueState } from "@/lib/admin";

// The platform admin's status system (docs/admin-ui-audit.md): one shape, five tones, and a neutral tag for anything that is not
// a status (types, roles, triggers, codes). Admin screens only: the provider workspace keeps the shared Pill (adminParts).
//   success  done and good
//   info     in progress, waiting on someone else (blue, never the button purple)
//   warning  needs an admin, or due today or within a day
//   danger   late, blocked, failed, or money at risk
//   neutral  closed, inactive, not started ("New": how urgent it is shows in its deadline), or due in 2 days or more
// Every status maps to its tone here, once: adminTone("order", "paid") is "success".
const TONES = {
  order: { paid: "success", part_refunded: "neutral", refunded: "neutral", cancelled: "neutral" },
  refund: { requested: "warning", approved: "success", declined: "neutral" },
  dispute: { open: "danger", won: "success", lost: "neutral" },
  payout: { draft: "warning", approved: "info", held: "danger", sent: "success" },
  coupon: { live: "success", scheduled: "neutral", ended: "neutral", off: "neutral" },
  provider: { pending: "warning", changes_requested: "info", active: "success", suspended: "danger", rejected: "neutral", invited: "info" },
  offering: { live: "success", paused: "neutral" },
  catalogue: { retired: "neutral" },
  session: { sent: "success", notSent: "warning", notSentLater: "neutral", cancelled: "neutral" },
  change: { provider: "info", approved: "warning", evidence: "warning", refunded: "success", moved: "success", rejected: "neutral", won: "success", lost: "neutral" },
  review: { challenge: "warning", hidden: "neutral" },
  learner: { active: "success", unconfirmed: "info", blocked: "danger" },
  certificate: { valid: "success", none: "success", expiring: "warning", expired: "neutral", revoked: "danger" },
  credit: { none: "neutral", approved: "success", suspended: "danger" },
  invoice: { paid: "success", due: "neutral", overdue: "danger" },
  check: { yes: "success", no: "neutral" },
  request: { new: "neutral", documents: "info", payment: "info", paid: "success", submitted: "info", quoted: "info", accepted: "warning", booked: "success", replied: "info", done: "success", cancelled: "neutral" },
  candidate: { new: "neutral", screening: "info", shortlisted: "info", introduced: "info", interview: "info", started: "success", unsuitable: "neutral", withdrawn: "neutral" },
  intro: { asked: "info", consent: "warning", introduced: "info", interview: "info", offer: "info", started: "success", declined: "neutral" },
  email: { live: "info" },
  twoStep: { on: "success", next: "warning", off: "neutral" },
  service: { connected: "success", missing: "neutral", needed: "danger" },
  queue: { overdue: "danger", noJoining: "warning" },
  due: { late: "danger", warn: "warning", ok: "neutral" },
};
export const adminTone = (kind, status) => TONES[kind]?.[status] ?? "neutral";

// A status: <AdminStatus kind="order" status={o.status}>Paid</AdminStatus>
export const AdminStatus = ({ kind, status, children }) => <span className={`rt-adm-status -${adminTone(kind, status)}`}>{children}</span>;

// Not a status (a type, role, trigger or attribute), never coloured; `code` sets it in monospace, for coupon codes.
export const AdminTag = ({ code = false, children }) => <span className={`rt-adm-tag${code ? " -code" : ""}`}>{children}</span>;

// A deadline: "Due in 2 days" / "Due today" / "Overdue by 1 day", toned by how close it is.
export function AdminDue({ due, now }) {
  const d = dueState(due, now);
  return <AdminStatus kind="due" status={d.tone}>{d.text}</AdminStatus>;
}
