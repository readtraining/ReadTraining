"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// The desktop menu's state: which section is open.
//
// How it opens (the usual pattern of big sites' mega menus):
// - Mouse: resting on a section opens it after a short pause (OPEN_DELAY), so sweeping the cursor across the header doesn't flash
//   menus; once a menu is open, moving to another section switches quickly (SWITCH_DELAY). Leaving the header and the card
//   closes it after a grace period (CLOSE_DELAY), so a diagonal move towards the card, or a slip off its edge, doesn't close it.
// - Click, touch and keyboard: a click opens or closes a section. A click just after the mouse opened that section keeps it open
//   (people often click what they've just hovered). Escape closes and puts focus back on the section's button.
// - A click in a form inside the card (typing a town, choosing from a list) keeps it open when the pointer leaves, until a click outside,
//   Escape or another menu.
// - Anything else closes it: the dim area below, a new page.
const OPEN_DELAY = 140;
const SWITCH_DELAY = 70;
const CLOSE_DELAY = 260;
const CLICK_AFTER_HOVER = 600;

export function useNavMenu() {
  const [open, setOpen] = useState(null); // the section id, or null
  const timer = useRef(null);
  const hoverOpenedAt = useRef({ id: null, at: 0 });
  const pinned = useRef(false); // the person is using a form in the card
  const triggers = useRef({});
  const openRef = useRef(null);
  if (openRef.current !== open) pinned.current = false;
  openRef.current = open;

  const clear = () => {
    clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  const close = useCallback((focusTrigger = false) => {
    clear();
    const was = openRef.current;
    setOpen(null);
    if (focusTrigger && was) triggers.current[was]?.focus();
  }, []);

  // the page changed: close everything
  const pathname = usePathname();
  useEffect(() => {
    clear();
    setOpen(null);
  }, [pathname]);

  // Escape closes the open menu from anywhere on the page
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const inside = document.activeElement?.closest?.("[data-rt-nav]");
      close(Boolean(inside));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const isMouse = (e) => e.pointerType === "mouse";

  return {
    open,
    triggerRef: (id) => (node) => {
      triggers.current[id] = node;
    },
    trigger: (id) => triggers.current[id] || null,

    // a section's button
    triggerProps: (id) => ({
      onPointerEnter: (e) => {
        if (!isMouse(e)) return;
        clear();
        if (openRef.current === id) return;
        timer.current = setTimeout(() => {
          hoverOpenedAt.current = { id, at: Date.now() };
          setOpen(id);
        }, openRef.current ? SWITCH_DELAY : OPEN_DELAY);
      },
      onPointerLeave: (e) => {
        if (!isMouse(e)) return;
        clear();
        if (openRef.current && !pinned.current) timer.current = setTimeout(() => setOpen(null), CLOSE_DELAY);
      },
      onClick: () => {
        clear();
        const justHovered = hoverOpenedAt.current.id === id && Date.now() - hoverOpenedAt.current.at < CLICK_AFTER_HOVER;
        hoverOpenedAt.current = { id: null, at: 0 };
        if (openRef.current === id && !justHovered) return setOpen(null);
        setOpen(id);
      },
      onKeyDown: (e) => {
        // Down arrow opens the section and moves into it
        if (e.key !== "ArrowDown") return;
        e.preventDefault();
        clear();
        setOpen(id);
        requestAnimationFrame(() => document.querySelector("#rt-nav-card a, #rt-nav-card button, #rt-nav-card input")?.focus());
      },
    }),

    // the open card: the pointer on it keeps it open; leaving starts the grace period
    cardProps: {
      onPointerEnter: (e) => isMouse(e) && clear(),
      onPointerDown: (e) => {
        if (e.target.closest?.("form")) pinned.current = true;
      },
      onPointerLeave: (e) => {
        if (!isMouse(e) || pinned.current) return;
        clear();
        timer.current = setTimeout(() => setOpen(null), CLOSE_DELAY);
      },
    },

    close,
  };
}
