"use client";
import { Fragment, useState } from "react";
import { Inline } from "@/components/doc/DocBlocks";
import { paragraphs } from "@/lib/paragraphs";

/* FAQ section: the site's one FAQ (pill, centred title, divider accordion with plus/minus and animated height), used on
   every marketing page, the course catalogue and For Business / For Providers, taking its content as props. One answer is open at a time;
   a closed answer is inert, so it cannot be tabbed into. An answer may hold [label](link) and **bold** (as the legal pages' text
   does) and nothing else, so what an admin writes can never inject markup; a blank line starts a new paragraph and a single
   line break is kept. An item marked `plain` (a provider's booking terms, as typed) is shown exactly as written: its words never
   become links or bold, so a provider can't put a link to another site on our pages. */
export default function FaqSection({ eyebrow, title, text, items, idPrefix = "faq", className = "layout-pt-lg layout-pb-lg", id, compact = false }) {
  const [open, setOpen] = useState(0);
  return (
    <section className={`${className}${compact ? " rt-faq--compact" : ""}`} id={id}>
      <div className="container">
        <div className="row justify-center text-center">
          <div className="col-xl-7 col-lg-9">
            <div className="rt-section-head">
              {eyebrow && <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{eyebrow}</div>}
              <h2 className="sectionTitle__title mt-20 rt-faqsec__title">{title}</h2>
              {text && <p className="sectionTitle__text rt-faqsec__text">{text}</p>}
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
                  <div className="bz-acc__inner">
                    {paragraphs(it.a).map((lines, j) => (
                      <p key={j}>{lines.map((line, k) => <Fragment key={k}>{k > 0 && <br />}{it.plain ? line : <Inline text={line} />}</Fragment>)}</p>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
