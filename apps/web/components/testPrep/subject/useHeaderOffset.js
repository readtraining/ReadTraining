"use client";

import { useEffect } from "react";

// The sticky header's height, published as --header-offset so sticky parts and anchors sit below it (as on the catalogue).
export function useHeaderOffset() {
  useEffect(() => {
    const header = document.querySelector("header.header");
    if (!header) return;
    const set = () => document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(header);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--header-offset");
    };
  }, []);
}
