import React from "react";
import Link from "next/link";
import { Check } from "./Icon";
import { formatPrice } from "@/lib/format";
import { AUTH_ROUTES, QUOTE_HREF } from "@/lib/routes";
import { topBar } from "@/data/home";

// The course guide's sections (data/courseGuides.js), built only from the course page's own parts: .rt-cd__sec sections with an
// h2 and an .rt-cd__lead line, the .rt-cd__learn card with .rt-cd__checks, the .rt-cd__table table, the learning options' cards
// (.rt-lc) for packages, the trust boxes' tiles (.rt-benefit-card) and the staff training callout (.rt-cd__staff). Every section
// is left out when its guide has nothing for it. The course's own price is its lowest live price (course.price). The packages
// are chosen on the page, so they are a client component of their own (PackagePicker).

const quote = (course) => `${QUOTE_HREF}?course=${course.slug}`;
const tel = (phone) => `tel:${phone.replace(/\s+/g, "")}`;

const Ticks = ({ items, one }) => (
  <ul className={`rt-cd__checks${one || items.length <= 5 ? " is-one" : ""}`}>
    {items.map((t) => <li key={t}><Check /> <span>{t}</span></li>)}
  </ul>
);

const Cell = ({ v }) => (typeof v === "boolean" ? (v ? <span className="rt-cg__yes"><Check /> Yes</span> : <span className="rt-cg__no">No</span>) : v);

// A comparison table (door supervisor or security guard licence).
export function CompareTable({ compare }) {
  if (!compare) return null;
  return (
    <section className="rt-cd__sec" aria-labelledby="rt-cg-compare-h">
      <h2 id="rt-cg-compare-h">{compare.title}</h2>
      {compare.intro && <p className="rt-cd__lead">{compare.intro}</p>}
      <div className="rt-cd__table-wrap">
        <table className="rt-cd__table rt-cg__compare">
          <thead>
            <tr>{compare.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
          </thead>
          <tbody>
            {compare.rows.map(([label, ...vals]) => (
              <tr key={label}>
                <td>{label}</td>
                {vals.map((v, i) => <td key={i}><Cell v={v} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// A card in the "What you will learn" style: a heading and a ticked list, with an optional note under it.
export function TickCard({ id, title, items, note }) {
  if (!items?.length) return null;
  return (
    <section className="rt-cd__sec" aria-labelledby={id}>
      <div className="rt-cd__learn">
        <h2 id={id}>{title}</h2>
        <Ticks items={items} />
        {note && <p className="rt-cd__lead rt-cg__note">{note}</p>}
      </div>
    </section>
  );
}

// Training for a team: the trust boxes' tiles, then the staff training callout with the volume savings and the quote.
export function BusinessSection({ business, course }) {
  if (!business) return null;
  return (
    <section className="rt-cd__sec" id="business" aria-labelledby="rt-cg-biz-h">
      <h2 id="rt-cg-biz-h">{business.title}</h2>
      {business.intro && <p className="rt-cd__lead">{business.intro}</p>}
      <ul className="rt-benefit-grid rt-cd__benefits">
        {business.benefits.map((i) => (
          <li key={i.title} className="rt-benefit-card">
            <span className="rt-benefit__icon" aria-hidden="true"><i className={`${i.icon} text-16`}></i></span>
            <div className="rt-benefit__title mt-15">{i.title}</div>
            <div className="rt-benefit__text">{i.text}</div>
          </li>
        ))}
      </ul>
      <div className="rt-cd__staff">
        <strong>{business.quote.title}</strong>
        {business.tiers?.length > 0 && <p>Volume savings: {business.tiers.map((t) => `${t.learners} ${t.saving}`).join(", ").replace(/, ([^,]*)$/, " and $1")}.</p>}
        {business.account && <p>{business.account}</p>}
        <p>
          {business.quote.text} Prefer to talk? Call <a href={tel(topBar.phone)} className="rt-cg__inline">{topBar.phone}</a> or email{" "}
          <a href={`mailto:${topBar.email}`} className="rt-cg__inline">{topBar.email}</a>.
        </p>
        <Link href={quote(course)} className="rt-cd__link">{business.quote.cta}</Link>
        {business.signIn && <p>{business.signIn} <Link href={`${AUTH_ROUTES.login}?next=/business`} className="rt-cg__inline">Sign in</Link></p>}
      </div>
    </section>
  );
}

// Getting the licence: the steps (a numbered list in the card), what it costs (the course table) and the careers it leads to.
export function LicenceSection({ licence, costs, careers, course }) {
  const fee = costs?.licenceFee?.amount ?? 0;
  const aid = costs?.firstAid?.from ?? 0;
  const prices = course.sessions.map((s) => s.price);
  const low = prices.length ? Math.min(...prices) : null;
  const high = prices.length ? Math.max(...prices) : null;
  const pounds = (n) => formatPrice(Math.round(n / 5) * 5).replace(/\.00$/, "");
  return (
    <>
      {licence && (
        <section className="rt-cd__sec" id="licence" aria-labelledby="rt-cg-lic-h">
          <div className="rt-cd__learn">
            <h2 id="rt-cg-lic-h">{licence.title}</h2>
            <ol className="rt-cg__steps">
              {licence.steps.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}</strong>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
      {costs && (
        <section className="rt-cd__sec" aria-labelledby="rt-cg-cost-h">
          <h2 id="rt-cg-cost-h">{costs.title}</h2>
          {costs.intro && <p className="rt-cd__lead">{costs.intro}</p>}
          <div className="rt-cd__table-wrap">
            <table className="rt-cd__table rt-cg__costs">
              <thead>
                <tr><th scope="col">Cost</th><th scope="col">Price</th></tr>
              </thead>
              <tbody>
                {low != null && <tr><td>{course.title} course</td><td>from {formatPrice(low)}</td></tr>}
                <tr><td>{costs.firstAid.label}</td><td>from {formatPrice(aid)}</td></tr>
                <tr><td>{costs.licenceFee.label}</td><td>{formatPrice(fee)}</td></tr>
                {low != null && <tr className="is-total"><td>Typical total</td><td>about {pounds(low + fee)} to {pounds(high + aid + fee)}</td></tr>}
              </tbody>
            </table>
          </div>
          {costs.note && <p className="rt-cd__lead rt-cg__note">{costs.note}</p>}
        </section>
      )}
      {careers && (
        <section className="rt-cd__sec" aria-labelledby="rt-cg-career-h">
          <div className="rt-cd__learn">
            <h2 id="rt-cg-career-h">{careers.title}</h2>
            <p className="rt-cd__lead">{careers.text}</p>
            {careers.areas?.length > 0 && <Ticks items={careers.areas} />}
            {careers.roles && <p className="rt-cd__lead">{careers.roles}</p>}
            {careers.href && <Link href={careers.href} className="rt-cd__link">{careers.cta}</Link>}
          </div>
        </section>
      )}
    </>
  );
}
