"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/courseDetail/Icon";
import { useFocusTrap } from "@/lib/useFocusTrap";

// A pop-up in the site's dialog shell (.rt-dd, as the course page's "choose a date" pop-up): centred on desktop, a bottom
// sheet on phones. Locks page scroll, traps Tab, closes on Esc and on the backdrop, and puts focus on the title.
// fallbackFocus: a ref to focus when the opener has gone (it was inside another pop-up that has closed).
export default function Sheet({ open, onClose, title, closeLabel, className = "", fallbackFocus, children }) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const panelRef = useRef(null);
  const returnTo = useRef(null);
  // the latest onClose, so a parent re-render (a new inline function) does not re-run the focus effect and pull focus back to
  // the title while someone is typing or fixing an error
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      returnTo.current = document.activeElement;
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => {
      // focus goes back to the opener only if it is still in the closing pop-up or lost; if the page has moved it on (a jump
      // to a question, another pop-up), it stays there
      const at = document.activeElement;
      const lost = !at || at === document.body || Boolean(panelRef.current?.contains(at));
      setMounted(false);
      const back = returnTo.current?.isConnected ? returnTo.current : fallbackFocus?.current;
      if (lost && back?.isConnected) back.focus({ preventScroll: true });
    }, reduce ? 0 : 260);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- fallbackFocus is a ref

  useEffect(() => {
    if (!mounted) return;
    // Page scroll is blocked by stopping the scroll input that starts outside the pop-up's own scroll area (the body has
    // overscroll-behavior: contain, so it never passes scroll on). Hiding the page's overflow instead would make the browser
    // rebuild how the whole page is drawn, which shows as a white flash on opening and closing and shifts the page by the
    // scrollbar's width.
    const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"]);
    const outside = (e) => !e.target.closest?.(".rt-tq-sheet__body");
    const stop = (e) => outside(e) && e.preventDefault();
    const stopKey = (e) => {
      const t = e.target;
      if (SCROLL_KEYS.has(e.key) && outside(e) && !t.closest?.("input, textarea, select, button, a")) e.preventDefault();
    };
    const opts = { passive: false };
    document.addEventListener("wheel", stop, opts);
    document.addEventListener("touchmove", stop, opts);
    document.addEventListener("keydown", stopKey);
    return () => {
      document.removeEventListener("wheel", stop, opts);
      document.removeEventListener("touchmove", stop, opts);
      document.removeEventListener("keydown", stopKey);
    };
  }, [mounted]);

  // keyboard: Tab stays inside, Esc closes (the shared focus trap); focus starts on the title
  useFocusTrap(open && mounted, panelRef, () => onCloseRef.current());
  useEffect(() => {
    if (!open || !mounted) return;
    const t = setTimeout(() => panelRef.current?.querySelector("h2")?.focus({ preventScroll: true }), 30);
    return () => clearTimeout(t);
  }, [open, mounted]);

  if (!mounted) return null;
  return createPortal(
    <div className={`rt-dd rt-tq-sheet${className ? ` ${className}` : ""}${shown ? " is-in" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rt-dd__panel" role="dialog" aria-modal="true" aria-labelledby="rt-tq-sheet-title" ref={panelRef}>
        <div className="rt-dd__head">
          <h2 id="rt-tq-sheet-title" className="rt-dd__title" tabIndex={-1}>{title}</h2>
          <button type="button" className="rt-icon-btn" aria-label={closeLabel} onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="rt-tq-sheet__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
