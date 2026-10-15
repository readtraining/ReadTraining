"use client";

import React, { useEffect, useId, useRef, useState } from "react";

// Long text: shows the first part with a fade, then "Show more" / "Show less". The button always keeps its space (hidden when
// the text already fits), so nothing moves after the page loads.
export default function ClampBlock({ children, max = 168 }) {
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(true);
  const ref = useRef(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (!open) setOverflows(el.scrollHeight > max + 8);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [open, max]);

  const clamped = !open && overflows;
  return (
    <div className="rt-clamp">
      <div ref={ref} id={id} className={`rt-clamp__body${clamped ? " is-clamped" : ""}`} style={clamped ? { maxHeight: max } : undefined}>
        {children}
      </div>
      <button
        type="button"
        className="rt-cd__link rt-clamp__btn"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        style={!open && !overflows ? { visibility: "hidden" } : undefined}
        tabIndex={!open && !overflows ? -1 : 0}
      >
        {open ? "Show less" : "Show more"}
      </button>
    </div>
  );
}
