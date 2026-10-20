"use client";

import { useEffect } from "react";

// Publishes the site header's height as --header-offset, so a sticky panel (the account menu) sits just below the header instead
// of under it. Same as the catalogue and the course page do.
export function useHeaderOffset() {
  useEffect(() => {
    const header = document.querySelector("header.header");
    if (!header) return;
    const set = () => document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(header);
    window.addEventListener("resize", set);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", set);
      document.documentElement.style.removeProperty("--header-offset");
    };
  }, []);
}
