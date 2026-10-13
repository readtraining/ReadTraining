import React from "react";
import { checkout as copy } from "@/data/checkout";
import { lineParts, modeLabel } from "@/lib/basket";
import { formatDateRange, formatPrice } from "@/lib/format";
import { IconCheck } from "@/components/marketing/parts";
import { SaverLine } from "@/components/basket/BasketSummary";

// Phones and tablets: the same courses and total in a fold at the top of the form (as the large checkouts do), so what is being
// paid for is in view before the details are filled in; the full summary card follows the form.
export function CheckoutMiniSummary({ lines, totals }) {
  return (
    <details className="rt-ck__mini">
      <summary>
        <span>Show order summary</span>
        <strong>{formatPrice(totals.total)}</strong>
      </summary>
      <ul className="rt-ck__items">
        {lines.map((item) => {
          const { unit, total, quantity } = lineParts(item);
          return (
            <li key={`${item.id}:${item.sessionId}`}>
              <div className="rt-ck__itemtop"><b>{item.title}</b><span>{formatPrice(total)}</span></div>
              <p>{quantity} {quantity === 1 ? "delegate" : "delegates"} × {formatPrice(unit)}</p>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

// The order summary beside the checkout form: every course being booked (when and where, delegates × price), the sums from the
// basket (lib/basket.js), the total, the Pay button (it submits the form) and what the customer can rely on. The basket's summary
// card (.rt-bk__summary), sticky from 992px.
export default function CheckoutSummary({ lines, totals, promo, walletUse = 0, payable, formId, paying }) {
  const due = payable ?? totals.total;
  return (
    <aside className="rt-bk__summary rt-ck__summary" aria-labelledby="rt-ck-sum-h">
      <h2 id="rt-ck-sum-h">Your booking</h2>
      <ul className="rt-ck__items">
        {lines.map((item) => {
          const { unit, total, quantity } = lineParts(item);
          return (
            <li key={`${item.id}:${item.sessionId}`}>
              <div className="rt-ck__itemtop">
                <b>{item.title}</b>
                <span>{formatPrice(total)}</span>
              </div>
              <p>{item.mode === "ondemand" ? item.time : formatDateRange(item.date, item.endDate)} · {item.city || modeLabel(item.mode)}</p>
              <p>{quantity} {quantity === 1 ? "delegate" : "delegates"} × {formatPrice(unit)}</p>
            </li>
          );
        })}
      </ul>
      <dl className="rt-bk__sums">
        <div><dt>Subtotal</dt><dd>{formatPrice(totals.subtotal)}</dd></div>
        {totals.skillSaver && <SaverLine saver={totals.skillSaver} />}
        {promo && <div className="-promo"><dt>{promo.code} · {promo.label}</dt><dd>−{formatPrice(totals.discount)}</dd></div>}
        {totals.saving > 0 && <div className="-save"><dt>You are saving</dt><dd>{formatPrice(totals.saving)}</dd></div>}
        {walletUse > 0 && <div className="-promo"><dt>Wallet credit</dt><dd>−{formatPrice(walletUse)}</dd></div>}
      </dl>
      <div className="rt-bk__total">
        <span>{walletUse > 0 ? "To pay" : "Total"}</span>
        <strong>{formatPrice(due)}</strong>
      </div>
      <p className="rt-bk__allinc">All inc. No booking fee.</p>
      <button type="submit" form={formId} className="button -md -purple-1 text-white rt-bk__go rt-ck__paybtn" disabled={paying} aria-busy={paying}>
        {paying ? copy.paying : due === 0 ? copy.complete : `${copy.pay} ${formatPrice(due)}`}
      </button>
      <ul className="rt-bk__trust">
        {copy.trust.map((t) => <li key={t}><span className="fb-ticks__icon" aria-hidden="true"><IconCheck /></span>{t}</li>)}
      </ul>
    </aside>
  );
}
