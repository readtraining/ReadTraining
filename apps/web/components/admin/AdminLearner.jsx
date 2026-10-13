"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { admin as A } from "@/data/admin";
import { addWalletCredit, closeAccount, logExport, setConsent, useAdmin } from "@/lib/admin";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate, formatPrice } from "@/lib/format";
import { Pill, formatWhen } from "./adminParts";
import { MONEY_TONE } from "./AdminOrders";
import { CertPill } from "./AdminLearners";

const copy = A.learners;
const d = copy.detail;

// One learner: profile and status; bookings (each order with its course, date and money state); wallet (balance, every credit,
// "Add goodwill credit" up to the Support limit, with a reason); consents (marketing emails and texts, as switches); their
// certificates; and Data and account: download everything held about them (a JSON file, for a subject access request) and close
// the account (confirmed first). Every change is kept with an audit entry and announced.
export default function AdminLearner({ id }) {
  const data = useAdmin();
  const [crediting, setCrediting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [form, setForm] = useState({ amount: "", note: "" });
  const [errors, setErrors] = useState({});
  const [said, setSaid] = useState("");
  const formRef = useRef(null);
  if (!data) return null;
  const l = data.learners.find((x) => x.id === id);
  if (!l) return <p className="rt-acc__card rt-acc__empty">This learner was not found. <Link href="/admin/learners">{d.back}</Link></p>;
  const certs = data.certificates.filter((c) => c.holder === l.name);
  const limit = data.fees.supportLimit;

  const sendCredit = (e) => {
    e.preventDefault();
    const found = {};
    const n = Number(form.amount);
    if (!/^\d+(\.\d{1,2})?$/.test(form.amount.trim()) || n < 1 || n > limit) found.amount = d.amountError.replace("£100", formatPrice(limit).replace(".00", ""));
    if (!form.note.trim()) found.note = d.reasonError;
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    addWalletCredit(l, n, form.note.trim());
    setSaid(`Added ${formatPrice(n)} to ${l.name}'s wallet`);
    setCrediting(false);
  };
  const download = () => {
    const file = { exported: new Date().toISOString(), learner: { name: l.name, email: l.email, phone: l.phone, joined: new Date(l.joined).toISOString(), status: l.status, consents: l.consents }, orders: l.orders.map((o) => ({ reference: o.ref, total: o.total, method: o.method, lines: o.lines.map((x) => ({ course: x.title, date: x.date, provider: x.provider, delegates: x.delegates })) })), wallet: l.wallet, certificates: certs };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${l.name.toLowerCase().replace(/\s+/g, "-")}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
    logExport(l);
    setSaid("Data downloaded");
  };
  const err = (k) => errors[k] && <p className="rt-q__err" id={`rt-adm-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>;

  return (
    <div className="rt-acc__stack">
      <Link href="/admin/learners" className="fb-textlink rt-adm-back"><i className="icon-arrow-left text-12" aria-hidden="true"></i>{d.back}</Link>
      <p className="rt-sr" aria-live="polite">{said}</p>

      <section className="rt-acc__card rt-adm-hero" aria-label={d.profile}>
        <div>
          <div className="rt-adm-item__top"><Pill tone={l.status === "closed" ? "muted" : "ok"}>{l.status === "closed" ? d.closed : "Active"}</Pill></div>
          <h2 className="rt-acc__h2 rt-adm-hero__name">{l.name}</h2>
          <p className="rt-acc__note">{l.email} · {l.phone} · Joined {formatDate(new Date(l.joined).toISOString().slice(0, 10))}</p>
        </div>
      </section>

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-adm-lb-h">
        <h2 className="rt-acc__h2" id="rt-adm-lb-h">{d.bookings}</h2>
        {l.orders.length ? (
          <table className="rt-biz__table rt-adm-table">
            <thead><tr><th scope="col">Reference</th><th scope="col">Course</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {l.orders.map((o) => (
                <tr key={o.ref}>
                  <td data-label="Reference"><Link href={`/admin/orders/${o.ref}`} className="rt-adm-strong">{o.ref}</Link></td>
                  <td data-label="Course">{o.lines[0].title}<small>{formatDate(o.lines[0].date)}</small></td>
                  <td data-label="Total">{formatPrice(o.total)}</td>
                  <td data-label="Status"><Pill tone={MONEY_TONE[o.lines[0].money]}>{A.orders.money[o.lines[0].money]}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="rt-acc__empty rt-adm-tablenote">No bookings yet.</p>}
      </section>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-w-h">
          <div className="rt-acc__cardhead">
            <h2 className="rt-acc__h2" id="rt-adm-w-h">{d.wallet}</h2>
            <strong className="rt-adm-price">{formatPrice(l.balance)}</strong>
          </div>
          {l.wallet.length ? (
            <ul className="rt-adm-list">
              {l.wallet.map((w) => <li key={w.at}><div><span className="rt-adm-strong">{w.note}</span><small>{w.who} · {formatWhen(w.at)}</small></div><span className="rt-adm-strong">+{formatPrice(w.amount)}</span></li>)}
            </ul>
          ) : <p className="rt-acc__empty">No wallet credit.</p>}
          {l.status !== "closed" && <button type="button" className="button -sm -outline-purple-1 text-purple-1 rt-adm-mt" onClick={() => { setCrediting(true); setErrors({}); setForm({ amount: "", note: "" }); }}>{d.addCredit}</button>}
          <p className="rt-acc__note">{d.walletNote.replace("£100", formatPrice(limit).replace(".00", ""))}</p>
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-adm-c-h">
          <h2 className="rt-acc__h2" id="rt-adm-c-h">{d.consents}</h2>
          <div className="rt-adm-checks">
            <label className="rt-bk__check" htmlFor="rt-adm-ce"><input id="rt-adm-ce" type="checkbox" checked={l.consents.email} onChange={(e) => { setConsent(l, "email", e.target.checked); setSaid(`Marketing emails ${e.target.checked ? "on" : "off"}`); }} /><span>Marketing emails</span></label>
            <label className="rt-bk__check" htmlFor="rt-adm-cs"><input id="rt-adm-cs" type="checkbox" checked={l.consents.sms} onChange={(e) => { setConsent(l, "sms", e.target.checked); setSaid(`Marketing texts ${e.target.checked ? "on" : "off"}`); }} /><span>Marketing texts</span></label>
          </div>
          <p className="rt-acc__note">Change these only when the learner asks. Booking emails are always sent.</p>
        </section>
      </div>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-lc-h">
          <h2 className="rt-acc__h2" id="rt-adm-lc-h">{d.certificates}</h2>
          {certs.length ? (
            <ul className="rt-adm-list">
              {certs.map((c) => <li key={c.number}><div><span className="rt-adm-strong">{c.course}</span><small>{c.number} · {c.expires ? `Expires ${formatDate(c.expires)}` : "No expiry"}</small></div><CertPill cert={c} now={data.now} /></li>)}
            </ul>
          ) : <p className="rt-acc__empty">No certificates yet.</p>}
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-adm-pr-h">
          <h2 className="rt-acc__h2" id="rt-adm-pr-h">{d.privacy}</h2>
          <div className="rt-adm-privacy">
            <div>
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={download}>{d.exportData}</button>
              <p className="rt-acc__note">{d.exportNote}</p>
            </div>
            {l.status !== "closed" && (
              <div>
                <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setClosing(true)}>{d.close}</button>
                <p className="rt-acc__note">{d.closeNote}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <Sheet open={crediting} onClose={() => setCrediting(false)} title={d.creditTitle} closeLabel="Close">
        <form className="rt-q__form rt-biz__sheetform" onSubmit={sendCredit} noValidate ref={formRef}>
          <p className="rt-acc__note">{l.name} · balance {formatPrice(l.balance)}</p>
          <div className="rt-field">
            <label htmlFor="rt-adm-amount">{d.amount}</label>
            {err("amount")}
            <input id="rt-adm-amount" type="text" inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} aria-invalid={errors.amount ? true : undefined} aria-describedby={errors.amount ? "rt-adm-amount-e" : undefined} className="rt-ck__short" />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-adm-note">{d.reason}</label>
            {err("note")}
            <textarea id="rt-adm-note" rows={3} maxLength={300} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} aria-invalid={errors.note ? true : undefined} aria-describedby={errors.note ? "rt-adm-note-e" : undefined} />
          </div>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{d.addCredit}</button>
        </form>
      </Sheet>

      <Sheet open={closing} onClose={() => setClosing(false)} title={`${d.close}: ${l.name}`} closeLabel="Close">
        <div className="rt-biz__sheetform">
          <p className="rt-acc__note">{d.closeNote}</p>
          <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={() => { closeAccount(l); setClosing(false); setSaid("Account closed"); }}>{d.close}</button>
          <button type="button" className="button -md -outline-purple-1 text-purple-1 rt-btn-block" onClick={() => setClosing(false)}>Keep the account open</button>
        </div>
      </Sheet>
    </div>
  );
}
