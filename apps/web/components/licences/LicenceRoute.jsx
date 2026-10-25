import React from "react";
import Link from "next/link";
import ProductFrame from "@/components/marketing/ProductFrame";
import { Eyebrow } from "@/components/marketing/parts";
import { RequestButton } from "./LicenceRequest";

// "How to get it" (#route): the steps on the timeline (.fb-timeline, as /for-business's renewals), each with how long it takes;
// beside them the costs in a product frame: each part (training from our catalogue's lowest price, the official fee, any test),
// the estimated total, who is paid what, the source with the date it was checked, the main action and the free mock test.
// `costs`: the rows and total (lib/licences.js licenceCosts).
export default function LicenceRoute({ licence: l, costs, copy }) {
  const r = l.route;
  const k = l.costs;
  const { rows, total } = costs;
  return (
    <section className="fb-section -white rt-lic__anchor" id="route" aria-labelledby="rt-lic-route-h">
      <div className="container">
        <div className="fb-split rt-lic__route">
          <div>
            <Eyebrow>{copy.routeEyebrow}</Eyebrow>
            <h2 className="fb-title" id="rt-lic-route-h">{r.title}</h2>
            <p className="fb-lede">{r.text}</p>
            <ol className="fb-timeline rt-lic__timeline">
              {r.steps.map((s, i) => (
                <li key={s.title} className="fb-timeline__item">
                  <span className="fb-timeline__dot" aria-hidden="true"></span>
                  <div className="fb-timeline__body">
                    <span className="fb-timeline__date">{`Step ${i + 1}${s.time ? ` · ${s.time}` : ""}`}</span>
                    <b>{s.title}</b>
                    <span>{s.text}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rt-lic__costs">
            <ProductFrame title={copy.costsFrame}>
              <dl className="rt-lic__costlist">
                {rows.map((row) => (
                  <div key={row.label}>
                    <dt><b>{row.label}</b>{row.note && <span>{row.note}</span>}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
                {total && (
                  <div className="-total">
                    <dt><b>{total.label}</b></dt>
                    <dd>{total.value}</dd>
                  </div>
                )}
              </dl>
              <p className="rt-lic__source">
                {copy.checked} {k.checked}. {copy.source} <a href={k.source.url} target="_blank" rel="noopener noreferrer">{k.source.label}<span className="rt-sr"> (opens in a new tab)</span></a>.
              </p>
              <div className="rt-lic__costbtns">
                {l.primary.href ? (
                  <Link href={l.primary.href} className="button -md -purple-1 text-white rt-btn-block">{l.primary.label}</Link>
                ) : (
                  <RequestButton className="button -md -purple-1 text-white rt-btn-block">{l.primary.label}</RequestButton>
                )}
                {l.testBooking && <Link href={l.testBooking.href} className="fb-textlink">{l.testBooking.label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>}
                {l.mockTest && <Link href={l.mockTest.href} className="fb-textlink">{l.mockTest.label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>}
              </div>
            </ProductFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
