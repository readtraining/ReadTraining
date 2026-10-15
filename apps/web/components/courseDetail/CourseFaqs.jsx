"use client";

import React, { useState } from "react";

// Course FAQs in the site's accordion style (the same .bz-acc divider list, plus/minus icon and animated height used on
// the Business page). One answer is open at a time. A closed answer is inert, so it cannot be tabbed into or read out.
export default function CourseFaqs({ faqs }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="bz-acc rt-cd__acc">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.question} className={`bz-acc__item${isOpen ? " is-open" : ""}`}>
            <h3 className="bz-acc__h">
              <button type="button" className="bz-acc__btn" aria-expanded={isOpen} aria-controls={`rt-cd-faq-${i}`} id={`rt-cd-faq-btn-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                <span>{f.question}</span>
                <span className="bz-acc__icon" aria-hidden="true"><i></i><i></i></span>
              </button>
            </h3>
            <div className="bz-acc__panel" id={`rt-cd-faq-${i}`} role="region" aria-labelledby={`rt-cd-faq-btn-${i}`} inert={!isOpen}>
              <div className="bz-acc__inner"><p>{f.answer}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
