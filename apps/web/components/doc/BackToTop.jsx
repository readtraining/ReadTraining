"use client";

import React, { useEffect, useState } from "react";

// "Back to top" for long documents on phones and tablets (from 992px the pinned sidebar does the job). Shows after
// the reader has scrolled a screen and a half; moves focus to the page's H1 so keyboard users land at the start too.
export default function BackToTop({ targetId, label = "Back to top" }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let raf = 0;
    const check = () => { raf = 0; setOn(window.scrollY > window.innerHeight * 1.5); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  const go = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  };

  return (
    <button type="button" className={`rt-doc__top${on ? " is-on" : ""}`} onClick={go} aria-label={label} aria-hidden={!on} tabIndex={on ? 0 : -1}>
      <i className="icon-chevron-down" aria-hidden="true"></i>
    </button>
  );
}
