"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { decideRefund, learnerName, useProvider } from "@/lib/providerWorkspace";
import { addWorkingDays } from "@/lib/adminStore";
import { formatPrice } from "@/lib/format";
import { focusFirstError } from "@/lib/focusFirstError";
import { Due } from "@/components/admin/adminParts";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { Empty, Loading, Pill, REFUND_TONE, Tabs, formatWhen, getQuery, setQuery } from "./providerParts";

// Learners asking for their money back. Each request shows who, the order, the course, the amount, their reason and the reply
// deadline (3 working days). Approve refunds the amount and frees the learner's place; decline needs a reason, which the learner
// sees. Decided requests stay listed with the decision.
const TABS = ["open", "approved", "declined", "all"];
const TAB_LABEL = { open: "Waiting", approved: "Approved", declined: "Declined", all: "All" };
const REPLY_DAYS = 3;

export default function ProviderRefunds() {
  const data = useProvider();
  const [tab, setTab] = useState("open");
  const [deciding, setDeciding] = useState(null); // { req, approve }
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const formRef = useRef(null);
  const clearToast = useCallback(() => setToast(null), []);
  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
  }, []);
  if (!data) return <Loading rows={3} />;

  const now = Date.now();
  const list = data.refunds.filter((r) => tab === "all" || r.status === tab).sort((a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) || b.at - a.at);
  const tabs = TABS.map((k) => ({ key: k, label: TAB_LABEL[k], count: data.refunds.filter((r) => k === "all" || r.status === k).length }));

  const start = (req, approve) => {
    setNote(approve ? "" : "");
    setError("");
    setDeciding({ req, approve });
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!deciding.approve && !note.trim()) {
      setError("Tell the learner why. For example, the course is within 5 working days and your policy offers a date change instead.");
      return focusFirstError(formRef.current);
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    decideRefund(deciding.req.id, deciding.approve, note.trim());
    setToast({ message: deciding.approve ? `${formatPrice(deciding.req.amount)} refunded` : "Request declined. The learner has been told why." });
    setBusy(false);
    setDeciding(null);
  };

  const policyNote = (
    <p className="rt-acc__note rt-adm-help">
      <i className="icon-document text-12" aria-hidden="true"></i> Learners see your cancellation policy before they book. <Link href="/provider/settings?tab=terms">Check your policy</Link>
    </p>
  );

  if (!data.refunds.length) {
    return <div className="rt-acc__stack">{policyNote}<Empty title="No refund requests" text="When a learner asks for their money back, the request appears here for you to approve or decline." /></div>;
  }

  return (
    <div className="rt-acc__stack">
      <Tabs tabs={tabs} value={tab} onChange={(k) => { setTab(k); setQuery("tab", k === "open" ? "" : k); }} label="Show refund requests" />
      {policyNote}
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "request" : "requests"}`}</p>
      {list.length ? (
        <ul className="rt-adm-items">
          {list.map((r) => {
            const l = data.byId.learner[r.learnerId];
            const o = data.orders.find((x) => x.ref === r.orderRef);
            const c = o && data.byId.course[o.lines.find((x) => x.learnerIds.includes(r.learnerId))?.courseId || o.lines[0].courseId];
            return (
              <li key={r.id} className="rt-acc__card rt-adm-item">
                <div className="rt-adm-item__body">
                  <div className="rt-adm-item__top">
                    <Pill tone={REFUND_TONE[r.status]}>{pw.refundStatuses[r.status]}</Pill>
                    {r.status === "open" && <Due due={addWorkingDays(r.at, REPLY_DAYS)} now={now} />}
                    <span className="rt-adm-item__when">Asked {formatWhen(r.at)}</span>
                  </div>
                  <p className="rt-adm-strong rt-pws-money__who">
                    {l ? <Link href={`/provider/learners/${l.id}`} className="rt-adm-strong">{learnerName(l)}</Link> : "A learner"} asks for {formatPrice(r.amount)}
                  </p>
                  <p className="rt-acc__note">{c?.title || "Course"} · order <Link href={`/provider/orders/${r.orderRef}`}>{r.orderRef}</Link></p>
                  <p className="rt-adm-item__reason">“{r.reason}”</p>
                  {r.status !== "open" && <p className="rt-acc__note rt-adm-mt">{pw.refundStatuses[r.status]} {r.decided ? formatWhen(r.decided) : ""}{r.note ? `: ${r.note}` : ""}</p>}
                </div>
                {r.status === "open" && (
                  <div className="rt-adm-item__actions">
                    <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => start(r, false)}>Decline<span className="rt-sr"> {learnerName(l)}'s request</span></button>
                    <button type="button" className="button -sm -purple-1 text-white" onClick={() => start(r, true)}>Approve {formatPrice(r.amount)}<span className="rt-sr"> for {learnerName(l)}</span></button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rt-acc__card rt-acc__empty">{tab === "open" ? "Nothing is waiting for you." : "No requests here."}</p>
      )}

      <Sheet open={Boolean(deciding)} onClose={() => setDeciding(null)} title={deciding?.approve ? "Approve the refund" : "Decline the request"} closeLabel="Close">
        {deciding && (
          <form className="rt-q__form" onSubmit={submit} noValidate ref={formRef}>
            {deciding.approve ? (
              <p className="rt-acc__note">{formatPrice(deciding.req.amount)} goes back to the learner's card in 5 to 10 working days and their place is freed. The card fee is not returned.</p>
            ) : (
              <p className="rt-acc__note">The learner keeps their place. They see your reason in their account and by email.</p>
            )}
            <div className="rt-field">
              <label htmlFor="rt-pws-rf-note">{deciding.approve ? "Note for the learner (optional)" : "Reason"}</label>
              {error && <p className="rt-q__err" id="rt-pws-rf-note-e"><span className="rt-sr">Error: </span>{error}</p>}
              <textarea id="rt-pws-rf-note" rows={4} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" aria-invalid={error ? true : undefined} aria-describedby={error ? "rt-pws-rf-note-e" : undefined} />
            </div>
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy || undefined}>{busy ? "Saving…" : deciding.approve ? `Refund ${formatPrice(deciding.req.amount)}` : "Decline the request"}</button>
          </form>
        )}
      </Sheet>
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
