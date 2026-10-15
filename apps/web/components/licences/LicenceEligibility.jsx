import React from "react";
import ProductFrame from "@/components/marketing/ProductFrame";
import { Eyebrow, Points, Ticks } from "@/components/marketing/parts";

// "Who can apply" (.fb-split on the page tint): the eligibility rules as titled points; beside them the documents you need as a
// ticked checklist in a product frame, with any note (for example the overseas criminal record rule).
export default function LicenceEligibility({ licence: l, copy }) {
  return (
    <section className="fb-section -lavender" aria-labelledby="rt-lic-elig-h">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow>{copy.eligEyebrow}</Eyebrow>
            <h2 className="fb-title" id="rt-lic-elig-h">{l.eligibility.title}</h2>
            {l.eligibility.text && <p className="fb-lede">{l.eligibility.text}</p>}
            <Points items={l.eligibility.points} />
          </div>
          <ProductFrame title={copy.docsFrame}>
            <Ticks items={l.documents.items} />
            {l.documents.note && <p className="rt-lic__docnote">{l.documents.note}</p>}
          </ProductFrame>
        </div>
      </div>
    </section>
  );
}
