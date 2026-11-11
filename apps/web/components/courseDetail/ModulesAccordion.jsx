"use client";

import React, { useState } from "react";

// Course content in the site's accordion (.bz-acc, the same divider list and plus/minus icon as the FAQs). Only a unit with text
// under it opens: a unit that is just a name is a plain row, with nothing to toggle (and with no unit to open, the units are a
// plain list). Expand all / Collapse all once 4 or more units open (fewer are quick to open one by one). Any number can be
// open. A closed unit is inert, so it cannot be tabbed into.
export default function ModulesAccordion({ modules, title, titleId, intro }) {
  const hasText = (m) => Boolean(m.text || m.topics?.length);
  const opening = modules.filter(hasText).length;
  const [open, setOpen] = useState(() => modules.map((m, i) => i === modules.findIndex(hasText)));
  const [showAll, setShowAll] = useState(false);
  const allOpen = modules.every((m, i) => !hasText(m) || open[i]);
  const LIMIT = 5; // the syllabus lists 5 items, then "Show more"
  const EXPAND_FROM = 4;
  const visible = showAll ? modules : modules.slice(0, LIMIT);
  const toggle = (i) => setOpen((cur) => cur.map((v, j) => (j === i ? !v : v)));

  return (
    <>
      <div className="rt-cd__mod-head">
        <h2 id={titleId}>{title}</h2>
        {opening >= EXPAND_FROM && (
          <button type="button" className="rt-cd__link" onClick={() => setOpen(modules.map(() => !allOpen))}>
            {allOpen ? "Collapse all sections" : "Expand all sections"}
          </button>
        )}
      </div>
      {intro && <p className="rt-cd__lead">{intro}</p>}
      {opening === 0 ? (
        <ul className="rt-cd__list" id="rt-cd-units">
          {visible.map((m) => <li key={m.title}>{m.title}</li>)}
        </ul>
      ) : (
        <div className="bz-acc rt-cd__acc" id="rt-cd-units">
          {visible.map((m, i) =>
            hasText(m) ? (
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
            ) : (
              <div key={m.title} className="bz-acc__item">
                <h3 className="bz-acc__h rt-cd__unit">{m.title}</h3>
              </div>
            ),
          )}
        </div>
      )}
      {modules.length > LIMIT && (
        <button type="button" className="rt-cd__link rt-cd__more" aria-expanded={showAll} aria-controls="rt-cd-units" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}
