"use client";

import { useEffect, useState } from "react";

// Where the site header ends on screen (px from the top), while `active`: the dimmed page and the phone menu start there. It moves
// as the strip above the header scrolls away, so it is measured again on scroll and resize.
export function useHeaderBottom(active) {
  const [bottom, setBottom] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const header = document.querySelector("header.header");
    if (!header) return undefined;
    const set = () => setBottom(Math.max(0, Math.round(header.getBoundingClientRect().bottom)));
    set();
    window.addEventListener("scroll", set, { passive: true });
    window.addEventListener("resize", set);
    return () => {
      window.removeEventListener("scroll", set);
      window.removeEventListener("resize", set);
    };
  }, [active]);
  return bottom;
}
