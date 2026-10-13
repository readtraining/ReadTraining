"use client";

import React, { useState } from "react";
import Link from "next/link";
import { basket as copy } from "@/data/basket";
import { promoFor } from "@/lib/basket";
import { formatPrice } from "@/lib/format";
import { IconCheck } from "@/components/marketing/parts";

// The order summary: the sums, the promo code (hidden behind a link, so an empty box does not pull people away from paying),
// the total, Proceed and what stops it, the instalments line and what the customer can rely on. Sticky beside the lines from
// 992px. Proceed is a real link when the basket is ready; otherwise a disabled button with the reasons listed under it. The sums
// are for the ticked courses only; `count` { chosen, total } says how many of the basket's courses this booking includes.
export function BasketSummary({ totals, issues, promo, onPromo, count }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const ready = issues.length === 0;

  const apply = (e) => {
    e.preventDefault();
    const found = promoFor(code);
    if (!found) return setError(copy.promo.invalid);
    setError("");
    setCode("");
    setOpen(false);
    onPromo(found);
  };

  return (
    <aside className="rt-bk__summary" aria-labelledby="rt-bk-sum-h">
      <h2 id="rt-bk-sum-h">Order summary</h2>
      {count && count.chosen < count.total && <p className="rt-bk__sumnote">Booking {count.chosen} of {count.total} courses</p>}
      <dl className="rt-bk__sums">
        <div><dt>Subtotal ({totals.delegates} {totals.delegates === 1 ? "delegate" : "delegates"})</dt><dd>{formatPrice(totals.subtotal)}</dd></div>
        {promo && (
          <div className="-promo"><dt>{promo.code} · {promo.label}<button type="button" onClick={() => onPromo(null)}>Remove<span className="rt-sr"> promo code</span></button></dt><dd>−{formatPrice(totals.discount)}</dd></div>
        )}
        {totals.saving > 0 && <div className="-save"><dt>You are saving</dt><dd>{formatPrice(totals.saving)}</dd></div>}
      </dl>

      {!promo && (
        <div className="rt-bk__promo">
          {!open ? (
            <button type="button" className="rt-bk__promoopen" aria-expanded="false" onClick={() => setOpen(true)}>{copy.promo.prompt}</button>
          ) : (
            <form onSubmit={apply} noValidate>
              <label htmlFor="rt-bk-code" className="rt-sr">Promo code</label>
              <div className="rt-bk__promorow">
                <input id="rt-bk-code" type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Promo code" autoComplete="off" aria-invalid={error ? "true" : undefined} aria-describedby={error ? "rt-bk-code-err" : undefined} autoFocus />
                <button type="submit" className="button -md -outline-dark-1 text-dark-1">{copy.promo.apply}</button>
              </div>
              {error && <p id="rt-bk-code-err" className="rt-bk__promoerr" role="alert">{error}</p>}
            </form>
          )}
        </div>
      )}

      <div className="rt-bk__total">
        <span>Total</span>
        <strong>{formatPrice(totals.total)}</strong>
      </div>
      <p className="rt-bk__allinc">All inc. No booking fee.</p>

      {ready ? (
        <Link href={copy.checkout.href} className="button -md -purple-1 text-white rt-bk__go">{copy.checkout.label}<i className="icon-arrow-right text-13 ml-10" aria-hidden="true"></i></Link>
      ) : (
        <>
          <button type="button" className="button -md -purple-1 text-white rt-bk__go" disabled aria-disabled="true">{copy.checkout.label}</button>
          <ul className="rt-bk__issues" role="status">
            {issues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </>
      )}
      <p className="rt-bk__klarna">{copy.instalments}</p>

      <ul className="rt-bk__trust">
        {copy.trust.map((t) => <li key={t}><span className="fb-ticks__icon" aria-hidden="true"><IconCheck /></span>{t}</li>)}
      </ul>
    </aside>
  );
}

// From 992px the summary is beside the lines; below that it is under them, so this bar keeps the total and Proceed in reach.
export function BasketBar({ totals, issues }) {
  const ready = issues.length === 0;
  return (
    <div className="rt-bk__bar">
      <div><span>Total</span><strong>{formatPrice(totals.total)}</strong></div>
      {ready ? (
        <Link href={copy.checkout.href} className="button -md -purple-1 text-white">{copy.checkout.label}</Link>
      ) : (
        <a href="#rt-bk-lines" className="button -md -purple-1 text-white">{issues.length === 1 ? "1 thing to finish" : `${issues.length} things to finish`}</a>
      )}
    </div>
  );
}
