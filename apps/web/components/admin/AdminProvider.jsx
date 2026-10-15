"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { admin as A } from "@/data/admin";
import { addProviderNote, approvalBlockers, decideApproval, docState, setProviderCommission, setProviderHold, setProviderStatus, useAdmin, verifyProviderDoc } from "@/lib/admin";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate } from "@/lib/format";
import { Pill, formatWhen } from "./adminParts";
import { STATUS_TONE } from "./AdminProviders";

const copy = A.providers;
const d = copy.detail;
const DOC_TONE = { ok: "ok", expiring: "warn", expired: "late" };

// One provider: its status and the actions that change it (approve an application, only once every document is in date and
// verified; suspend; reinstate), the profile, the documents
// with their expiry (expired = red, within 30 days = orange) and "Mark verified", the commission override, the payout hold, and
// the team's notes. Every change is kept with an audit entry (lib/admin.js) and announced.
export default function AdminProvider({ slug }) {
  const data = useAdmin();
  const [rate, setRate] = useState("");
  const [rateError, setRateError] = useState("");
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [said, setSaid] = useState("");
  const rateRef = useRef(null);
  const noteRef = useRef(null);
  const p = data?.providers.find((x) => x.slug === slug);
  useEffect(() => {
    if (p) setRate(String(p.commission));
  }, [p?.commission]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return null;
  if (!p) return <p className="rt-acc__card rt-acc__empty">This provider was not found. <Link href="/admin/providers">{d.back}</Link></p>;

  const now = data.now;
  const application = data.approvals.find((a) => a.id === `app-${p.slug}`);
  const isApplicant = ["applied", "review", "changes"].includes(p.status);
  const blockers = approvalBlockers(p, now);
  const done = (text) => setSaid(text);

  const saveRate = (e) => {
    e.preventDefault();
    const n = Number(rate);
    if (!/^\d{1,2}(\.\d)?$/.test(rate.trim()) || n < 0 || n > 60) {
      setRateError("Enter a commission between 0 and 60, like 25.");
      return focusFirstError(rateRef.current);
    }
    setRateError("");
    setProviderCommission(p, n);
    done(`Commission set to ${n}%`);
  };
  const saveNote = (e) => {
    e.preventDefault();
    if (!note.trim()) {
      setNoteError("Write the note first.");
      return focusFirstError(noteRef.current);
    }
    setNoteError("");
    addProviderNote(p, note.trim());
    setNote("");
    done("Note added");
  };

  return (
    <div className="rt-acc__stack">
      <Link href="/admin/providers" className="fb-textlink rt-adm-back"><i className="icon-arrow-left text-12" aria-hidden="true"></i>{d.back}</Link>
      <p className="rt-sr" aria-live="polite">{said}</p>

      <section className="rt-acc__card rt-adm-hero" aria-label="Status">
        <div>
          <div className="rt-adm-item__top">
            <Pill tone={STATUS_TONE[p.status]}>{copy.statuses[p.status]}</Pill>
            {p.hold && <Pill tone="warn">{d.payoutHold}</Pill>}
          </div>
          <h2 className="rt-acc__h2 rt-adm-hero__name">{p.name}</h2>
          <p className="rt-acc__note">{p.city} · {p.courses} {p.courses === 1 ? "course" : "courses"} · {p.subjects.map((s) => s.replace(/-/g, " ")).join(", ")}</p>
        </div>
        <div className="rt-adm-hero__actions">
          {isApplicant && application && application.status !== "approved" && (blockers.length ? (
            <p className="rt-adm-item__block"><strong>{A.approvals.blocked}</strong> {blockers.join(", ")}.</p>
          ) : (
            <button type="button" className="button -sm -purple-1 text-white" onClick={() => { decideApproval(application, "approved"); done(`${p.name} approved`); }}>{d.approve}</button>
          ))}
          {p.status === "active" && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setProviderStatus(p, "suspended"); done(`${p.name} suspended`); }}>{d.suspend}</button>}
          {p.status === "suspended" && <button type="button" className="button -sm -purple-1 text-white" onClick={() => { setProviderStatus(p, "active"); done(`${p.name} reinstated`); }}>{d.reinstate}</button>}
          {p.listed && <Link href={`/providers/${p.slug}`} className="fb-textlink">Public profile<i className="icon-arrow-top-right text-12" aria-hidden="true"></i></Link>}
        </div>
      </section>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-prof-h">
          <h2 className="rt-acc__h2" id="rt-adm-prof-h">{d.profile}</h2>
          <dl className="rt-adm-dl">
            <div><dt>Contact</dt><dd>{p.contact}</dd></div>
            <div><dt>Email</dt><dd>{p.email}</dd></div>
            <div><dt>Company number</dt><dd>{p.company}</dd></div>
            <div><dt>VAT</dt><dd>{p.vat}</dd></div>
            <div><dt>{p.listed ? "On ReadTraining since" : "Applied"}</dt><dd>{p.listed ? formatDate(p.joined) : formatWhen(p.applied)}</dd></div>
          </dl>
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-adm-docs-h">
          <h2 className="rt-acc__h2" id="rt-adm-docs-h">{d.documents}</h2>
          <ul className="rt-adm-list">
            {p.documents.map((doc) => {
              const st = docState(doc, now);
              return (
                <li key={doc.key}>
                  <div>
                    <span className="rt-adm-strong">{doc.type}</span>
                    <small>{doc.ref} · {st === "expired" ? "Expired" : d.expires} {formatDate(doc.expires)}</small>
                  </div>
                  <div className="rt-adm-list__side">
                    {st !== "ok" && <Pill tone={DOC_TONE[st]}>{st === "expired" ? d.expired : d.expiring}</Pill>}
                    {doc.verified ? <Pill tone="ok">{d.verified}</Pill> : <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { verifyProviderDoc(p, doc); done(`${doc.type} verified`); }}>{d.verify}</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-adm-com-h">
          <h2 className="rt-acc__h2" id="rt-adm-com-h">{d.commission}</h2>
          <form className="rt-adm-inline" onSubmit={saveRate} noValidate ref={rateRef}>
            <div className="rt-field">
              <label htmlFor="rt-adm-rate">Commission (%)</label>
              <small className="rt-field__hint" id="rt-adm-rate-hint">{d.commissionNote.replace("{rate}", data.fees.commission)}</small>
              {rateError && <p className="rt-q__err" id="rt-adm-rate-e"><span className="rt-sr">Error: </span>{rateError}</p>}
              <div className="rt-adm-inline__row">
                <input id="rt-adm-rate" type="text" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} aria-invalid={rateError ? true : undefined} aria-describedby={`rt-adm-rate-hint${rateError ? " rt-adm-rate-e" : ""}`} className="rt-adm-num" />
                <button type="submit" className="button -sm -purple-1 text-white">Save</button>
              </div>
            </div>
          </form>
          <div className="rt-adm-hold">
            <label className="rt-bk__check" htmlFor="rt-adm-hold">
              <input id="rt-adm-hold" type="checkbox" checked={p.hold} onChange={(e) => { setProviderHold(p, e.target.checked); done(e.target.checked ? "Payout hold placed" : "Payout hold lifted"); }} />
              <span>{d.payoutHold}</span>
            </label>
            <p className="rt-acc__note">{d.payoutHoldNote}</p>
          </div>
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-adm-notes-h">
          <h2 className="rt-acc__h2" id="rt-adm-notes-h">{d.notes}</h2>
          <form className="rt-adm-noteform" onSubmit={saveNote} noValidate ref={noteRef}>
            <div className="rt-field">
              <label htmlFor="rt-adm-note" className="rt-sr">{d.notePlaceholder}</label>
              {noteError && <p className="rt-q__err" id="rt-adm-note-e"><span className="rt-sr">Error: </span>{noteError}</p>}
              <textarea id="rt-adm-note" rows={3} maxLength={1000} placeholder={d.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={noteError ? true : undefined} aria-describedby={noteError ? "rt-adm-note-e" : undefined} />
            </div>
            <button type="submit" className="button -sm -outline-purple-1 text-purple-1">{d.addNote}</button>
          </form>
          {p.notes.length > 0 && (
            <ul className="rt-adm-notes">
              {p.notes.map((n) => <li key={n.at}><p>{n.text}</p><small>{n.who} · {formatWhen(n.at)}</small></li>)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
