"use client";

import { useEffect, useState } from "react";

// Scrollspy for a document's sections: the current one is the last whose top has passed the line just under the sticky
// header (the last one at the very bottom of the page). rAF-throttled. `ids` must be a stable array.
export function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
      const line = offset + 48;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = ids[ids.length - 1];
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
  }, [ids]);
  return active;
}

// Keep the marked link visible inside a list that scrolls on its own (a pinned contents column taller than the screen).
export function useKeepInView(listRef, active) {
  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector(`a[href="#${active}"]`);
    if (!list || !link || list.scrollHeight <= list.clientHeight) return;
    const l = link.getBoundingClientRect();
    const box = list.getBoundingClientRect();
    if (l.top < box.top || l.bottom > box.bottom) list.scrollTop += l.top - box.top - box.height / 2;
  }, [listRef, active]);
}

// A contents link click: scroll to the section, put its id in the address and move keyboard focus to its heading.
export function goToSection(e, id) {
  const el = document.getElementById(id);
  if (!el) return false;
  e.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  window.history.replaceState(window.history.state, "", `#${id}`);
  el.querySelector("h2")?.focus({ preventScroll: true });
  return true;
}
