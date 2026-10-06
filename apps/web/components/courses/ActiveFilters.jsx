"use client";

import React, { useEffect, useRef } from "react";

// One chip per active filter (max one per group, plus keyword and custom price range). Each removes its own filter.
// After a removal keyboard focus moves to the next chip, or to the result count when none are left.
export default function ActiveFilters({ chips, onRemove, onClearAll, fallbackFocusId = "rt-res-count" }) {
  const wrap = useRef(null);
  const pendingFocus = useRef(null);

  useEffect(() => {
    if (pendingFocus.current === null) return;
    const index = pendingFocus.current;
    pendingFocus.current = null;
    const buttons = chips.length && wrap.current ? wrap.current.querySelectorAll(".rt-chip button") : [];
    const target = buttons[Math.min(index, buttons.length - 1)];
    (target || document.getElementById(fallbackFocusId))?.focus();
  }, [chips, fallbackFocusId]);

  // The row opens and closes smoothly (grid 0fr > 1fr). With no filters it takes zero space and is hidden from
  // assistive tech and the keyboard; while it closes it keeps showing the chips that were just removed.
  const open = chips.length > 0;
  const last = useRef(chips);
  if (open) last.current = chips;
  const shown = open ? chips : last.current;
  return (
    <div className="rt-chips-wrap" data-open={open ? "true" : "false"} aria-hidden={open ? undefined : "true"} inert={open ? undefined : true}>
    <div className="rt-chips" aria-label="Active filters" ref={wrap}>
      <div className="rt-chips__row">
      {shown.map((chip, index) => (
        <span key={chip.key} className="rt-chip">
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={() => {
              pendingFocus.current = index;
              onRemove(chip.key);
            }}
            aria-label={`Remove filter ${chip.label}`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M5.3 5.3a1 1 0 011.4 0L10 8.6l3.3-3.3a1 1 0 111.4 1.4L11.4 10l3.3 3.3a1 1 0 01-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 01-1.4-1.4L8.6 10 5.3 6.7a1 1 0 010-1.4z" />
            </svg>
          </button>
        </span>
      ))}
      {open && (
        <button
          type="button"
          className="rt-chips__clear"
          onClick={() => {
            pendingFocus.current = 0;
            onClearAll();
          }}
        >
          Clear all
        </button>
      )}
      </div>
    </div>
    </div>
  );
}
