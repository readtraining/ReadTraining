"use client";

import React, { useState } from "react";

// Accordion group: a <details>/<summary> header (title, chosen value underneath, rotating chevron) and a
// <fieldset> + <legend> holding the radio group. Open state lives here, so a filter change never closes a group.
export default function FilterGroup({ id, title, value = "", defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className="rt-fp__group" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="rt-fp__summary" id={id}>
        <span className="rt-fp__summary-text">
          <span className="rt-fp__title">{title}</span>
          {value && <span className="rt-fp__value">{value}</span>}
        </span>
        <svg className="rt-fp__chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </summary>
      <fieldset className="rt-fp__body">
        <legend className="rt-sr">{title}</legend>
        {children}
      </fieldset>
    </details>
  );
}
