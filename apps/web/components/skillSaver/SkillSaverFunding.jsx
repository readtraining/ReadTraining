import React from "react";
import { CtaLink, Eyebrow } from "@/components/marketing/parts";
import { formatPrice } from "@/lib/courses";

// "Who pays the discount": the page's dark band (as /for-business's credit panel: numbered points left, .fb-credit panel
// right). The panel works one booking through the three levels: what each learner pays, the discount we fund, and the full
// price the provider's payout is worked out on.
export default function SkillSaverFunding({ funding: f }) {
  const e = f.example;
  return (
    <section className="fb-section -dark" aria-labelledby="rt-ss-funding-h">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow dark>{f.eyebrow}</Eyebrow>
            <h2 className="fb-title -onDark" id="rt-ss-funding-h">{f.title}</h2>
            <p className="fb-lede -onDark">{f.text}</p>
            <ol className="fb-numbered">
              {f.points.map((p, i) => (
                <li key={p.title}>
                  <span className="fb-numbered__n" aria-hidden="true">{i + 1}</span>
                  <div><b>{p.title}</b><span>{p.text}</span></div>
                </li>
              ))}
            </ol>
            <div className="fb-actions"><CtaLink link={f.cta} variant="mint" /></div>
          </div>

          <div className="fb-credit">
            <div className="fb-credit__head">
              <div><span className="fb-credit__label">{e.label}</span><b>{e.course}</b></div>
              <span className="rt-ss__listPrice">Listed at <b>{formatPrice(e.price)}</b></span>
            </div>
            <ul className="fb-darkRows">
              {e.discounts.map((d, i) => (
                <li key={d}>
                  <div><b>Level {i + 1} learner pays {formatPrice(e.price - (e.price * d) / 100)}</b><span>{d}% discount · {formatPrice((e.price * d) / 100)} funded by ReadTraining</span></div>
                  <span className="rt-ss__paid">Paid on {formatPrice(e.price)}</span>
                </li>
              ))}
            </ul>
            <p className="fb-credit__note">{e.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
