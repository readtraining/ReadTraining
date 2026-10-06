"use client";

import React, { useEffect, useRef, useState } from "react";

const DEFAULT_SECTIONS = [
  { id: "learning-options", label: "Learning options" },
  { id: "overview", label: "Overview" },
  { id: "requirements", label: "Requirements" },
  { id: "content", label: "Course content" },
  { id: "faqs", label: "FAQs" },
];

// Sticky anchor navigation (not tabs): every section is always on the page. One rAF-throttled scroll listener
// (scrollspy) updates state only when the active section changes. The active link is scrolled into view by
// adjusting this list's own scrollLeft, never with scrollIntoView, so the page does not move.
export default function SectionNav({ sections = DEFAULT_SECTIONS }) {
  const SECTIONS = sections;
  const [active, setActive] = useState("learning-options");
  const listRef = useRef(null);
  const activeRef = useRef("learning-options");

  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
      const line = offset + 52 + 24;
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = SECTIONS[SECTIONS.length - 1].id;
      if (current !== activeRef.current) {
        activeRef.current = current;
        setActive(current);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [sections]);

  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector('[aria-current="true"]');
    if (!list || !link) return;
    const left = link.offsetLeft - 16;
    const right = link.offsetLeft + link.offsetWidth + 16;
    if (left < list.scrollLeft) list.scrollLeft = left;
    else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth;
  }, [active]);

  return (
    <nav className="rt-cd__nav" aria-label="On this page">
      <ul ref={listRef} className="rt-cd__nav-list">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="rt-cd__nav-link" aria-current={active === s.id ? "true" : undefined}>
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
