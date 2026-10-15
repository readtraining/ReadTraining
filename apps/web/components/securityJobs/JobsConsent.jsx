import React from "react";
import { CtaLink, Eyebrow } from "@/components/marketing/parts";

// "Your details, your decision": the page's dark band (as Skill Saver's funding band: numbered points left, .fb-credit panel
// right). The panel is an example introduction request, what a candidate sees before anything is shared; its buttons are part of
// the picture, not controls.
export default function JobsConsent({ consent: c }) {
  const k = c.card;
  return (
    <section className="fb-section -dark" aria-labelledby="rt-jobs-consent-h">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow dark>{c.eyebrow}</Eyebrow>
            <h2 className="fb-title -onDark" id="rt-jobs-consent-h">{c.title}</h2>
            <p className="fb-lede -onDark">{c.text}</p>
            <ol className="fb-numbered">
              {c.points.map((p, i) => (
                <li key={p.title}>
                  <span className="fb-numbered__n" aria-hidden="true">{i + 1}</span>
                  <div><b>{p.title}</b><span>{p.text}</span></div>
                </li>
              ))}
            </ol>
            <div className="fb-actions"><CtaLink link={c.cta} variant="mint" /></div>
          </div>

          <figure className="fb-credit rt-jobs__request">
            <div className="fb-credit__head">
              <div><span className="fb-credit__label">{k.label}</span><b>{k.role}</b></div>
            </div>
            <p className="rt-jobs__requestmeta">{k.meta}</p>
            <ul className="fb-darkRows">
              {k.rows.map((r) => (
                <li key={r.title}><div><b>{r.title}</b><span>{r.text}</span></div></li>
              ))}
            </ul>
            <div className="rt-jobs__requestbtns" aria-hidden="true">
              <span className="rt-jobs__fakebtn -yes">{k.yes}</span>
              <span className="rt-jobs__fakebtn">{k.no}</span>
            </div>
            <figcaption className="fb-credit__note">{k.note}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
