"use client";

import React, { useEffect, useRef, useState } from "react";

const PILL = 36; // pill height in px
const INSET = 8; // space kept above and below the pill's track

// A short scroll indicator for the filter panel body (the native scrollbar is hidden by CSS).
// It follows the body's scroll position, is always visible while the body can scroll, and can be dragged. It is decoration only: aria-hidden, and wheel / touch / keyboard scrolling are untouched.
// Rendered inside the panel, after the scrolling body. Nothing is rendered when the body does not need to scroll.
export default function FilterScrollPill({ scrollRef }) {
  const pillRef = useRef(null);
  const [scrollable, setScrollable] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Does the body overflow? Re-checked on resize and whenever the groups' height changes.
  useEffect(() => {
    const body = scrollRef.current;
    if (!body) return;
    const check = () => setScrollable(body.scrollHeight > body.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(body);
    if (body.firstElementChild) ro.observe(body.firstElementChild);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [scrollRef]);

  // Position, scrolling flag. Positions are written straight to the element (no React re-render while scrolling).
  useEffect(() => {
    const body = scrollRef.current;
    const pill = pillRef.current;
    if (!scrollable || !body || !pill) return;
    let raf = 0;
    const place = () => {
      raf = 0;
      const parent = pill.offsetParent;
      if (!parent) return;
      const bodyTop = body.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.clientTop;
      const range = body.scrollHeight - body.clientHeight;
      const ratio = range > 0 ? body.scrollTop / range : 0;
      pill.style.top = `${bodyTop + INSET + ratio * (body.clientHeight - PILL - INSET * 2)}px`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(place);
    };
    place();
    body.addEventListener("scroll", schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(body);
    window.addEventListener("resize", schedule);
    return () => {
      body.removeEventListener("scroll", schedule);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(raf);
    };
  }, [scrollable, scrollRef]);

  // Dragging the pill scrolls the body in proportion.
  const onPointerDown = (e) => {
    const body = scrollRef.current;
    if (!body) return;
    e.preventDefault();
    // React clears e.currentTarget once this handler returns, so keep the element itself for the later listeners.
    const pill = e.currentTarget;
    pill.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startScroll = body.scrollTop;
    const track = body.clientHeight - PILL - INSET * 2;
    const range = body.scrollHeight - body.clientHeight;
    setDragging(true);
    const move = (ev) => {
      if (track > 0) body.scrollTop = startScroll + ((ev.clientY - startY) / track) * range;
    };
    const up = (ev) => {
      setDragging(false);
      if (pill.hasPointerCapture?.(ev.pointerId)) pill.releasePointerCapture(ev.pointerId);
      pill.removeEventListener("pointermove", move);
      pill.removeEventListener("pointerup", up);
      pill.removeEventListener("pointercancel", up);
    };
    pill.addEventListener("pointermove", move);
    pill.addEventListener("pointerup", up);
    pill.addEventListener("pointercancel", up);
  };

  if (!scrollable) return null;
  return (
    <span
      ref={pillRef}
      className={`rt-fp__pill${dragging ? " is-dragging" : ""}`}
      aria-hidden="true"
      onPointerDown={onPointerDown}
    ></span>
  );
}
