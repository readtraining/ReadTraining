"use client";

import React, { useState } from "react";

// Course content: one <details> card per module, with Expand all / Collapse all.
export default function ModulesAccordion({ modules }) {
  const [open, setOpen] = useState(() => modules.map((_, i) => i === 0));
  const [showAll, setShowAll] = useState(false);
  const allOpen = open.every(Boolean);
  const LIMIT = 5; // the syllabus lists 5 items, then "Show more"
  const visible = showAll ? modules : modules.slice(0, LIMIT);

  return (
    <>
      <div className="rt-cd__mod-head">
        <span />
        <button type="button" className="rt-cd__link" onClick={() => setOpen(modules.map(() => !allOpen))}>
          {allOpen ? "Collapse all sections" : "Expand all sections"}
        </button>
      </div>
      <div className="rt-cd__mods rt-cd__mods--box">
        {visible.map((m, i) => (
          <details
            key={m.title}
            className="rt-cd__mod"
            open={open[i]}
            onToggle={(e) => {
              const next = e.currentTarget.open;
              setOpen((cur) => (cur[i] === next ? cur : cur.map((v, j) => (j === i ? next : v))));
            }}
          >
            <summary className="rt-cd__mod-sum">
              <span className="rt-cd__mod-title">{m.title}</span>
              <svg className="rt-cd__chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            {m.text ? (
              <p className="rt-cd__faq-a">{m.text}</p>
            ) : (
              <ul className="rt-cd__mod-topics">
                {m.topics.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </details>
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
