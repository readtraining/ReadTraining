"use client";
import { useState } from "react";

/* FAQ section: the site's FAQ (pill, centred title, divider accordion with plus/minus and animated height), as on
   /for-business (BizFaq) and the course catalogue (CourseFaq), taking its content as props. One answer is open at a time;
   a closed answer is inert, so it cannot be tabbed into. */
export default function FaqSection({ eyebrow, title, text, items, idPrefix = "faq", className = "layout-pt-lg layout-pb-lg", id, compact = false }) {
  const [open, setOpen] = useState(0);
  return (
    <section className={`${className}${compact ? " rt-faq--compact" : ""}`} id={id}>
      <div className="container">
        <div className="row justify-center text-center">
          <div className="col-xl-7 col-lg-9">
            <div className="rt-section-head">
              {eyebrow && <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{eyebrow}</div>}
              <h2 className="sectionTitle__title mt-20" style={{ maxWidth: "26ch" }}>{title}</h2>
              {text && <p className="sectionTitle__text" style={{ maxWidth: 640 }}>{text}</p>}
            </div>
          </div>
        </div>
        <div className="bz-acc mt-40">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q} className={`bz-acc__item${isOpen ? " is-open" : ""}`}>
                <h3 className="bz-acc__h">
                  <button type="button" className="bz-acc__btn" aria-expanded={isOpen} aria-controls={`${idPrefix}-${i}`} id={`${idPrefix}-btn-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                    <span>{it.q}</span>
                    <span className="bz-acc__icon" aria-hidden="true"><i></i><i></i></span>
                  </button>
                </h3>
                <div className="bz-acc__panel" id={`${idPrefix}-${i}`} role="region" aria-labelledby={`${idPrefix}-btn-${i}`} inert={!isOpen}>
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
