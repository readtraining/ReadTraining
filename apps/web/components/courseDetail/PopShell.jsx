"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// The booking pop-ups' frame (the dates and the packages): a centred dialog on desktop, a full-screen sheet at 575px and under
// (.rt-dd). It mounts, then fades and slides in on the next frame; closing fades out, then unmounts. While open the page doesn't
// scroll (and doesn't move: the scrollbar's width is added back), focus starts on the element marked `data-initial` (or the
// title), Esc closes it, Tab stays inside it, and focus goes back to the opener afterwards. `children(isDesktop)` is the body.
// `book`: a booking pop-up (the dates, the packages, first aid): one fixed size per screen for all its steps (custom.scss
// .rt-dd__panel.-book). `wide`: 3 or 4 when the booking's steps include packages side by side, so every step keeps that width.
export default function PopShell({ open, onClose, labelledBy, book = false, wide = 0, children }) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  // the latest onClose, so a parent's re-render (an inline function) doesn't run the focus step again
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 576px)").matches;
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    if (openerRef.current?.isConnected) setTimeout(() => openerRef.current?.isConnected && openerRef.current.focus?.({ preventScroll: true }), 0);
    const t = setTimeout(() => setMounted(false), reduced() ? 0 : 260);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    const body = document.body;
    const before = html.clientWidth;
    const prev = { o: html.style.overflow, p: body.style.paddingRight };
    html.style.overflow = "hidden";
    // the width the page gained when its scrollbar went (none where the scrollbar's space is kept: html's scrollbar-gutter)
    const sbw = html.clientWidth - before;
    if (sbw > 0) body.style.paddingRight = `${sbw}px`;
    html.style.setProperty("--rt-sbw", `${sbw}px`);
    return () => {
      html.style.overflow = prev.o;
      body.style.paddingRight = prev.p;
      html.style.removeProperty("--rt-sbw");
    };
  }, [mounted]);

  useEffect(() => {
    if (!open || !mounted) return;
    const panel = panelRef.current;
    if (!panel) return;
    const t = setTimeout(() => (panel.querySelector("[data-initial]") || panel.querySelector("h2"))?.focus({ preventScroll: true }), 30);
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...panel.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, mounted]);

  if (!mounted) return null;
  return createPortal(
    <div className={`rt-dd${shown ? " is-in" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && isDesktop && closeRef.current()}>
      <div className={`rt-dd__panel${book ? " -book" : ""}${wide >= 3 ? ` -wide${wide >= 4 ? "4" : "3"}` : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={panelRef}>
        {children(isDesktop)}
      </div>
    </div>,
    document.body,
  );
}
