"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// The desktop menu's state: which section is open.
//
// How it opens (as Pluralsight's menu): only on a click, never from the pointer passing over. A click on a section opens it,
// a click on the open one closes it, a click on another switches to it. A click anywhere outside the card and the sections
// (the dimmed page, the logo, search), Escape, or a new page closes it. Escape puts focus back on the section's button.
// Keyboard: Enter, Space or the Down arrow on a section opens it and moves into its card; Tab goes through the card's links in
// order (Tab from the open section's button goes into its card), and after the last one the card closes and focus moves to
// the next section (Shift+Tab on the first goes back to the section's button), since the card comes after the whole header.
const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled])";
const intoCard = () => requestAnimationFrame(() => document.querySelector("#rt-nav-card")?.querySelector(FOCUSABLE)?.focus());
export function useNavMenu() {
  const [open, setOpen] = useState(null); // the section id, or null
  const triggers = useRef({});
  const openRef = useRef(null);
  openRef.current = open;

  const close = useCallback((focusTrigger = false) => {
    const was = openRef.current;
    setOpen(null);
    if (focusTrigger && was) triggers.current[was]?.focus();
  }, []);

  // the page changed: close
  const pathname = usePathname();
  useEffect(() => {
    setOpen(null);
  }, [pathname]);

  // while a menu is open: Escape closes it, and so does a click outside the card and the section buttons
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        const inside = document.activeElement?.closest?.("[data-rt-nav]");
        close(Boolean(inside));
        return;
      }
      const card = document.querySelector("#rt-nav-card");
      if (e.key !== "Tab" || !card) return;
      // Tab from the open section's own button goes into its card
      if (!e.shiftKey && document.activeElement === triggers.current[openRef.current]) {
        e.preventDefault();
        card.querySelector(FOCUSABLE)?.focus();
        return;
      }
      if (!card.contains(document.activeElement)) return;
      const items = [...card.querySelectorAll(FOCUSABLE)];
      const ids = Object.keys(triggers.current);
      if (e.shiftKey && document.activeElement === items[0]) {
        e.preventDefault();
        triggers.current[openRef.current]?.focus();
      } else if (!e.shiftKey && document.activeElement === items[items.length - 1]) {
        e.preventDefault();
        const next = triggers.current[ids[ids.indexOf(openRef.current) + 1]];
        const was = openRef.current;
        setOpen(null);
        (next || triggers.current[was])?.focus();
      }
    };
    const onDown = (e) => {
      const t = e.target;
      if (t.closest?.("#rt-nav-card") || Object.values(triggers.current).some((b) => b?.contains(t))) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  return {
    open,
    triggerRef: (id) => (node) => {
      triggers.current[id] = node;
    },
    trigger: (id) => triggers.current[id] || null,

    // a section's button
    triggerProps: (id) => ({
      onClick: () => setOpen(openRef.current === id ? null : id),
      onKeyDown: (e) => {
        // Enter, Space or the Down arrow open the section and move into it
        if (e.key !== "ArrowDown" && e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        setOpen(id);
        intoCard();
      },
    }),

    close,
  };
}
