"use client";
import React, { useState } from "react";
import { courseFaq, courseFaqTitle, courseFaqEyebrow } from "@/data/courseFaq";

// Same markup and classes as the For business FAQ (BizFaq): pill, centred title, divider accordion with animated height.
export default function CourseFaq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row justify-center text-center">
          <div className="col-xl-7 col-lg-9">
            <div className="rt-section-head">
              <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{courseFaqEyebrow}</div>
              <h2 className="sectionTitle__title mt-20" style={{ maxWidth: "26ch" }}>{courseFaqTitle}</h2>
            </div>
          </div>
        </div>
        <div className="bz-acc mt-40">
          {courseFaq.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q} className={`bz-acc__item${isOpen ? " is-open" : ""}`}>
                <h3 className="bz-acc__h">
                  <button type="button" className="bz-acc__btn" aria-expanded={isOpen} aria-controls={`cfaq-${i}`} id={`cfaq-btn-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                    <span>{it.q}</span>
                    <span className="bz-acc__icon" aria-hidden="true"><i></i><i></i></span>
                  </button>
                </h3>
                <div className="bz-acc__panel" id={`cfaq-${i}`} role="region" aria-labelledby={`cfaq-btn-${i}`}>
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
