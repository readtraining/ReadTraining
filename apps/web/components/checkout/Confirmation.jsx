"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { basket as basketCopy } from "@/data/basket";
import { checkout as copy } from "@/data/checkout";
import { ORDER_KEY, PAY_FAILED_KEY } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import BasketSteps from "@/components/basket/BasketSteps";
import { SaverLine } from "@/components/basket/BasketSummary";

const readJson = (key) => {
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};

// The payment result page. "Booking confirmed" shows only for a paid order: every step ticked, the reference and where the
// confirmation went, each course with its delegates, what happens next, and where to go now. When the payment did not go through
// it says so instead ("Payment not completed": nothing charged, the basket kept, try again). That is the payment provider's
// return with `?redirect_status=failed` (Stripe's name for it), or the last attempt in this tab having failed after any paid order.
// With neither (a new tab, a shared link) it points to the confirmation email. The heading takes focus, so the result is announced.
export default function Confirmation() {
  const c = copy.confirmation;
  const [result, setResult] = useState(undefined); // undefined while reading, then { kind: "paid", order } | { kind: "failed" } | { kind: "none" }
  const headRef = useRef(null);

  useEffect(() => {
    const returnedFailed = new URLSearchParams(window.location.search).get("redirect_status") === "failed";
    const order = readJson(ORDER_KEY);
    const failed = readJson(PAY_FAILED_KEY);
    const paid = order?.paid ? order : null;
    if (returnedFailed || (failed && (!paid || (failed.at || 0) > (paid.at || 0)))) setResult({ kind: "failed" });
    else if (paid) setResult({ kind: "paid", order: paid });
    else setResult({ kind: "none" });
  }, []);
  useEffect(() => {
    if (result && result.kind !== "none") headRef.current?.focus({ preventScroll: true });
  }, [result]);

  if (result === undefined) return null;
  if (result.kind === "failed") {
    return (
      <>
        <title>{`${c.failed.title} | ReadTraining`}</title>
        <section className="rt-bk__head">
          <div className="container">
            <BasketSteps steps={basketCopy.steps} current={basketCopy.steps.length - 1} />
          </div>
        </section>
        <section className="rt-bk layout-pt-md layout-pb-lg">
          <div className="container">
            <div className="rt-ck__done">
              <div className="rt-ck__card rt-ck__donehead" role="alert">
                <span className="rt-ck__tick -failed" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v6" /><path d="M12 17h.01" /></svg>
                </span>
                <h1 className="rt-bk__h1" tabIndex={-1} ref={headRef}>{c.failed.title}</h1>
                <p className="rt-ck__lead rt-ck__failtext">{c.failed.text}</p>
                <div className="rt-ck__actions -center">
                  {c.failed.actions.map((a) => (
                    <Link key={a.href} href={a.href} className={a.primary ? "button -md -purple-1 text-white" : "button -md -outline-purple-1 text-purple-1"}>{a.label}</Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }
  const order = result.order;
  if (!order) {
    return (
      <section className="rt-bk layout-pt-lg layout-pb-lg">
        <title>{`${c.none.title} | ReadTraining`}</title>
        <div className="container">
          <div className="rt-bk__empty">
            <span className="rt-bk__emptyicon" aria-hidden="true"><i className="icon-calendar text-24"></i></span>
            <h1 className="rt-ck__nonetitle">{c.none.title}</h1>
            <p>{c.none.text}</p>
            <Link href={c.none.cta.href} className="button -md -purple-1 text-white">{c.none.cta.label}</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <title>{`${c.title} | ReadTraining`}</title>
      <section className="rt-bk__head">
        <div className="container">
          <BasketSteps steps={basketCopy.steps} current={basketCopy.steps.length} />
        </div>
      </section>
      <section className="rt-bk layout-pt-md layout-pb-lg">
        <div className="container">
          <div className="rt-ck__done">
            <div className="rt-ck__card rt-ck__donehead">
              <span className="rt-ck__tick" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
              </span>
              <h1 className="rt-bk__h1" tabIndex={-1} ref={headRef}>{c.title}</h1>
              <p className="rt-ck__ref">{c.reference}: <strong>{order.reference}</strong></p>
              <p className="rt-ck__lead">{c.sent.replace("{email}", order.email)}</p>
            </div>

            <section className="rt-ck__card" aria-labelledby="rt-ck-booked-h">
              <h2 className="rt-ck__h2" id="rt-ck-booked-h">Your courses</h2>
              <ul className="rt-ck__booked">
                {order.lines.map((l) => (
                  <li key={`${l.title}${l.when}`}>
                    <div className="rt-ck__itemtop"><b>{l.title}</b><span>{formatPrice(l.total)}</span></div>
                    <p>{l.when} · {l.where}{l.provider ? ` · Provided by ${l.provider}` : ""}</p>
                    <p>Attending: {l.delegates.join(", ")}</p>
                  </li>
                ))}
              </ul>
              {order.skillSaver && <dl className="rt-bk__sums"><SaverLine saver={order.skillSaver} /></dl>}
              <div className="rt-bk__total">
                <span>{order.method === "wallet" ? "Paid from your wallet" : order.method === "klarna" ? "Paid with Klarna" : "Paid by card"}{order.walletUsed > 0 && order.method !== "wallet" ? ` and ${formatPrice(order.walletUsed)} from your wallet` : ""}</span>
                <strong>{formatPrice(order.total)}</strong>
              </div>
            </section>

            <section className="rt-ck__card" aria-labelledby="rt-ck-next-h">
              <h2 className="rt-ck__h2" id="rt-ck-next-h">{c.next.title}</h2>
              <ol className="rt-ck__next">
                {c.next.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <div className="rt-ck__actions">
                {c.actions.map((a) => (
                  <Link key={a.href} href={a.href.replace("{ref}", order.reference)} className={a.primary ? "button -md -purple-1 text-white" : "button -md -outline-purple-1 text-purple-1"}>{a.label}</Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
