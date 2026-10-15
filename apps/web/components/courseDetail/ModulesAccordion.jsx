"use client";

import React, { useState } from "react";

// Course content in the site's accordion (.bz-acc, the same divider list and plus/minus icon as the FAQs), with
// Expand all / Collapse all. Any number of modules can be open. A closed module is inert, so it cannot be tabbed into.
export default function ModulesAccordion({ modules, title, titleId }) {
  const [open, setOpen] = useState(() => modules.map((_, i) => i === 0));
  const [showAll, setShowAll] = useState(false);
  const allOpen = open.every(Boolean);
  const LIMIT = 5; // the syllabus lists 5 items, then "Show more"
  const visible = showAll ? modules : modules.slice(0, LIMIT);
  const toggle = (i) => setOpen((cur) => cur.map((v, j) => (j === i ? !v : v)));

  return (
    <>
      <div className="rt-cd__mod-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="rt-cd__link" onClick={() => setOpen(modules.map(() => !allOpen))}>
          {allOpen ? "Collapse all sections" : "Expand all sections"}
        </button>
      </div>
      <div className="bz-acc rt-cd__acc">
        {visible.map((m, i) => (
          <div key={m.title} className={`bz-acc__item${open[i] ? " is-open" : ""}`}>
            <h3 className="bz-acc__h">
              <button type="button" className="bz-acc__btn" aria-expanded={open[i]} aria-controls={`rt-cd-mod-${i}`} id={`rt-cd-mod-btn-${i}`} onClick={() => toggle(i)}>
                <span>{m.title}</span>
                <span className="bz-acc__icon" aria-hidden="true"><i></i><i></i></span>
              </button>
            </h3>
            <div className="bz-acc__panel" id={`rt-cd-mod-${i}`} role="region" aria-labelledby={`rt-cd-mod-btn-${i}`} inert={!open[i]}>
              <div className="bz-acc__inner">
                {m.text ? (
                  <p>{m.text}</p>
                ) : (
                  <ul className="rt-cd__mod-topics">
                    {m.topics.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {modules.length > LIMIT && (
        <button type="button" className="rt-cd__link rt-cd__more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}
