"use client";
import { useState } from "react";
import { business } from "@/data/business";

/* FAQ: single-column accordion (divider style, plus/minus, animated height) */
export default function BizFaq() {
  const f = business.faq; const [open, setOpen] = useState(0);
  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row justify-center text-center">
          <div className="col-xl-7 col-lg-9">
            <div className="rt-section-head">
              <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{f.eyebrow}</div>
              <h2 className="sectionTitle__title mt-20" style={{ maxWidth: "26ch" }}>{f.title}</h2>
              <p className="sectionTitle__text" style={{ maxWidth: 640 }}>{f.text}</p>
            </div>
          </div>
        </div>
        <div className="bz-acc mt-40">
          {f.items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q} className={`bz-acc__item${isOpen ? " is-open" : ""}`}>
                <h3 className="bz-acc__h">
                  <button type="button" className="bz-acc__btn" aria-expanded={isOpen} aria-controls={`faq-${i}`} id={`faq-btn-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                    <span>{it.q}</span>
                    <span className="bz-acc__icon" aria-hidden="true"><i></i><i></i></span>
                  </button>
                </h3>
                <div className="bz-acc__panel" id={`faq-${i}`} role="region" aria-labelledby={`faq-btn-${i}`}>
                  <div className="bz-acc__inner"><p>{it.a}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
