"use client";

import React, { useEffect, useRef, useState } from "react";

// The guide's contents (docs layout): on desktop a column pinned beside the article that marks the section being read
// (scrollspy); on phones and tablets a native <details> above the article, closed until opened. Plain in-page links (the exact
// heading text, pointing at each section's id), so they are in the HTML for search engines (the "Jump to" links Google can
// show). A click scrolls to the section, puts its id in the address (shareable) and moves keyboard focus to its heading.
export default function SubjectToc({ title, items }) {
  const ref = useRef(null);
  const [active, setActive] = useState(items[0]?.id);

  // Open from 992px up (the pinned column); phones and tablets start closed. Done once, so a reader's own choice is kept.
  useEffect(() => {
    if (ref.current && window.matchMedia("(min-width: 992px)").matches) ref.current.open = true;
  }, []);

  // Scrollspy: the current section is the last one whose top has passed the line under the slim bar (rAF-throttled).
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      let current = items[0]?.id;
      for (const x of items) {
        const el = document.getElementById(x.id);
        if (el && el.getBoundingClientRect().top <= 140) current = x.id;
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [items]);

  const goTo = (e, id) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.history.replaceState(window.history.state, "", `#${id}`);
    const heading = el.querySelector("h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  };

  return (
    <nav className="rt-tps__otp" aria-labelledby="rt-tps-otp-h">
      <details ref={ref}>
        <summary className="rt-tps__otp-summary">
          <h2 className="rt-tps__otp-title" id="rt-tps-otp-h">{title}</h2>
          <i className="icon-chevron-down" aria-hidden="true"></i>
        </summary>
        <ol className="rt-tps__otp-list" role="list">
          {items.map((x) => (
            <li key={x.id}>
              <a href={`#${x.id}`} className={active === x.id ? "is-active" : undefined} aria-current={active === x.id ? "location" : undefined} onClick={(e) => goTo(e, x.id)}>{x.heading}</a>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  );
}
