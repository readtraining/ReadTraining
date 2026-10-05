"use client";
import { useEffect } from "react";

/* Cursor parallax for the hero (same gsap effect the page had before): moves every .js-mouse-move by its data-move */
export default function HeroParallax({ selector }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let off;
    import("gsap").then((m) => {
      const gsap = m.gsap || m.default;
      const container = document.querySelector(selector);
      if (!container) return;
      const targets = container.querySelectorAll(".js-mouse-move");
      const onMove = (e) => {
        const relX = e.pageX - container.offsetLeft; const relY = e.pageY - container.offsetTop;
        targets.forEach((el) => {
          const mv = Number(el.getAttribute("data-move"));
          gsap.to(el, { x: ((relX - container.offsetWidth / 2) / container.offsetWidth) * mv, y: ((relY - container.offsetHeight / 2) / container.offsetHeight) * mv, duration: 0.2 });
        });
      };
      document.addEventListener("mousemove", onMove);
      off = () => document.removeEventListener("mousemove", onMove);
    });
    return () => off?.();
  }, [selector]);
  return null;
}
