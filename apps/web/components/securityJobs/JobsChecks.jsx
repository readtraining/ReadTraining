import React from "react";
import ProductFrame from "@/components/marketing/ProductFrame";
import { Chip, CtaLink, Eyebrow, Points } from "@/components/marketing/parts";

// "Who can apply", as what employers check (.fb-split: copy with the requirements as titled points left, a product frame right
// showing an example candidate's pre-employment checks with status chips). The link goes to the application, whose first step
// asks the eligibility questions.
export default function JobsChecks({ checks: c }) {
  return (
    <section className="fb-section -lavender" aria-labelledby="rt-jobs-checks-h">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2 className="fb-title" id="rt-jobs-checks-h">{c.title}</h2>
            <p className="fb-lede">{c.text}</p>
            <Points items={c.points} />
            <p className="rt-jobs__note">{c.note}</p>
            <div className="fb-actions"><CtaLink link={c.cta} /></div>
          </div>

          <figure className="rt-jobs__checksfig">
            <ProductFrame title={c.frame}>
              <ul className="rt-jobs__checklist">
                {c.items.map((x) => (
                  <li key={x.title}>
                    <div><b>{x.title}</b><span>{x.text}</span></div>
                    <Chip>{x.status}</Chip>
                  </li>
                ))}
              </ul>
            </ProductFrame>
            <figcaption className="rt-jobs__note">{c.frameNote}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
