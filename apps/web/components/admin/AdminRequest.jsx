"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { admin as A } from "@/data/admin";
import { adminWork as W } from "@/data/adminWork";
import { useAdmin } from "@/lib/admin";
import { addRequestNote, advanceRequest, assignRequest, cancelRequest, nextLabel, nextStatus, toggleRequestDoc } from "@/lib/adminWork";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import Sheet from "@/components/testPrep/runner/Sheet";
import { Due, Pill, formatWhen } from "./adminParts";
import { REQUEST_TONE } from "./AdminRequests";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { EmptyState } from "@/components/states/States";

const copy = W.requests;
const d = copy.detail;

// One request: its progress as steps, what they asked for, their contact details, the document checklist ("apply for me"), who
// has it, the next action (send a quote asks for the amount; the payment link waits for every document to be checked), cancel
// with a reason (the cancellation rule shown), the timeline and the team's notes. Each change is saved.
export default function AdminRequest({ reference }) {
  const data = useAdmin();
  const [said, setSaid] = useState("");
  const [assignee, setAssignee] = useState(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [note, setNote] = useState("");
  const quoteRef = useRef(null);
  const cancelRef = useRef(null);
  const noteRef = useRef(null);
  if (!data) return null;
  const r = data.requests.find((x) => x.ref === reference);
  if (!r) return <EmptyState title="This request was not found." action={{ href: "/admin/requests", label: d.back }} />;

  const steps = copy.steps[r.kind];
  const at = steps.indexOf(r.status);
  const to = nextStatus(r);
  const needsDocs = r.status === "documents" && r.docs && r.checked.length < r.docs.length;
  const sendsQuote = r.status === "new" && ["quote", "inhouse", "training"].includes(r.kind);

  const next = () => {
    if (sendsQuote) return setQuoteOpen(true);
    advanceRequest(r);
    setSaid(copy.statuses[to]);
  };
  const sendQuote = (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!amount || !Number.isFinite(n) || n <= 0) {
      setErrors({ amount: "Enter the quote total, like 1080." });
      return focusFirstError(quoteRef.current);
    }
    advanceRequest(r, { amount: Math.round(n * 100) / 100 });
    setQuoteOpen(false);
    setErrors({});
    setSaid("Quote sent");
  };
  const doCancel = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrors({ reason: "Write why the request is cancelled." });
      return focusFirstError(cancelRef.current);
    }
    cancelRequest(r, reason.trim());
    setCancelOpen(false);
    setErrors({});
    setSaid("Request cancelled");
  };
  const saveNote = (e) => {
    e.preventDefault();
    if (!note.trim()) {
      setErrors({ note: "Write the note first." });
      return focusFirstError(noteRef.current);
    }
    addRequestNote(r, note.trim());
    setNote("");
    setErrors({});
    setSaid("Note added");
  };

  return (
    <div className="rt-acc__stack">
      <Link href="/admin/requests" className="fb-textlink rt-adm-back"><i className="icon-arrow-left text-12" aria-hidden="true"></i>{d.back}</Link>
      <p className="rt-sr" aria-live="polite">{said}</p>

      <section className="rt-acc__card rt-adm-hero" aria-label="Request">
        <div>
          <div className="rt-adm-item__top">
            <Pill tone={REQUEST_TONE[r.status] || "info"}>{copy.statuses[r.status]}</Pill>
            <span className="rt-adm-item__when">{copy.kinds[r.kind]} · {formatWhen(r.at)}</span>
            {r.status === "new" && <Due due={r.due} now={data.now} />}
          </div>
          <h2 className="rt-acc__h2 rt-adm-hero__name">{r.ref}</h2>
          <p className="rt-acc__note">{r.title}{r.price ? ` · ${formatPrice(r.price)}` : ""}{r.amount ? ` · Quoted ${formatPrice(r.amount)}` : ""}</p>
          {r.cancelReason && <p className="rt-acc__note">Cancelled: {r.cancelReason}</p>}
        </div>
        {r.open && (
          <div className="rt-adm-hero__actions">
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setCancelOpen(true)}>{d.cancel}</button>
            {to && (
              <button type="button" className="button -sm -purple-1 text-white" onClick={next} disabled={needsDocs} aria-describedby={needsDocs ? "rt-adm-docs-note" : undefined}>{nextLabel(r)}</button>
            )}
          </div>
        )}
      </section>

      {at >= 0 && (
        <section className="rt-acc__card" aria-label={d.steps}>
          <ol className="rt-bk__steps rt-adm-money" aria-label={d.steps}>
            {steps.map((s, i) => (
              <li key={s} className={`rt-bk__step is-${i < at ? "done" : i === at ? "current" : "todo"}`} aria-current={i === at ? "step" : undefined}>
                <span className="rt-bk__stepn" aria-hidden="true">{i + 1}</span>
                <span className="rt-bk__stepl">{copy.statuses[s]}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-rq-h">
          <h2 className="rt-acc__h2" id="rt-adm-rq-h">{d.details}</h2>
          <dl className="rt-adm-dl">
            {r.details.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-adm-rc-h">
          <h2 className="rt-acc__h2" id="rt-adm-rc-h">{d.contact}</h2>
          <dl className="rt-adm-dl">
            <div><dt>Name</dt><dd>{r.name}</dd></div>
            {r.company && <div><dt>Company</dt><dd>{r.company}</dd></div>}
            <div><dt>Email</dt><dd><a href={`mailto:${r.email}`}>{r.email}</a></dd></div>
            {r.phone && <div><dt>Phone</dt><dd><a href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a></dd></div>}
          </dl>
          {r.open && (
            <form className="rt-adm-inline" noValidate onSubmit={(e) => { e.preventDefault(); assignRequest(r, assignee ?? r.assignee); setSaid("Assigned"); }}>
              <div className="rt-field">
                <label htmlFor="rt-adm-assign">{d.assign}</label>
                <FieldSelect id="rt-adm-assign" label={d.assign} value={assignee ?? r.assignee} onChange={setAssignee} options={[{ value: "", label: copy.unassigned }, ...data.staff]} compact />
              </div>
              <button type="submit" className="button -sm -outline-purple-1 text-purple-1">{d.assignSave}</button>
            </form>
          )}
        </section>
      </div>

      {r.docs && (
        <section className="rt-acc__card rt-adm-checks" aria-labelledby="rt-adm-docs-h">
          <h2 className="rt-acc__h2" id="rt-adm-docs-h">{d.docs}</h2>
          <p className="rt-acc__note" id="rt-adm-docs-note">{d.docsNote}</p>
          <ul className="rt-adm-checklist">
            {r.docs.map((doc, i) => (
              <li key={doc}>
                <label className="rt-po__check" htmlFor={`rt-adm-doc-${i}`}>
                  <input id={`rt-adm-doc-${i}`} type="checkbox" className="rt-fp__check" checked={r.checked.includes(i)} disabled={!r.open} onChange={() => toggleRequestDoc(r, i)} />
                  <span>{doc}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-rt-h">
          <h2 className="rt-acc__h2" id="rt-adm-rt-h">Timeline</h2>
          <ol className="rt-adm-timeline">
            {r.events.map((e) => <li key={`${e.at}-${e.text}`}><span>{e.text}</span><small>{formatWhen(e.at)}</small></li>)}
          </ol>
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-adm-rn-h">
          <h2 className="rt-acc__h2" id="rt-adm-rn-h">{d.notes}</h2>
          <form className="rt-adm-noteform" onSubmit={saveNote} noValidate ref={noteRef}>
            <div className="rt-field">
              <label htmlFor="rt-adm-rnote" className="rt-sr">{A.providers.detail.notePlaceholder}</label>
              {errors.note && <p className="rt-q__err" id="rt-adm-rnote-e"><span className="rt-sr">Error: </span>{errors.note}</p>}
              <textarea id="rt-adm-rnote" rows={3} maxLength={1000} placeholder={A.providers.detail.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={errors.note ? true : undefined} aria-describedby={errors.note ? "rt-adm-rnote-e" : undefined} />
            </div>
            <button type="submit" className="button -sm -outline-purple-1 text-purple-1">{A.providers.detail.addNote}</button>
          </form>
          {r.notes.length > 0 && (
            <ul className="rt-adm-notes">
              {r.notes.map((n) => <li key={n.at}><p>{n.text}</p><small>{n.who} · {formatWhen(n.at)}</small></li>)}
            </ul>
          )}
        </section>
      </div>

      <Sheet open={quoteOpen} onClose={() => setQuoteOpen(false)} title={nextLabel(r)} closeLabel="Close">
        <form className="rt-q__form" onSubmit={sendQuote} noValidate ref={quoteRef}>
          <div className="rt-field">
            <label htmlFor="rt-adm-qamount">{d.quoteAmount}</label>
            {errors.amount && <p className="rt-q__err" id="rt-adm-qamount-e"><span className="rt-sr">Error: </span>{errors.amount}</p>}
            <input id="rt-adm-qamount" type="number" min="1" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={errors.amount ? true : undefined} aria-describedby={errors.amount ? "rt-adm-qamount-e" : undefined} />
          </div>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{nextLabel(r)}</button>
        </form>
      </Sheet>

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title={d.cancel} closeLabel="Close">
        <form className="rt-q__form" onSubmit={doCancel} noValidate ref={cancelRef}>
          {r.kind === "licence" && <p className="rt-acc__note">{d.cancelRule}</p>}
          <div className="rt-field">
            <label htmlFor="rt-adm-creason">{d.cancelReason}</label>
            {errors.reason && <p className="rt-q__err" id="rt-adm-creason-e"><span className="rt-sr">Error: </span>{errors.reason}</p>}
            <textarea id="rt-adm-creason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={errors.reason ? true : undefined} aria-describedby={errors.reason ? "rt-adm-creason-e" : undefined} />
          </div>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{d.cancel}</button>
        </form>
      </Sheet>
    </div>
  );
}
