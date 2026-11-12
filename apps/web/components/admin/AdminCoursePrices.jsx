"use client";

import React from "react";
import { formatDateRange, formatPrice } from "@/lib/format";
import { methodName } from "@/lib/taxonomy";
import { AdminTag } from "./AdminStatus";

const money = (pence) => formatPrice(pence / 100);

// One price plan's packages side by side, as learners compare them: each one's price, its "Save £" (shown to learners as a was-price),
// tagline, Most popular, and features included (✓) or not (✗).
function Packages({ plan }) {
  const tiers = Array.isArray(plan.tiers) ? plan.tiers : [];
  return (
    <ul className={`rt-adm-plan__tiers -n${tiers.length}`}>
      {tiers.map((t) => (
        <li key={t.name} className={`rt-adm-plan__tier${t.popular ? " -popular" : ""}`}>
          <div className="rt-adm-plan__head">
            <strong>{t.name}</strong>
            {t.popular && <AdminTag>Most popular</AdminTag>}
          </div>
          <p className="rt-adm-plan__price">
            {money(t.pricePence)}
            {t.savePence ? <small> · shown as “Save {money(t.savePence)}”, was {money(t.pricePence + t.savePence)}</small> : null}
          </p>
          {t.tagline && <p className="rt-acc__note">{t.tagline}</p>}
          {t.features?.length ? (
            <ul className="rt-adm-plan__features">
              {t.features.map((f, i) => (
                <li key={i} className={f.included ? "-yes" : "-no"}>
                  <i className={`icon-${f.included ? "check" : "close"}`} aria-hidden="true"></i>
                  <span>
                    <span className="rt-sr">{f.included ? "Included: " : "Not included: "}</span>
                    {f.title}
                    {f.description && <small>{f.description}</small>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rt-acc__note">No features listed.</p>
          )}
        </li>
      ))}
    </ul>
  );
}

// What learners will pay for a provider's course (API admin.courses.get `pricing`), for our team to check before approving it: a
// self-paced course's price or price plan; a classroom or live online course's upcoming dates, each with its own price (and any
// was-price) or the plan it uses ("From" its cheapest package); then every plan used, in full. Plans need no approval of their
// own, so this is where our team sees them. Nothing for a shared page (providers set the prices on their own courses).
export default function AdminCoursePrices({ pricing }) {
  if (!pricing) return null;
  const planOf = (id) => pricing.plans.find((p) => p.id === id);
  const sp = pricing.selfPaced;
  return (
    <section className="rt-acc__card" aria-labelledby="rt-adm-cp-h">
      <h2 className="rt-acc__h2" id="rt-adm-cp-h">Prices and packages</h2>
      <p className="rt-acc__note">What learners will pay, including VAT. Check the prices, any “was” price or saving, and what each package includes before approving.</p>

      {sp ? (
        <dl className="rt-adm-dl">
          <div>
            <dt>Price</dt>
            <dd>
              {sp.planId && planOf(sp.planId) ? <>Price plan <strong>{planOf(sp.planId).name}</strong>: from {money(sp.pricePence)}</> : sp.pricePence != null ? money(sp.pricePence) : <span className="rt-adm-muted">Not set</span>}
            </dd>
          </div>
        </dl>
      ) : pricing.dates.length ? (
        <div className="rt-adm-cp__tablewrap">
          <table className="rt-biz__table rt-adm-table rt-adm-cp__table">
            <thead>
              <tr>
                <th scope="col">Dates</th>
                <th scope="col">Where</th>
                <th scope="col" className="rt-adm-num-cell">Price</th>
              </tr>
            </thead>
            <tbody>
              {pricing.dates.map((k) => {
                const plan = k.planId ? planOf(k.planId) : null;
                return (
                  <tr key={k.id}>
                    <td data-label="Dates">
                      {formatDateRange(k.startsOn, k.endsOn)}
                      {!k.bookable && <> <AdminTag>Bookings off</AdminTag></>}
                    </td>
                    <td data-label="Where">{k.place || methodName(k.method)}</td>
                    <td data-label="Price" className="rt-adm-num-cell">
                      {plan ? (
                        <>From {money(k.pricePence)}<small className="rt-adm-muted"> · {plan.name}</small></>
                      ) : (
                        <>{money(k.pricePence)}{k.wasPricePence ? <small className="rt-adm-muted"> · was {money(k.wasPricePence)}</small> : null}</>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rt-acc__notice -warn">No upcoming dates yet, so learners would have nothing to book.</p>
      )}

      {pricing.plans.map((p) => (
        <div key={p.id} className="rt-adm-plan">
          <h3 className="rt-acc__h3">
            Price plan: {p.name}
            {p.archived && <> <AdminTag>Archived</AdminTag></>}
          </h3>
          <Packages plan={p} />
        </div>
      ))}
    </section>
  );
}
