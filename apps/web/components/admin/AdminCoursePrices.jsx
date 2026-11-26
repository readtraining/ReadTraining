"use client";

import React, { useState } from "react";
import { formatDateRange, formatPrice } from "@/lib/format";
import { methodName } from "@/lib/taxonomy";
import { AdminTag } from "./AdminStatus";

const money = (pence) => formatPrice(pence / 100);
const FIRST_DATES = 10; // a long list of dates shows this many, then "Show all N dates"
const short = (iso) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

// One price plan's packages side by side, as learners compare them: each one's price, its "Save £" (shown to learners as a was-price),
// tagline, Most popular, the provider's other courses it includes (`names`: their names by id; and first aid set on its own on a
// plan from before) and features included (✓) or not (✗).
function Packages({ plan, names = {} }) {
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
            {t.savePence ? <small>Shown as “Save {money(t.savePence)}”, was {money(t.pricePence + t.savePence)}</small> : null}
          </p>
          {t.tagline && <p className="rt-acc__note">{t.tagline}</p>}
          {(() => {
            const inc = (t.courses ?? []).map((id) => names[id]).filter(Boolean);
            const included = [...inc.map((c) => c.name), t.firstAid && !inc.some((c) => c.firstAid) && "Emergency First Aid at Work"].filter(Boolean);
            return included.length > 0 && <p className="rt-acc__note">Includes: {included.join(", ")}</p>;
          })()}
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

// One way of learning's dates (classroom, or live online): each with where, how it is priced (Flat, or Tiered on a plan) and the
// price; a long list shows its first dates with "Show all N dates"
function DatesTable({ method, dates, planOf }) {
  const [all, setAll] = useState(false);
  const shown = all ? dates : dates.slice(0, FIRST_DATES);
  const label = methodName(method);
  return (
    <div className="rt-adm-cp__way">
      <h3 className="rt-acc__h3">{label} dates</h3>
      {dates.length ? (
        <>
          <div className="rt-adm-cp__tablewrap">
            <table className="rt-biz__table rt-adm-table rt-adm-cp__table">
              <thead>
                <tr>
                  <th scope="col">Dates</th>
                  <th scope="col">Where</th>
                  <th scope="col">Pricing</th>
                  <th scope="col" className="rt-adm-num">Price</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((k) => {
                  const plan = k.planId ? planOf(k.planId) : null;
                  return (
                    <tr key={k.id}>
                      <td data-label="Dates">
                        {formatDateRange(k.startsOn, k.endsOn)}
                        {k.optionClosed ? <> <AdminTag>Bookings stopped</AdminTag></> : !k.bookable && <> <AdminTag>Bookings off</AdminTag></>}
                      </td>
                      <td data-label="Where">{k.place || label}</td>
                      <td data-label="Pricing">{plan ? <>Tiered: {plan.name}</> : "Flat"}</td>
                      <td data-label="Price" className="rt-adm-num-cell">
                        {plan ? <>From {money(k.pricePence)}</> : money(k.pricePence)}
                        {!plan && k.wasPricePence ? <small className="rt-adm-cp__was">was {money(k.wasPricePence)}</small> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {dates.length > FIRST_DATES && (
            <button type="button" className="rt-cd__link rt-adm-cp__more" aria-expanded={all} onClick={() => setAll((x) => !x)}>
              {all ? "Show fewer dates" : `Show all ${dates.length} dates`}
            </button>
          )}
        </>
      ) : (
        <p className="rt-acc__notice -warn">No upcoming {label.toLowerCase()} dates yet, so learners would have nothing to book this way.</p>
      )}
    </div>
  );
}

// What learners will pay for a provider's course (API admin.courses.get `pricing`), for our team to check before approving it, one
// part for each way it is taught: the self-paced price (Flat, or a price plan), then each dated way's upcoming dates (classroom,
// live online), each date with how it is priced and its price, then every plan used, in full, with what uses it. A course taught
// several ways shows every part. Plans need no approval of their own, so this is where our team sees them. Nothing for a shared
// page (providers set the prices on their own courses). A plan is the provider's, so it also says what else uses it.
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export default function AdminCoursePrices({ pricing }) {
  if (!pricing) return null;
  const planOf = (id) => pricing.plans.find((p) => p.id === id);
  const sp = pricing.selfPaced;
  const dated = pricing.dated ?? [];
  // what each plan is used on: the self-paced price and the dates, by way of learning
  const usedOn = (plan) => [
    ...(sp?.planId === plan.id ? [methodName("self-paced")] : []),
    ...dated.map((m) => [m, pricing.dates.filter((k) => k.method === m && k.planId === plan.id)]).filter(([, ks]) => ks.length).map(([m, ks]) => `${methodName(m)} ${ks.slice(0, 5).map((k) => short(k.startsOn)).join(", ")}${ks.length > 5 ? ` and ${ks.length - 5} more` : ""}`),
  ];
  return (
    <section className="rt-acc__card" aria-labelledby="rt-adm-cp-h">
      <h2 className="rt-acc__h2" id="rt-adm-cp-h">Prices and packages</h2>
      <p className="rt-acc__note">What learners pay, including VAT.</p>

      {sp && (
        <div className="rt-adm-cp__way">
          <h3 className="rt-acc__h3">
            {methodName("self-paced")}
            {sp.closed && <> <AdminTag>Bookings stopped</AdminTag></>}
          </h3>
          <dl className="rt-adm-dl">
            <div><dt>Pricing</dt><dd>{sp.planId && planOf(sp.planId) ? <>Tiered: {planOf(sp.planId).name}</> : "Flat"}</dd></div>
            <div><dt>Price</dt><dd>{sp.pricePence == null ? <span className="rt-adm-muted">Not set</span> : sp.planId ? <>From {money(sp.pricePence)}</> : money(sp.pricePence)}</dd></div>
          </dl>
        </div>
      )}

      {dated.map((m) => <DatesTable key={m} method={m} dates={pricing.dates.filter((k) => k.method === m)} planOf={planOf} />)}

      {pricing.plans.map((p) => {
        const used = usedOn(p);
        return (
          <div key={p.id} className="rt-adm-plan">
            <div className="rt-adm-plan__top">
              <div>
                <h3 className="rt-acc__h3">
                  Price plan: {p.name}
                  {p.archived && <> <AdminTag>Archived</AdminTag></>}
                </h3>
                {used.length > 0 && <p className="rt-acc__note">Used on: {used.join("; ")}</p>}
                <p className="rt-acc__note">The provider&apos;s plan, used on {[p.used.dates ? count(p.used.dates, "upcoming date", "upcoming dates") : "", count(p.used.courses, "course", "courses")].filter(Boolean).join(" across ")} in all. A change reaches every one.</p>
              </div>
            </div>
            <Packages plan={p} names={pricing.courseNames} />
          </div>
        );
      })}
    </section>
  );
}
