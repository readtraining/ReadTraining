"use client";

import React, { useEffect, useId, useRef, useState } from "react";

const FIRST_LINES = 8; // lines shown while collapsed
const MIN_LINES = 10; // a section shorter than this shows no button and no fade
const FADE = 48; // px of fade over the last part of the visible text

// A long article section: the heading stays outside (always visible), the body shows its first 8 lines with a fade and a
// "Show more" / "Show less" button. The whole text stays in the HTML (it is only clipped), so nothing is removed.
// A table, list or image is never cut in the middle: if the cut falls inside one, the visible part runs to the end of it.
export default function LongBody({ children }) {
  const ref = useRef(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ measured: false, long: true, limit: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const sample = el.querySelector("p, li, dd, td");
      const lh = parseFloat(getComputedStyle(sample || el).lineHeight) || 25.5;
      const total = el.scrollHeight;
      if (total < MIN_LINES * lh) {
        setState({ measured: true, long: false, limit: 0 });
        return;
      }
      let limit = FIRST_LINES * lh;
      const top = el.getBoundingClientRect().top;
      const blocks = [...el.querySelectorAll("ul, ol, table, dl, img, figure, .rt-cd__table-wrap")].map((n) => {
        const r = n.getBoundingClientRect();
        return [r.top - top, r.bottom - top];
      });
      for (let i = 0; i < 6; i++) {
        const hit = blocks.find(([t, b]) => t < limit && b > limit);
        if (!hit) break;
        limit = hit[1];
      }
      setState({ measured: true, long: total - limit >= lh, limit: Math.ceil(limit) });
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const collapsed = state.long && !open;
  const style = collapsed
    ? {
        maxHeight: state.measured ? state.limit : `calc(${FIRST_LINES} * 1.7em)`,
        overflow: "hidden",
        WebkitMaskImage: `linear-gradient(to bottom, #000 calc(100% - ${FADE}px), transparent)`,
        maskImage: `linear-gradient(to bottom, #000 calc(100% - ${FADE}px), transparent)`,
      }
    : undefined;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Closing a long section from its bottom would leave the reader below it: bring its heading back into view.
    if (!next) {
      const sec = ref.current?.closest("section");
      if (sec && sec.getBoundingClientRect().top < 0) requestAnimationFrame(() => sec.scrollIntoView({ block: "start", behavior: "instant" }));
    }
  };

  return (
    <>
      <div ref={ref} id={id} className="rt-long" style={style}>
        {children}
      </div>
      {(state.long || !state.measured) && (
        <button type="button" className="rt-cd__link rt-clamp__btn" aria-expanded={open} aria-controls={id} onClick={toggle}>
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}
