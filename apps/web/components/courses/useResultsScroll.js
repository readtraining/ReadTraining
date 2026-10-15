"use client";

import { useRef } from "react";

// The results column's scrolling, shared by the filtered lists (test prep, the blog): `resultsRef` goes on the results column
// (.rt-res) and `countRef` on its count (focusable, tabIndex -1).
//
// A shorter list (e.g. All tests > Fire) would make the page shorter than the current scroll position, and the browser would
// jump up at once before the smooth scroll could start. So the results column keeps its height from just before the change
// (`holdHeight`) until the scroll has finished; the list then shrinks below the view, out of sight. `scrollToResults` brings
// the column just under the header: after a filter change only when it is above the view (as the catalogue does), after a page
// change (`always`) every time, with focus on the count.
export function useResultsScroll() {
  const resultsRef = useRef(null);
  const countRef = useRef(null);

  const holdHeight = () => {
    const el = resultsRef.current;
    if (el && !el.style.minHeight) el.style.minHeight = `${el.offsetHeight}px`;
  };
  const releaseHeight = () => {
    if (resultsRef.current) resultsRef.current.style.minHeight = "";
  };

  const scrollToResults = ({ always = false } = {}) => {
    requestAnimationFrame(() => {
      const results = resultsRef.current;
      if (!results) return;
      // the count sits in a toolbar that is sticky on tablets and phones, so measure the results column instead
      const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
      const targetY = Math.max(0, results.getBoundingClientRect().top + window.scrollY - offset - 16);
      if (!always && window.scrollY <= targetY + 1) {
        releaseHeight();
        return;
      }
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: targetY, behavior: reduce ? "auto" : "smooth" });
      if (always) countRef.current?.focus({ preventScroll: true });
      if (reduce) {
        releaseHeight();
        return;
      }
      // release once the scroll has ended (scrollend; the timer covers browsers without it)
      let timer;
      const done = () => {
        window.removeEventListener("scrollend", done);
        clearTimeout(timer);
        releaseHeight();
      };
      window.addEventListener("scrollend", done);
      timer = setTimeout(done, 1000);
    });
  };

  return { resultsRef, countRef, holdHeight, scrollToResults };
}
