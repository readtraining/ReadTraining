"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { admin as A } from "@/data/admin";
import { adminWork as W } from "@/data/adminWork";
import { useAdmin } from "@/lib/admin";
import { addBusinessNote, changeCreditLimit, offerCredit, markInvoicePaid, remindInvoice, setCreditHold } from "@/lib/adminWork";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate, formatPrice } from "@/lib/format";
import Sheet from "@/components/testPrep/runner/Sheet";
import { Pill, formatWhen } from "./adminParts";
import { CREDIT_TONE } from "./AdminBusinesses";

const copy = W.businesses;
const d = copy.detail;
const INVOICE_TONE = { paid: "ok", due: "info", overdue: "late" };

// One business account: the company, places bought vs assigned, the credit facility (as on Hurak, companies don't apply: we offer
// credit with a limit once their history meets every eligibility check; then change the limit, put credit on hold or lift it), money owed by age, the invoices with their purchase orders (send a reminder,
// mark paid), and the team's notes. Each change is saved with an audit entry.
export default function AdminBusiness({ slug }) {
  const data = useAdmin();
  const [said, setSaid] = useState("");
  const [limitOpen, setLimitOpen] = useState(false);
  const [limit, setLimit] = useState("");
  const [errors, setErrors] = useState({});
  const [note, setNote] = useState("");
  const limitRef = useRef(null);
  const noteRef = useRef(null);
  if (!data) return null;
  const b = data.businesses.find((x) => x.slug === slug);
  if (!b) return <p className="rt-acc__card rt-acc__empty">This business account was not found. <Link href="/admin/businesses">{d.back}</Link></p>;

  const used = b.limit > 0 ? Math.min(100, Math.round((b.used / b.limit) * 100)) : 0;
  const openLimit = () => {
    setLimit(String(b.limit || copy.defaultLimit));
    setErrors({});
    setLimitOpen(true);
  };
  const saveLimit = (e) => {
    e.preventDefault();
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 500) {
      setErrors({ limit: "Enter a whole number of £500 or more, like 5000." });
      return focusFirstError(limitRef.current);
    }
    if (b.credit === "none") offerCredit(b, n);
    else changeCreditLimit(b, n);
    setLimitOpen(false);
    setSaid("Credit saved");
  };
  const saveNote = (e) => {
    e.preventDefault();
    if (!note.trim()) {
      setErrors({ note: "Write the note first." });
      return focusFirstError(noteRef.current);
    }
    addBusinessNote(b, note.trim());
    setNote("");
    setErrors({});
    setSaid("Note added");
  };

  return (
    <div className="rt-acc__stack">
      <Link href="/admin/businesses" className="fb-textlink rt-adm-back"><i className="icon-arrow-left text-12" aria-hidden="true"></i>{d.back}</Link>
      <p className="rt-sr" aria-live="polite">{said}</p>

      <section className="rt-acc__card rt-adm-hero" aria-label="Business account">
        <div>
          <div className="rt-adm-item__top">
            <Pill tone={CREDIT_TONE[b.credit]}>{copy.credit[b.credit]}</Pill>
            <span className="rt-adm-item__when">Customer since {formatDate(b.since)}</span>
          </div>
          <h2 className="rt-acc__h2 rt-adm-hero__name">{b.name}</h2>
          <p className="rt-acc__note">{b.sector} · {b.city} · {b.contact}</p>
        </div>
        <div className="rt-adm-hero__actions">
          {b.eligible && <button type="button" className="button -sm -purple-1 text-white" onClick={openLimit}>{d.approve}</button>}
          {b.credit === "approved" && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setCreditHold(b, true); setSaid("Credit on hold"); }}>{d.suspend}</button>}
          {b.credit === "suspended" && <button type="button" className="button -sm -purple-1 text-white" onClick={() => { setCreditHold(b, false); setSaid("Credit hold lifted"); }}>{d.resume}</button>}
        </div>
      </section>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-bc-h">
          <h2 className="rt-acc__h2" id="rt-adm-bc-h">{d.credit}</h2>
          {b.limit > 0 ? (
            <>
              <div className="rt-adm-meter">
                <div className="rt-ss__statTop"><span>{formatPrice(b.used)} used of {formatPrice(b.limit)}</span><b>{formatPrice(b.available)} left</b></div>
                <span className="rt-adm-bar" aria-hidden="true"><span style={{ width: `${used}%` }}></span></span>
              </div>
              <dl className="rt-adm-dl">
                <div><dt>{d.terms}</dt><dd>{copy.termsDays} days from the invoice date</dd></div>
              </dl>
              {b.credit !== "suspended" && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={openLimit}>{d.change}</button>}
            </>
          ) : (
            <>
              <p className="rt-acc__note">No credit facility. This company pays by card. {d.offerNote}</p>
              <h3 className="rt-adm-h3">{d.eligibility}</h3>
              <dl className="rt-adm-dl">
                {b.checks.map((c) => (
                  <div key={c.key}><dt>{c.label}</dt><dd><Pill tone={c.ok ? "ok" : "muted"}>{c.ok ? "Yes" : "Not yet"}</Pill> {c.value}</dd></div>
                ))}
              </dl>
              <p className="rt-acc__note">{b.eligible ? d.eligibleYes : d.eligibleNo}</p>
            </>
          )}
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-adm-bp-h">
          <h2 className="rt-acc__h2" id="rt-adm-bp-h">{d.places}</h2>
          <p className="rt-acc__note">{d.placesNote}</p>
          <dl className="rt-adm-dl">
            <div><dt>Bought</dt><dd>{b.places.bought}</dd></div>
            <div><dt>Assigned to a learner</dt><dd>{b.places.assigned}</dd></div>
            <div><dt>Not assigned yet</dt><dd>{b.places.bought - b.places.assigned}</dd></div>
            <div><dt>Contact</dt><dd><a href={`mailto:${b.email}`}>{b.email}</a></dd></div>
          </dl>
        </section>
      </div>

      <section className="rt-acc__card" aria-labelledby="rt-adm-ba-h">
        <h2 className="rt-acc__h2" id="rt-adm-ba-h">{d.aged}</h2>
        <ul className="rt-adm-aged">
          {Object.entries(copy.aged).map(([k, label]) => (
            <li key={k} className={b.aged[k] > 0 && k !== "current" ? "-late" : ""}><span>{label}</span><b>{formatPrice(b.aged[k])}</b></li>
          ))}
        </ul>
      </section>

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-adm-bi-h">
        <h2 className="rt-acc__h2 rt-adm-tabletitle" id="rt-adm-bi-h">{d.invoices}</h2>
        {b.invoices.length ? (
          <table className="rt-biz__table rt-adm-table">
            <thead><tr><th scope="col">Invoice</th><th scope="col">Issued</th><th scope="col">Due</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col"><span className="rt-sr">Actions</span></th></tr></thead>
            <tbody>
              {b.invoices.map((inv) => (
                <tr key={inv.no}>
                  <td data-label="Invoice"><b>{inv.no}</b>{inv.po && <small>{inv.po}</small>}</td>
                  <td data-label="Issued">{formatDate(inv.issued)}</td>
                  <td data-label="Due">{formatDate(inv.due)}</td>
                  <td data-label="Amount">{formatPrice(inv.amount)}</td>
                  <td data-label="Status"><Pill tone={INVOICE_TONE[inv.status]}>{copy.invoiceStatuses[inv.status]}</Pill>{inv.status === "overdue" && <small>{inv.late} days late</small>}{inv.reminded && <small>Reminded {formatWhen(inv.reminded)}</small>}</td>
                  <td data-label="Actions">
                    {inv.status !== "paid" && (
                      <div className="rt-adm-rowactions">
                        {inv.status === "overdue" && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { remindInvoice(b, inv); setSaid("Reminder sent"); }}>{d.remind}<span className="rt-sr"> for {inv.no}</span></button>}
                        <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { markInvoicePaid(b, inv); setSaid(`${inv.no} marked paid`); }}>{d.markPaid}<span className="rt-sr">: {inv.no}</span></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="rt-acc__note">No invoices yet.</p>}
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-adm-bn-h">
        <h2 className="rt-acc__h2" id="rt-adm-bn-h">{d.notes}</h2>
        <form className="rt-adm-noteform" onSubmit={saveNote} noValidate ref={noteRef}>
          <div className="rt-field">
            <label htmlFor="rt-adm-bnote" className="rt-sr">{A.providers.detail.notePlaceholder}</label>
            {errors.note && <p className="rt-q__err" id="rt-adm-bnote-e"><span className="rt-sr">Error: </span>{errors.note}</p>}
            <textarea id="rt-adm-bnote" rows={3} maxLength={1000} placeholder={A.providers.detail.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={errors.note ? true : undefined} aria-describedby={errors.note ? "rt-adm-bnote-e" : undefined} />
          </div>
          <button type="submit" className="button -sm -outline-purple-1 text-purple-1">{A.providers.detail.addNote}</button>
        </form>
        {b.notes.length > 0 && (
          <ul className="rt-adm-notes">
            {b.notes.map((n) => <li key={n.at}><p>{n.text}</p><small>{n.who} · {formatWhen(n.at)}</small></li>)}
          </ul>
        )}
      </section>

      <Sheet open={limitOpen} onClose={() => setLimitOpen(false)} title={b.credit === "none" ? d.approve : d.change} closeLabel="Close">
        <form className="rt-q__form" onSubmit={saveLimit} noValidate ref={limitRef}>
          <p className="rt-acc__note">Payment terms: {copy.termsDays} days. Default limit {formatPrice(copy.defaultLimit)}.</p>
          <div className="rt-field">
            <label htmlFor="rt-adm-limit">{d.limit}</label>
            {errors.limit && <p className="rt-q__err" id="rt-adm-limit-e"><span className="rt-sr">Error: </span>{errors.limit}</p>}
            <input id="rt-adm-limit" type="number" min="500" step="500" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} aria-invalid={errors.limit ? true : undefined} aria-describedby={errors.limit ? "rt-adm-limit-e" : undefined} />
          </div>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{b.credit === "none" ? d.approve : d.change}</button>
        </form>
      </Sheet>
    </div>
  );
}
