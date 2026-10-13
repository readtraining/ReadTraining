"use client";

import React, { useEffect, useRef, useState } from "react";
import { account } from "@/data/account";
import { addCard, cardExpired, getCards, removeCard, setDefaultCard } from "@/lib/account";
import { validCardNumber, validExpiry } from "@/lib/checkout";
import Sheet from "@/components/testPrep/runner/Sheet";

const copy = account.payments;
const digits = (v) => v.replace(/\D/g, "");

// Payment methods (the client's "Payment methods"): the saved cards (brand, last 4 digits, expiry, the default one), with Make
// default and Remove, and "Add a card" in the site's pop-up (number formatted as typed, MM / YY, name, use as default), checked as
// the checkout checks them. Simulated until the payment provider is connected: the provider keeps the card, we keep its last 4 digits.
export default function AccountPayments() {
  const [cards, setCards] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ number: "", expiry: "", name: "", makeDefault: false });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [announce, setAnnounce] = useState("");
  const addRef = useRef(null);
  useEffect(() => setCards(getCards()), []);
  if (!cards) return null;

  const reload = (msg) => {
    setCards(getCards());
    setAnnounce(msg);
  };
  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!digits(form.number)) found.number = "Enter the card number.";
    else if (!validCardNumber(digits(form.number))) found.number = "Enter a valid card number.";
    if (!form.expiry.trim()) found.expiry = "Enter the card's expiry date.";
    else if (!validExpiry(form.expiry)) found.expiry = "Enter an expiry date in the future, like 08 / 28.";
    if (!form.name.trim()) found.name = "Enter the name on the card.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    const card = await addCard(form);
    setSaving(false);
    setAdding(false);
    setForm({ number: "", expiry: "", name: "", makeDefault: false });
    reload(copy.added.replace("{last4}", card.last4));
  };
  const field = (k, label, props = {}, hint, format) => (
    <div className="rt-field">
      <label htmlFor={`rt-pm-${k}`}>{label}</label>
      {hint && <small className="rt-field__hint" id={`rt-pm-${k}-hint`}>{hint}</small>}
      {errors[k] && <p className="rt-q__err" id={`rt-pm-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>}
      <input id={`rt-pm-${k}`} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: format ? format(e.target.value) : e.target.value }))} aria-invalid={errors[k] ? true : undefined} aria-describedby={[hint && `rt-pm-${k}-hint`, errors[k] && `rt-pm-${k}-e`].filter(Boolean).join(" ") || undefined} {...props} />
    </div>
  );

  return (
    <div className="rt-acc__stack">
      {announce && <p className="rt-acc__banner -done" role="status">{announce}</p>}
      <section className="rt-acc__card" aria-labelledby="rt-pm-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-pm-h">Saved cards</h2>
          <button type="button" ref={addRef} className="button -md -purple-1 text-white" aria-haspopup="dialog" onClick={() => { setErrors({}); setAdding(true); }}>{copy.add}</button>
        </div>
        {cards.length ? (
          <ul className="rt-acc__cards">
            {cards.map((c) => {
              const expired = cardExpired(c.exp);
              return (
                <li key={c.id} className={c.default ? "is-default" : undefined}>
                  <span className="rt-acc__cardmark" aria-hidden="true">{{ Visa: "VISA", Mastercard: "MC", "American Express": "AMEX" }[c.brand] || "CARD"}</span>
                  <div className="rt-acc__cardinfo">
                    <b>{c.brand} ending {c.last4}</b>
                    <span>{(expired ? copy.expired : copy.expires).replace("{date}", c.exp)} · {c.name}</span>
                  </div>
                  <div className="rt-acc__cardactions">
                    {c.default ? <span className="rt-pill rt-acc__status -confirmed">{copy.default}</span> : <button type="button" className="fb-textlink rt-biz__linkbtn" onClick={() => { setDefaultCard(c.id); reload(`${c.brand} ending ${c.last4} is now your default card.`); }}>{copy.makeDefault}<span className="rt-sr"> {c.brand} ending {c.last4}</span></button>}
                    <button type="button" className="rt-biz__remove" onClick={() => { removeCard(c.id); reload(copy.removed.replace("{last4}", c.last4)); }}>{copy.remove}<span className="rt-sr"> {c.brand} ending {c.last4}</span></button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rt-acc__none"><p>{copy.none.text}</p></div>
        )}
      </section>

      <Sheet open={adding} onClose={() => setAdding(false)} title={copy.form.title} closeLabel="Close" fallbackFocus={addRef}>
        <form className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate>
          {field("number", copy.form.number, { type: "text", inputMode: "numeric", autoComplete: "cc-number", spellCheck: false }, null, (v) => digits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "))}
          {field("expiry", copy.form.expiry, { type: "text", inputMode: "numeric", autoComplete: "cc-exp", placeholder: "MM / YY" }, copy.form.expiryHint, (v) => {
            const d = digits(v).slice(0, 4);
            return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
          })}
          {field("name", copy.form.name, { type: "text", autoComplete: "cc-name" })}
          <label className="rt-bk__check" htmlFor="rt-pm-default"><input id="rt-pm-default" type="checkbox" checked={form.makeDefault} onChange={(e) => setForm((f) => ({ ...f, makeDefault: e.target.checked }))} /><span>{copy.form.makeDefault}</span></label>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={saving} aria-busy={saving}>{saving ? "Saving" : copy.form.submit}</button>
        </form>
      </Sheet>
    </div>
  );
}
