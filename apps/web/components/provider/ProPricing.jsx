"use client";
import { useState } from "react";
import { provider } from "@/data/provider";

// The standard rates (the card fee off the price first, then the marketplace fee on what is left, as the admin's money maths).
// A provider can have its own agreed rate and admins can change the standard ones, which the public page can't read, so the
// estimator says these are the standard rates.
const CARD_FEE = 0.03;
const MARKETPLACE_FEE = 0.2;
const pct = (r) => `${Math.round(r * 100)}%`;

/* Pricing: two tiers + payout estimator (unchanged layout) */
export default function ProPricing() {
  const p = provider.pricing; const [typed, setTyped] = useState("199");
  // a price is £0 or more (an empty box counts as £0); a negative one is refused with a message, not worked out
  const n = typed.trim() === "" ? 0 : Number(typed);
  const invalid = !Number.isFinite(n) || n < 0;
  const price = invalid ? 0 : n;
  const fee = price * CARD_FEE; const commission = (price - fee) * MARKETPLACE_FEE; const payout = price - fee - commission;
  const gbp = (x) => `£${x.toFixed(2)}`;
  return (
    <section className="layout-pt-lg layout-pb-lg bg-light-4">
      <div className="container">
        <div className="row justify-center text-center">
          <div className="col-xl-7 col-lg-9">
            <div className="rt-section-head">
              <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{p.eyebrow}</div>
              <h2 className="sectionTitle__title mt-20" style={{ maxWidth: "30ch" }}>{p.title}</h2>
              <p className="sectionTitle__text" style={{ maxWidth: 640 }}>{p.text}</p>
            </div>
          </div>
        </div>
        <div className="pr-pricing mt-40">
          {p.tiers.map((t, i) => (
            <div key={t.label} className={`pr-tier${i ? " -mkt" : ""}`}>
              <span className="bz-card__label">{t.label}</span>
              <b className="pr-tier__value">{t.value}</b>
              <span className="pr-tier__sub">{t.sub}</span>
              <p>{t.text}</p>
            </div>
          ))}
          <div className="pr-calc">
            <span className="bz-card__label">{p.calc.title}</span>
            <div className="rt-field mt-10">
              <label htmlFor="pr-calc-price">Course price (£)</label>
              {invalid && <p className="rt-q__err" id="pr-calc-price-e"><span className="rt-sr">Error: </span>Enter a price of £0 or more.</p>}
              <input id="pr-calc-price" type="number" min="0" step="1" inputMode="decimal" value={typed} onChange={(e) => setTyped(e.target.value)} aria-invalid={invalid || undefined} aria-describedby={invalid ? "pr-calc-price-e" : undefined} />
            </div>
            <div className="pr-calc__rows" aria-live="polite">
              <div><span>Card transaction fee (standard {pct(CARD_FEE)})</span><b>- {gbp(fee)}</b></div>
              <div><span>Marketplace fee (standard {pct(MARKETPLACE_FEE)})</span><b>- {gbp(commission)}</b></div>
              <div className="-total"><span>You receive</span><b>{gbp(payout)}</b></div>
            </div>
            <small>{p.calc.note}</small>
          </div>
        </div>
      </div>
    </section>
  );
}
