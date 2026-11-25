import React from "react";
import Link from "next/link";
import { Check } from "./Icon";
import { formatPrice } from "@/lib/format";
import { QUOTE_HREF } from "@/lib/routes";
import { TEAM } from "@/lib/teamTraining";
import { inlineParts, textBlocks } from "@/lib/courseGuide";
import { topBar } from "@/data/home";

// The course guide's sections (lib/courseGuide.js: the shared page's Course guide), built only from the course page's own parts:
// .rt-cd__sec sections with an h2 and an .rt-cd__lead line, the .rt-cd__learn card with .rt-cd__checks, the .rt-cd__table table,
// the trust boxes' tiles (.rt-benefit-card) and the staff training callout
// (.rt-cd__staff). Every section is left out when its guide has nothing for it. Prices are never typed in a guide: they are the
// course's live prices (course.price, its lowest; course.sessions).

const quote = (course) => `${QUOTE_HREF}?course=${course.slug}`;
const tel = (phone) => `tel:${phone.replace(/\s+/g, "")}`;
// the team training tiles' icons, in turn
const TILE_ICONS = ["icon-location", "icon-friend", "icon-basket", "icon-badge", "icon-calendar", "icon-person-3"];

const Ticks = ({ items, one }) => (
  <ul className={`rt-cd__checks${one || items.length <= 5 ? " is-one" : ""}`}>
    {items.map((t) => <li key={t}><Check /> <span>{t}</span></li>)}
  </ul>
);

/** A line of text with its links ([words](/path) or [words](https://…), lib/courseGuide.js inlineParts); `links` false shows only
 *  the words (text a provider wrote never links anywhere). */
export function Inline({ text, links = true }) {
  return inlineParts(text).map((x, i) =>
    !x.href || !links ? <React.Fragment key={i}>{x.text}</React.Fragment>
    : x.href.startsWith("/") ? <Link key={i} href={x.href} className="rt-cg__inline">{x.text}</Link>
    : <a key={i} href={x.href} className="rt-cg__inline" target="_blank" rel="noopener noreferrer">{x.text}</a>
  );
}

/** Text typed into a box: paragraphs, and lists where every line of a block starts "- ". */
export function GuideText({ text, links = true }) {
  const blocks = textBlocks(text);
  if (!blocks.length) return null;
  return (
    <div className="rt-cd__prose">
      {blocks.map((b, i) => (b.list ? <ul key={i} className="rt-cd__list">{b.list.map((l) => <li key={l}><Inline text={l} links={links} /></li>)}</ul> : <p key={i}><Inline text={b.text} links={links} /></p>))}
    </div>
  );
}

// a comparison cell: Yes and No are a tick and a cross
const Cell = ({ v }) => {
  const word = String(v).trim().toLowerCase();
  if (v === true || word === "yes") return <span className="rt-cg__yes"><Check /> Yes</span>;
  if (v === false || word === "no") return <span className="rt-cg__no"><i className="icon-close rt-cg__x" aria-hidden="true" /> No</span>;
  return v;
};

