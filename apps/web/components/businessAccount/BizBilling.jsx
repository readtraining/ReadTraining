"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { businessAccount as biz } from "@/data/businessAccount";
import { getBusiness, payBalance } from "@/lib/businessAccount";
import { formatDate, formatPrice } from "@/lib/format";
import Sheet from "@/components/testPrep/runner/Sheet";

const copy = biz.billing;
const STATUS_TONE = { paid: "completed", due: "confirmed", overdue: "requested" };

// Billing and invoices: the business credit account (limit, used, available, the amount due and when, the payment terms) with Pay
// balance (a simulated card payment: the open invoices are marked paid and the credit frees up), every invoice with its status and
// a View that opens it with Print, and the billing details on the account. ?invoice= (from the bookings) opens one invoice.
export default function BizBilling() {
  const [data, setData] = useState(null);
  const [view, setView] = useState(null); // invoice number shown
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const payRef = useRef(null);
  useEffect(() => {
    const d = getBusiness();
    setData(d);
    const asked = new URLSearchParams(window.location.search).get("invoice");
    if (asked && d.invoices.some((i) => i.number === asked)) setView(asked);
  }, []);
  if (!data) return null;

  const open = data.invoices.filter((i) => i.status !== "paid");
  const usedPct = Math.min(100, (data.credit.used / data.credit.limit) * 100);
  const invoice = view && data.invoices.find((i) => i.number === view);
  const purchase = invoice && data.purchases.find((p) => p.reference === invoice.reference);
  const pay = async () => {
    setBusy(true);
    const amount = formatPrice(data.credit.due);
    await payBalance(open.map((i) => i.number));
    setBusy(false);
    setPaying(false);
    setData(getBusiness());
    setDone(copy.paid.replace("{amount}", amount));
  };

  return (
    <div className="rt-acc__stack">
      {done && <p className="rt-acc__banner -done" role="status">{done}</p>}

      <section className="rt-acc__card" aria-labelledby="rt-bb-credit-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-bb-credit-h">{copy.credit.title}</h2>
          <span className="rt-pill rt-acc__status -completed">Active facility</span>
        </div>
        <div className="rt-biz__credit">
          <dl className="rt-biz__creditnums">
            <div><dt>{copy.credit.limit}</dt><dd>{formatPrice(data.credit.limit)}</dd></div>
            <div><dt>{copy.credit.used}</dt><dd>{formatPrice(data.credit.used)}</dd></div>
            <div><dt>{copy.credit.available}</dt><dd className="-ok">{formatPrice(data.credit.available)}</dd></div>
          </dl>
          <div className="rt-biz__meter" role="img" aria-label={`${Math.round(usedPct)}% of your credit used`}><span style={{ width: `${usedPct}%` }}></span></div>
          <div className="rt-biz__due">
            <div>
              <span>{copy.credit.due}</span>
              <strong>{formatPrice(data.credit.due)}</strong>
              <small>{data.credit.due > 0 ? `Next due ${formatDate(data.credit.dueDate)} · ${copy.credit.terms} ${data.credit.terms}` : `${copy.credit.terms} ${data.credit.terms}`}</small>
            </div>
            {data.credit.due > 0 && <button type="button" ref={payRef} className="button -md -purple-1 text-white" aria-haspopup="dialog" onClick={() => setPaying(true)}>{copy.pay}</button>}
          </div>
        </div>
      </section>

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-bb-inv-h">
        <h2 className="rt-acc__h2" id="rt-bb-inv-h">{copy.invoices.title}</h2>
        <table className="rt-biz__table">
          <thead><tr>{copy.invoices.columns.map((c) => <th key={c} scope="col">{c}</th>)}<th scope="col"><span className="rt-sr">Actions</span></th></tr></thead>
          <tbody>
            {data.invoices.map((i) => (
              <tr key={i.number}>
                <td data-label={copy.invoices.columns[0]}><b>{i.number}</b></td>
                <td data-label={copy.invoices.columns[1]}>{formatDate(i.date)}<small>{i.status === "paid" ? "Paid" : `Due ${formatDate(i.due)}`}</small></td>
                <td data-label={copy.invoices.columns[2]}>{i.reference}</td>
                <td data-label={copy.invoices.columns[3]}><b>{formatPrice(i.amount)}</b></td>
                <td data-label={copy.invoices.columns[4]}><span className={`rt-pill rt-acc__status -${STATUS_TONE[i.status]}`}>{copy.status[i.status]}</span></td>
                <td className="rt-biz__act"><button type="button" className="fb-textlink rt-biz__linkbtn" aria-haspopup="dialog" onClick={() => setView(i.number)}>{copy.invoices.view}<span className="rt-sr"> {i.number}</span></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-bb-det-h">
        <h2 className="rt-acc__h2" id="rt-bb-det-h">{copy.details.title}</h2>
        <dl className="rt-biz__details">
          <div><dt>Company</dt><dd>{data.company.name}</dd></div>
          <div><dt>Account number</dt><dd>{data.company.account}</dd></div>
          <div><dt>Billing email</dt><dd>{data.company.email}</dd></div>
          <div><dt>Billing address</dt><dd>{data.company.address}</dd></div>
          <div><dt>VAT number</dt><dd>{data.company.vat}</dd></div>
        </dl>
        <p className="rt-acc__note">{copy.details.change} <Link href={copy.details.cta.href}>{copy.details.cta.label}</Link>.</p>
      </section>

      <Sheet open={paying} onClose={() => setPaying(false)} title={copy.payTitle} closeLabel="Close" fallbackFocus={payRef}>
        <p className="rt-acc__note">{copy.payText.replace("{amount}", formatPrice(data.credit.due))}</p>
        <ul className="rt-ck__items rt-biz__payitems">
          {open.map((i) => <li key={i.number}><div className="rt-ck__itemtop"><b>{i.number}</b><span>{formatPrice(i.amount)}</span></div><p>Due {formatDate(i.due)}</p></li>)}
        </ul>
        <button type="button" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy} onClick={pay}>{busy ? "Paying" : copy.payConfirm.replace("{amount}", formatPrice(data.credit.due))}</button>
      </Sheet>

      <Sheet open={Boolean(invoice)} onClose={() => setView(null)} title={invoice ? `Invoice ${invoice.number}` : ""} closeLabel="Close" className="rt-biz__invoice">
        {invoice && (
          <div className="rt-biz__invbody">
            <dl className="rt-biz__details">
              <div><dt>Billed to</dt><dd>{data.company.name}, {data.company.address}</dd></div>
              <div><dt>Date</dt><dd>{formatDate(invoice.date)}</dd></div>
              <div><dt>Booking</dt><dd>{invoice.reference}{purchase?.po ? ` · ${purchase.po}` : ""}</dd></div>
              <div><dt>Status</dt><dd>{copy.status[invoice.status]}{invoice.status !== "paid" ? `, due ${formatDate(invoice.due)}` : ""}</dd></div>
            </dl>
            {purchase && (
              <ul className="rt-ck__items">
                <li><div className="rt-ck__itemtop"><b>{purchase.title}</b><span>{formatPrice(purchase.total)}</span></div><p>{purchase.places} {purchase.places === 1 ? "place" : "places"} × {formatPrice(purchase.unit)} · {formatDate(purchase.date)}</p></li>
              </ul>
            )}
            <div className="rt-bk__total"><span>Total</span><strong>{formatPrice(invoice.amount)}</strong></div>
            <button type="button" className="button -md -outline-purple-1 text-purple-1 rt-btn-block" onClick={() => window.print()}>{copy.invoices.print}</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
