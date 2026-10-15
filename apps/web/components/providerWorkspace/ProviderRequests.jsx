"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { decideRefund, learnerName, useProvider } from "@/lib/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { Empty, Loading, formatWhen } from "./providerParts";
import { money } from "./charts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";

// Requests (Hurak's, from the account menu): every learner's refund request in one place. Hurak's columns: refund number, booking
// reference, learner, course, refund type (full, or partial with the amount), the learner's reason, and two actions: view the order,
// and change the refund status (Accepted / Rejected with a description). Waiting requests come first; a decided one shows the
// decision. Accepting refunds the amount and frees the learner's place, as the order page's refund card does.
const STATUS = { open: "Waiting for you", approved: "Accepted", declined: "Rejected" };
const TONE = { open: "warn", approved: "ok", declined: "muted" };
const DECISIONS = [{ value: "accepted", label: "Accepted" }, { value: "rejected", label: "Rejected" }];

export default function ProviderRequests() {
  const data = useProvider();
  const [editing, setEditing] = useState(null);
  const [decision, setDecision] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const formRef = useRef(null);
  const clearToast = useCallback(() => setToast(null), []);
  if (!data) return <Loading rows={3} />;
  if (!data.refunds.length) return <Empty title="No refund requests" text="When a learner asks for their money back, the request appears here and on the order." />;

  const order = (ref) => data.orders.find((o) => o.ref === ref);
  const rows = [...data.refunds]
    .sort((a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) || b.at - a.at)
    .map((r) => {
      const o = order(r.orderRef);
      const line = o?.lines.find((l) => l.learnerIds.includes(r.learnerId)) || o?.lines[0];
      return { ...r, learner: data.byId.learner[r.learnerId], course: data.byId.course[line?.courseId], full: !line || r.amount >= line.price };
    });
  const waiting = rows.filter((r) => r.status === "open").length;

  const open = (r) => {
    setEditing(r);
    setDecision("");
    setNote("");
    setErrors({});
  };
  const save = async (e) => {
    e.preventDefault();
    const err = {};
    if (!decision) err.decision = "Choose Accepted or Rejected.";
    if (decision === "rejected" && !note.trim()) err.note = "Tell the learner why. They see this description.";
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(formRef.current);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    decideRefund(editing.id, decision === "accepted", note.trim());
    setToast({ message: decision === "accepted" ? `Refund accepted: ${money(editing.amount)} goes back to the customer` : "Refund rejected. The learner has been told why." });
    setBusy(false);
    setEditing(null);
  };

  return (
    <div className="rt-acc__stack">
      <p className="rt-rq-sum" aria-live="polite"><b>{waiting}</b> {waiting === 1 ? "request is" : "requests are"} waiting for you · {rows.length} in total</p>
      <div className="rt-acc__card rt-biz__tablecard rt-rq">
        <table className="rt-biz__table rt-adm-table rt-rq-table">
          <thead>
            <tr>
              <th scope="col">#Refund</th>
              <th scope="col">Booking reference</th>
              <th scope="col">Learner</th>
              <th scope="col">Course</th>
              <th scope="col">Refund type</th>
              <th scope="col">Refund reason</th>
              <th scope="col">Status</th>
              <th scope="col"><span className="rt-sr">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const name = learnerName(r.learner) || "Learner";
              return (
                <tr key={r.id}>
                  <td data-label="#Refund" className="rt-pws-money__num">{r.id.replace(/\D/g, "")}</td>
                  <td data-label="Booking reference"><Link href={`/provider/orders/${r.orderRef}`} className="rt-adm-strong">{r.bookingRef}</Link></td>
                  <td data-label="Learner"><b className="rt-rq-who">{name}</b>{r.learner?.email && <small>{r.learner.email}</small>}</td>
                  <td data-label="Course">{r.course?.title || "Course removed"}</td>
                  <td data-label="Refund type">{r.full ? "Full refund" : <>Partial refund <b className="rt-rq-amt">{money(r.amount)}</b></>}</td>
                  <td data-label="Refund reason" className="rt-rq-reason">{r.reason}<small>{formatWhen(r.at)}</small></td>
                  <td data-label="Status">
                    <span className={`rt-cx-status -${TONE[r.status]}`}>{STATUS[r.status]}</span>
                    {r.status !== "open" && r.note && <small className="rt-rq-note">{r.note}</small>}
                  </td>
                  <td data-label="Actions" className="rt-rq-act">
                    <span className="rt-rq-acts">
                    <Link href={`/provider/orders/${r.orderRef}`} className="rt-rq-icon" title="View order"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg><span className="rt-sr">View order {r.orderRef} for {name}</span></Link>
                    <button type="button" className="rt-rq-icon" title={r.status === "open" ? "Change refund status" : "Already decided"} onClick={() => open(r)} disabled={r.status !== "open"}>
                      <i className="icon-edit text-14" aria-hidden="true"></i><span className="rt-sr">Change refund status for {name}</span>
                    </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} title="Change refund status" closeLabel="Close">
        {editing && (
          <form className="rt-q__form" onSubmit={save} noValidate ref={formRef}>
            <p className="rt-acc__note">{learnerName(editing.learner)} asked for {editing.full ? "a full refund" : `a partial refund of ${money(editing.amount)}`} on {editing.course?.title}. Accepting returns {money(editing.amount)} to the customer and frees the learner&apos;s place.</p>
            <div className="rt-field">
              <label htmlFor="rt-rq-status">Refund status</label>
              {errors.decision && <p className="rt-q__err" id="rt-rq-status-e"><span className="rt-sr">Error: </span>{errors.decision}</p>}
              <FieldSelect id="rt-rq-status" label="Refund status" placeholder="Choose a status" value={decision} onChange={setDecision} options={DECISIONS} invalid={Boolean(errors.decision)} describedBy={errors.decision ? "rt-rq-status-e" : undefined} />
            </div>
            <div className="rt-field">
              <label htmlFor="rt-rq-note">Description{decision === "rejected" ? "" : " (optional)"}</label>
              <p className="rt-field__hint">The learner sees this with your decision.</p>
              {errors.note && <p className="rt-q__err" id="rt-rq-note-e"><span className="rt-sr">Error: </span>{errors.note}</p>}
              <textarea id="rt-rq-note" rows={4} maxLength={500} placeholder="Enter description here" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" aria-invalid={errors.note ? true : undefined} aria-describedby={errors.note ? "rt-rq-note-e" : undefined} />
            </div>
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy || undefined}>{busy ? "Saving…" : "Save"}</button>
          </form>
        )}
      </Sheet>
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
