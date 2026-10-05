"use client";
import { useState } from "react";
import { provider } from "@/data/provider";

/* Pricing: two tiers + payout estimator (unchanged layout) */
export default function ProPricing() {
  const p = provider.pricing; const [price, setPrice] = useState(199);
  const fee = price * 0.03; const commission = (price - fee) * 0.3; const payout = price - fee - commission;
  const gbp = (n) => `£${n.toFixed(2)}`;
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
            <label className="rt-field mt-10"><span>Course price (£)</span><input type="number" min="0" step="1" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} /></label>
            <div className="pr-calc__rows">
              <div><span>Card transaction fee (3%)</span><b>- {gbp(fee)}</b></div>
              <div><span>Marketplace fee (30%)</span><b>- {gbp(commission)}</b></div>
              <div className="-total"><span>You receive</span><b>{gbp(payout)}</b></div>
            </div>
            <small>{p.calc.note}</small>
          </div>
        </div>
      </div>
    </section>
  );
}
