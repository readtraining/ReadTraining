"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

// A row of tabs that scrolls sideways when there are more than fit. The site's own tabs (.rt-tabs) stay the scroller; this adds the
// cues that more are hidden: a soft fade on the side(s) that have more, and round arrow buttons that appear only when they can scroll
// that way. There is no visible scrollbar. The chosen tab is brought into view, so a category picked off-screen is never lost.
// Keyboard users tab through the buttons as usual (the browser scrolls a focused tab into view); the arrows are a pointer aid.
export default function ScrollTabs({ label, activeKey, children, className = "" }) {
  const ref = useRef(null);
  const first = useRef(true);
  const [edge, setEdge] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  // Bring the chosen tab into view (not on first load, so the page does not jump).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    const active = el?.querySelector(".is-active");
    if (!el || !active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const box = el.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    if (a.left < box.left + 40 || a.right > box.right - 40) {
      el.scrollTo({ left: el.scrollLeft + (a.left + a.width / 2) - (box.left + box.width / 2), behavior: reduce ? "auto" : "smooth" });
    }
  }, [activeKey]);

  const scrollBy = (dir) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.7), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className={`rt-stabs${edge.left ? " has-left" : ""}${edge.right ? " has-right" : ""} ${className}`}>
      <button type="button" className="rt-stabs__arrow is-prev" aria-label={`Scroll ${label} left`} tabIndex={-1} onClick={() => scrollBy(-1)} hidden={!edge.left}>
        <i className="icon-arrow-left text-12" aria-hidden="true"></i>
      </button>
      <div className="rt-tabs" role="group" aria-label={label} ref={ref}>
        {children}
      </div>
      <button type="button" className="rt-stabs__arrow is-next" aria-label={`Scroll ${label} right`} tabIndex={-1} onClick={() => scrollBy(1)} hidden={!edge.right}>
        <i className="icon-arrow-right text-12" aria-hidden="true"></i>
      </button>
    </div>
  );
}
