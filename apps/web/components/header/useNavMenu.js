"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// The desktop menu's state: which section is open.
//
// How it opens (the usual pattern of big sites' mega menus):
// - Mouse: a section opens once the pointer rests on it (still for OPEN_DELAY), so sweeping the cursor across the header opens
//   nothing; once a menu is open, moving to another section switches quickly (SWITCH_DELAY). Leaving a section downwards, the
//   menu stays open while the pointer is in the gap between the section and its card (however slowly it crosses), and closes
//   after the grace period (CLOSE_DELAY) once it heads anywhere else; leaving the card closes it after the same grace period, so
//   a slip off the card's edge doesn't close it.
// - Click, touch and keyboard: a click opens or closes a section. A click just after the mouse opened that section keeps it open
//   (people often click what they've just hovered). Escape closes and puts focus back on the section's button.
// - A click in a form inside the card (typing a town, choosing from a list) keeps it open when the pointer leaves, until a click outside,
//   Escape or another menu.
// - Anything else closes it: the dim area below, a new page.
const OPEN_DELAY = 140;
const SWITCH_DELAY = 70;
const CLOSE_DELAY = 260;
const REST_PX = 4; // a pointer that moves less than this counts as resting
const CLICK_AFTER_HOVER = 600;

export function useNavMenu() {
  const [open, setOpen] = useState(null); // the section id, or null
  const timer = useRef(null);
  const restAt = useRef(null); // where the pointer was when the resting pause started
  const crossing = useRef(null); // the pointer is crossing from a section down to its card: the listener watching it
  const hoverOpenedAt = useRef({ id: null, at: 0 });
  const pinned = useRef(false); // the person is using a form in the card
  const triggers = useRef({});
  const openRef = useRef(null);
  if (openRef.current !== open) pinned.current = false;
  openRef.current = open;

  const clear = () => {
    clearTimeout(timer.current);
    timer.current = null;
    if (crossing.current) {
      document.removeEventListener("pointermove", crossing.current);
      crossing.current = null;
    }
  };
  const closeSoon = () => {
    clear();
    timer.current = setTimeout(() => setOpen(null), CLOSE_DELAY);
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
    triggerProps: (id) => {
      const openSoon = (e) => {
        clear();
        restAt.current = { x: e.clientX, y: e.clientY };
        timer.current = setTimeout(() => {
          hoverOpenedAt.current = { id, at: Date.now() };
          setOpen(id);
        }, openRef.current ? SWITCH_DELAY : OPEN_DELAY);
      };
      return {
        onPointerEnter: (e) => {
          if (!isMouse(e)) return;
          clear();
          if (openRef.current === id) return;
          openSoon(e);
        },
        // with no menu open, the pause restarts whenever the pointer moves on, so a menu opens only where it comes to rest
        onPointerMove: (e) => {
          if (!isMouse(e) || openRef.current) return;
          const at = restAt.current;
          if (!at || Math.hypot(e.clientX - at.x, e.clientY - at.y) >= REST_PX) openSoon(e);
        },
        onPointerLeave: (e) => {
          if (!isMouse(e)) return;
          clear();
          restAt.current = null;
          if (!openRef.current || pinned.current) return;
          const from = e.currentTarget.getBoundingClientRect();
          const card = document.getElementById("rt-nav-card")?.getBoundingClientRect();
          if (openRef.current !== id || !card || e.clientY < from.bottom - 1) return closeSoon();
          // heading down: stay open while the pointer is between the section and the card, across the card's width
          const left = Math.min(from.left, card.left);
          const right = Math.max(from.right, card.right);
          const inGap = (x, y) => x >= left && x <= right && y >= from.bottom - 1 && y <= card.top + 1;
          const watch = (m) => {
            if (!inGap(m.clientX, m.clientY)) closeSoon();
          };
          crossing.current = watch;
          document.addEventListener("pointermove", watch);
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
      };
    },

    // the open card: the pointer on it keeps it open; leaving starts the grace period
    cardProps: {
      onPointerEnter: (e) => isMouse(e) && clear(),
      onPointerDown: (e) => {
        if (e.target.closest?.("form")) pinned.current = true;
      },
      onPointerLeave: (e) => {
        if (!isMouse(e) || pinned.current) return;
        closeSoon();
      },
    },

    close,
  };
}
