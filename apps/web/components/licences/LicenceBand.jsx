import React from "react";
import Link from "next/link";
import { CtaLink, Eyebrow, IconCheck } from "@/components/marketing/parts";
import { RequestButton } from "./LicenceRequest";

// The page's dark band (as Skill Saver's funding band: copy left, .fb-credit panel right). Three kinds, from the licence's data:
// - service: "Let us apply for you", what is included as numbered points, and a panel with the price and "Apply for me";
// - jobs (SIA): the work the licence opens, as chips, and our Security Jobs page;
// - training (forklift): what to tell us, and a panel to request training for a quote.
export default function LicenceBand({ band: b }) {
  return (
    <section className="fb-section -dark" aria-labelledby="rt-lic-band-h">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow dark>{b.eyebrow}</Eyebrow>
            <h2 className="fb-title -onDark" id="rt-lic-band-h">{b.title}</h2>
            <p className="fb-lede -onDark">{b.text}</p>
            {b.points && (
              <ol className="fb-numbered">
                {b.points.map((p, i) => (
                  <li key={p.title}>
                    <span className="fb-numbered__n" aria-hidden="true">{i + 1}</span>
                    <div><b>{p.title}</b><span>{p.text}</span></div>
                  </li>
                ))}
              </ol>
            )}
            {b.chips && (
              <ul className="rt-lic__chips">
                {b.chips.map((c) => <li key={c}>{c}</li>)}
              </ul>
            )}
            {b.link && <div className="fb-actions"><CtaLink link={b.link} variant="mint" /></div>}
          </div>

          <div className="fb-credit rt-lic__panel">
            <div className="fb-credit__head">
              <div><span className="fb-credit__label">{b.panel.label}</span><b>{b.panel.title}</b></div>
              {b.panel.price && <strong className="rt-lic__price">{b.panel.price}</strong>}
            </div>
            <ul className="rt-lic__panelticks">
              {b.panel.items.map((x) => <li key={x}><span className="fb-ticks__icon"><IconCheck /></span>{x}</li>)}
            </ul>
            {b.panel.action === "request" ? (
              <RequestButton className="button -md -green-1 text-dark-1 rt-btn-block">{b.panel.cta}</RequestButton>
            ) : (
              <Link href={b.panel.href} className="button -md -green-1 text-dark-1 rt-btn-block">{b.panel.cta}</Link>
            )}
            {b.panel.note && <p className="fb-credit__note">{b.panel.note}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