// A comparison table (door supervisor or security guard licence; the SIA fees for one licence or two), with a note under it.
export function CompareTable({ compare }) {
  if (!compare?.rows?.length) return null;
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
            {compare.rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                {r.cells.map((v, i) => <td key={i}><Cell v={v} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {compare.note && <p className="rt-cd__lead rt-cg__note"><Inline text={compare.note} /></p>}
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


// Training for a team, in the site's own words (Site content › Team training, switched on by the page's guide): the trust boxes'
// tiles, then the staff training callout with the quote button (TEAM.cta, the one team button the whole site has).
export function BusinessSection({ business, course }) {
  if (!business?.title) return null;
  return (
    <section className="rt-cd__sec" id="business" aria-labelledby="rt-cg-biz-h">
      <h2 id="rt-cg-biz-h">{business.title}</h2>
      {business.intro && <p className="rt-cd__lead">{business.intro}</p>}
      {business.benefits?.length > 0 && (
        <ul className="rt-benefit-grid rt-cd__benefits">
          {business.benefits.map((i, n) => (
            <li key={i.title} className="rt-benefit-card">
              <span className="rt-benefit__icon" aria-hidden="true"><i className={`${TILE_ICONS[n % TILE_ICONS.length]} text-16`}></i></span>
              <div className="rt-benefit__title mt-15">{i.title}</div>
              <div className="rt-benefit__text">{i.text}</div>
            </li>
          ))}
        </ul>
      )}
      <div className="rt-cd__staff">
        <strong>{business.quote.title}</strong>
        <p>
          {business.quote.text ? `${business.quote.text} ` : ""}Prefer to talk? Call <a href={tel(topBar.phone)} className="rt-cg__inline">{topBar.phone}</a> or email{" "}
          <a href={`mailto:${topBar.email}`} className="rt-cg__inline">{topBar.email}</a>.
        </p>
        <Link href={quote(course)} className="rt-cd__link">{TEAM.cta}</Link>
      </div>
    </section>
  );
}

// The steps (a numbered list in the card, with a tip under it), what it costs (the course table, worked out from the live prices)
// and the careers it leads to.
export function LicenceSection({ licence, costs, careers, course }) {
  const fee = costs?.licenceFee?.amount ?? 0;
  const aid = costs?.firstAid?.from ?? 0;
  const prices = course.sessions.map((s) => s.price);
  const low = prices.length ? Math.min(...prices) : null;
  const high = prices.length ? Math.max(...prices) : null;
  const pounds = (n) => formatPrice(Math.round(n / 5) * 5).replace(/\.00$/, "");
  // one figure when every date costs the same and there is nothing else to add
  const total = low == null ? null : pounds(low + fee) === pounds(high + aid + fee) ? `about ${pounds(low + fee)}` : `about ${pounds(low + fee)} to ${pounds(high + aid + fee)}`;
  return (
    <>
      {licence?.steps?.length > 0 && (
        <section className="rt-cd__sec" id="licence" aria-labelledby="rt-cg-lic-h">
          <div className="rt-cd__learn">
            <h2 id="rt-cg-lic-h">{licence.title}</h2>
            <ol className="rt-cg__steps">
              {licence.steps.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}</strong>
                  <span><Inline text={s.text} /></span>
                </li>
              ))}
            </ol>
            {licence.note && <p className="rt-cd__lead rt-cg__note"><Inline text={licence.note} /></p>}
          </div>
        </section>
      )}
      {costs && (
        <section className="rt-cd__sec" id="costs" aria-labelledby="rt-cg-cost-h">
          <h2 id="rt-cg-cost-h">{costs.title}</h2>
          {costs.intro && <p className="rt-cd__lead">{costs.intro}</p>}
          <div className="rt-cd__table-wrap">
            <table className="rt-cd__table rt-cg__costs">
              <thead>
                <tr><th scope="col">Cost</th><th scope="col">Price</th></tr>
              </thead>
              <tbody>
                {low != null && <tr><td>{costs.courseLabel || `${course.title} course`}</td><td>from {formatPrice(low)}</td></tr>}
                {costs.firstAid && <tr><td>{costs.firstAid.label}</td><td>from {formatPrice(aid)}</td></tr>}
                {(costs.rows || []).map((r) => <tr key={r.label}><td>{r.label}</td><td>{r.value}</td></tr>)}
                {costs.licenceFee && <tr><td>{costs.licenceFee.label}</td><td>{formatPrice(fee)}</td></tr>}
                {low != null && <tr className="is-total"><td>Typical total</td><td>{total}</td></tr>}
              </tbody>
            </table>
          </div>
          {costs.note && <p className="rt-cd__lead rt-cg__note"><Inline text={costs.note} /></p>}
        </section>
      )}
      {careers && (
        <section className="rt-cd__sec" aria-labelledby="rt-cg-career-h">
          <div className="rt-cd__learn">
            <h2 id="rt-cg-career-h">{careers.title}</h2>
            <p className="rt-cd__lead"><Inline text={careers.text} /></p>
            {careers.areas?.length > 0 && <Ticks items={careers.areas} />}
            {careers.roles && <p className="rt-cd__lead"><Inline text={careers.roles} /></p>}
            {careers.href && careers.cta && <Link href={careers.href} className="rt-cd__link">{careers.cta}</Link>}
          </div>
        </section>
      )}
    </>
  );
}

// Who is this course for: its ticked list, with any paragraphs written before or after it (a blank line between them; the list's
// lines start "- "). Text with no such list is one tick per line, as it always was. `links`: as Inline.
export function AudienceSection({ text, links }) {
  const blocks = textBlocks(text);
  const listed = blocks.some((b) => b.list);
  const parts = listed ? blocks : [{ list: String(text || "").split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean) }];
  if (!parts.some((b) => b.list?.length || b.text)) return null;
  return (
    <section className="rt-cd__sec" aria-labelledby="rt-cd-aud-h">
      <div className="rt-cd__learn">
        <h2 id="rt-cd-aud-h">Who is this course for?</h2>
        {parts.map((b, i) =>
          b.list ? (
            <ul key={i} className="rt-cd__checks is-one">{b.list.map((o) => <li key={o}><Check /> <span><Inline text={o} links={links} /></span></li>)}</ul>
          ) : (
            <p key={i} className="rt-cd__lead"><Inline text={b.text} links={links} /></p>
          )
        )}
      </div>
    </section>
  );
}
