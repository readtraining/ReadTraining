"use client";

import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { SIDE, SIDE_COOKIE, SIDE_WIDTH_COOKIE } from "@/lib/sideMenu";

// The sidebar parts both work layouts share (the admin, AdminShell; the provider workspace, ProviderShell), so they look and
// behave the same: below 992px the sidebar is a drawer opened from the top bar's menu button (focus moves into it and is kept
// there, Esc or the close button shuts it, the page behind doesn't scroll, and it shuts when a page opens), and its groups fold
// one by one, remembered in this browser. From 992px the button at the sidebar's top folds it to a 64px rail of icons and opens
// it again (kept in a cookie, so the server draws the page the same way and nothing jumps on load), with Ctrl+B for that button
// (useSideShortcut), an edge that resizes the open menu (SideResizer; the width is kept in a cookie too) and the rail's tooltips
// (useRailTip).

const keep = (name, value) => {
  try {
    document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
  } catch {}
};

// The sidebar folded or open, from 992px, and its chosen width (null: the default). The layouts read the
// cookies on the server (lib/sideMenu.js).
const SideMenu = createContext({ closed: false, width: null, fold: () => {}, toggle: () => {}, resize: () => {} });
export function SideMenuProvider({ closed: initialClosed = false, width: initialWidth = null, children }) {
  const [closed, setClosed] = useState(initialClosed);
  const [width, setWidth] = useState(initialWidth);
  const fold = (next) => {
    keep(SIDE_COOKIE, next ? "1" : "0");
    setClosed(next);
  };
  const toggle = () => fold(!closed);
  const resize = (w) => {
    keep(SIDE_WIDTH_COOKIE, String(w));
    setWidth(w);
  };
  return <SideMenu.Provider value={{ closed, width, fold, toggle, resize }}>{children}</SideMenu.Provider>;
}
export const useSideMenu = () => useContext(SideMenu);

// The button at the folded rail's top that opens the menu again (from 992px; the open menu folds with Ctrl+B, useSideShortcut,
// or its edge, SideResizer). Its title names the shortcut.
export function SideMenuButton({ controls }) {
  const { closed, toggle } = useSideMenu();
  const label = closed ? "Expand menu" : "Collapse menu";
  return (
    <button type="button" className="rt-adm__sidehide" onClick={toggle} aria-expanded={!closed} aria-controls={controls}
      title={`${label} (Ctrl+B)`} aria-keyshortcuts="Control+B Meta+B">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d={closed ? "m13.5 10 2 2-2 2" : "m15.5 10-2 2 2 2"} />
      </svg>
      <span className="rt-sr">{label}</span>
    </button>
  );
}

// Ctrl+B (Cmd+B on a Mac) folds or opens the sidebar, from 992px; never while typing (a field, a text editor) or in a pop-up.
export function useSideShortcut() {
  const { toggle } = useSideMenu();
  const latest = useRef(toggle);
  useEffect(() => {
    latest.current = toggle;
  });
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.repeat || e.defaultPrevented || e.key?.toLowerCase() !== "b") return;
      if (!window.matchMedia("(min-width: 992px)").matches) return;
      const t = e.target;
      if (t instanceof Element && (t.isContentEditable || t.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='dialog']"))) return;
      e.preventDefault();
      const was = document.activeElement;
      latest.current();
      // the keyboard was on a menu link that has now gone (the open list or the rail's icons): it goes to the menu's button
      requestAnimationFrame(() => {
        if (was && was !== document.body && (!was.isConnected || !was.getClientRects().length)) document.querySelector(".rt-adm__sidehide")?.focus();
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

// the widest open menu for this window: 280px, or a quarter of the window, but never narrower than the default (the CSS keeps the
// same limits, .rt-adm__body)
const widest = () => Math.min(SIDE.max, Math.max(SIDE.base, Math.floor(window.innerWidth / 4)));

// The open menu's width for the layout's root element (the grid reads --rt-side-w)
export const sideWidthStyle = (width) => ({ "--rt-side-w": `${width ?? SIDE.base}px` });

// The sidebar's right edge (from 992px): drag it to resize the open menu, below the snap point to fold it to the rail, or from the
// rail outwards to open it; double-click folds or opens it. With the keyboard: arrows step 16px (below the narrowest folds, right
// from the rail opens), Home folds, End opens it widest and Enter folds or opens. `rootRef` is the element whose --rt-side-w the
// grid reads: while dragging it is written straight there (no re-render on every move) and saved when the drag ends. `sideRef` is
// the sidebar.
export function SideResizer({ rootRef, sideRef, controls }) {
  const { closed, width, fold, toggle, resize } = useSideMenu();
  const [max, setMax] = useState(SIDE.max);
  const drag = useRef(null);
  useEffect(() => {
    const measure = () => setMax(widest());
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      document.body.classList.remove("rt-side-resizing"); // a page that changes mid-drag
    };
  }, []);
  const open = Math.min(width ?? SIDE.base, max);
  const setTo = (w) => {
    if (w < SIDE.min) {
      if (!closed) fold(true);
      return;
    }
    if (closed) fold(false);
    resize(Math.min(w, max));
  };
  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      toggle();
      return;
    }
    const next = { ArrowLeft: closed ? null : open - SIDE.step, ArrowRight: closed ? SIDE.min : open + SIDE.step, Home: 0, End: max }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    if (next !== null) setTo(next);
  };
  const setVar = (w) => rootRef.current?.style.setProperty("--rt-side-w", `${w}px`);
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); // no text selection
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, from: sideRef.current?.getBoundingClientRect().width ?? open, saved: width ?? SIDE.base, rail: closed, w: null, moved: false };
    document.body.classList.add("rt-side-resizing");
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 3) return; // a click or a double-click doesn't resize
    d.moved = true;
    const raw = d.from + dx;
    const rail = raw < SIDE.snap;
    if (rail !== d.rail) {
      // folding or opening mid-drag slides (the drag's own moves don't): the sliding is let back for that step
      d.rail = rail;
      document.body.classList.remove("rt-side-resizing");
      fold(rail);
      clearTimeout(d.slide);
      d.slide = setTimeout(() => drag.current === d && document.body.classList.add("rt-side-resizing"), 220);
    }
    if (!rail) {
      // past the narrowest it still gives a little (half the pointer's move), so pushing it towards the rail can be seen
      const w = raw < SIDE.min ? SIDE.min - (SIDE.min - raw) / 2 : raw;
      d.w = Math.round(Math.min(w, widest()));
      setVar(d.w);
    }
  };
  const onPointerEnd = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    clearTimeout(d.slide);
    document.body.classList.remove("rt-side-resizing");
    if (d.rail) setVar(d.saved); // left folded: it opens again at the width it had before
    else if (d.w !== null) {
      // let go short of the rail: it slides back to the narrowest width
      const w = Math.max(d.w, SIDE.min);
      setVar(w);
      resize(w);
    }
  };
  return (
    <div className="rt-adm__resize" role="separator" aria-orientation="vertical" tabIndex={0} aria-label="Resize menu" aria-controls={controls}
      aria-valuemin={SIDE.rail} aria-valuemax={max} aria-valuenow={closed ? SIDE.rail : open} aria-valuetext={closed ? "Folded to icons" : `${open} pixels wide`}
      title="Drag to resize the menu, double-click to fold or open it"
      onKeyDown={onKeyDown} onDoubleClick={toggle} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd} onLostPointerCapture={onPointerEnd}></div>
  );
}

// The folded rail opens when its empty space is clicked (its icons and button keep their own clicks): the whole rail is a target,
// not just the small button at its top. Returns the sidebar <nav>'s onClick.
export function useRailOpen() {
  const { closed, fold } = useSideMenu();
  return (e) => {
    if (!closed || e.target.closest("a, button, input, [role='separator']")) return;
    fold(false);
  };
}

// The rail's tooltips: pointing at or focusing an icon shows its name beside it, drawn outside the rail (which scrolls, so it would
// cut off a tooltip inside it); Esc or scrolling hides it, and so does opening the menu (`on`: the rail is shown). Returns the
// props for each icon link (its name in `data-tip`) and the tooltip, rendered once.
export function useRailTip(on) {
  const [tip, setTip] = useState(null);
  useEffect(() => {
    if (!on) setTip(null);
  }, [on]);
  const show = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label: e.currentTarget.dataset.tip, top: r.top + r.height / 2, left: r.right + 8 });
  };
  const hide = () => setTip(null);
  useEffect(() => {
    if (!tip) return;
    const onKey = (e) => e.key === "Escape" && setTip(null);
    const onScroll = () => setTip(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [tip]);
  const tipProps = { onPointerEnter: show, onPointerLeave: hide, onFocus: show, onBlur: hide };
  const tipEl = on && tip && <span className="rt-adm__tip" style={{ top: tip.top, left: tip.left }} aria-hidden="true">{tip.label}</span>;
  return [tipProps, tipEl];
}

// A name cut short with "…" (an account card's, one line): pointing at it shows the whole name in the rail's tooltip, under it,
// only when it is actually cut. The text is all there for screen readers, so the tooltip is for the eye only.
export function useNameTip() {
  const [tip, setTip] = useState(null);
  const show = (e) => {
    const el = e.currentTarget;
    if (el.scrollWidth <= el.clientWidth) return;
    const r = el.getBoundingClientRect();
    setTip({ label: el.textContent, top: r.bottom + 6, left: r.left });
  };
  const hide = () => setTip(null);
  useEffect(() => {
    if (!tip) return;
    const onKey = (e) => e.key === "Escape" && setTip(null);
    const onScroll = () => setTip(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [tip]);
  const tipEl = tip && <span className="rt-adm__tip -below" style={{ top: tip.top, left: tip.left }} aria-hidden="true">{tip.label}</span>;
  return [{ onPointerEnter: show, onPointerLeave: hide }, tipEl];
}

// The drawer: `sideRef` is the sidebar <nav>.
export function useWorkDrawer(sideRef) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef(null);
  const closeBtn = useRef(null);
  const pathname = usePathname();
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    closeBtn.current?.focus();
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, [menuOpen]);
  const closeMenu = () => {
    setMenuOpen(false);
    menuBtn.current?.focus();
  };
  useFocusTrap(menuOpen, sideRef, closeMenu);
  return { menuOpen, setMenuOpen, menuBtn, closeBtn, closeMenu };
}

// Which groups are folded, kept in this browser under `storageKey`. Returns [folded, fold(group), setAll(groups)].
export function useFoldedGroups(storageKey) {
  const [folded, setFolded] = useState([]);
  useEffect(() => {
    try {
      setFolded(JSON.parse(window.localStorage.getItem(storageKey) || "[]"));
    } catch {}
  }, [storageKey]);
  const keep = (next) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
    return next;
  };
  const fold = (group) => setFolded((f) => keep(f.includes(group) ? f.filter((g) => g !== group) : [...f, group]));
  const setAll = (groups) => setFolded(keep(groups));
  return [folded, fold, setAll];
}

// Keeps the sidebar where it was scrolled when another page opens. Each page draws its own sidebar, which would otherwise start
// at the top, so an item clicked near the bottom would jump out of view. The position is kept in this tab (sessionStorage, under
// `storageKey`), put back once the groups are folded as they were (`folded`, from useFoldedGroups), and then the current page's
// item is scrolled into view only if it is out of sight (a page opened from a link or the address bar).
export function useKeptScroll(sideRef, storageKey, folded) {
  useEffect(() => {
    const side = sideRef.current;
    if (!side) return;
    const save = () => {
      try {
        window.sessionStorage.setItem(storageKey, String(Math.round(side.scrollTop)));
      } catch {}
    };
    side.addEventListener("scroll", save, { passive: true });
    return () => side.removeEventListener("scroll", save);
  }, [sideRef, storageKey]);
  useLayoutEffect(() => {
    const side = sideRef.current;
    if (!side) return;
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved !== null) side.scrollTop = Number(saved) || 0;
    } catch {}
    const item = side.querySelector('[aria-current="page"]');
    if (!item) return;
    const box = side.getBoundingClientRect();
    const at = item.getBoundingClientRect();
    if (!at.height) return; // inside a folded group
    if (at.top < box.top) side.scrollTop -= box.top - at.top + 12;
    else if (at.bottom > box.bottom) side.scrollTop += at.bottom - box.bottom + 12;
  }, [sideRef, storageKey, folded]);
}

// The top bar's menu button (shown below 992px).
export function MenuButton({ drawer, controls }) {
  return (
    <button type="button" className="rt-adm__menu" ref={drawer.menuBtn} aria-expanded={drawer.menuOpen} aria-controls={controls} onClick={() => drawer.setMenuOpen((o) => !o)}>
      <span aria-hidden="true"></span>
      <span className="rt-sr">{drawer.menuOpen ? "Close menu" : "Menu"}</span>
    </button>
  );
}

// The drawer's head: "Menu" and its close button (hidden from 992px, where the sidebar is always there).
export function DrawerHead({ drawer }) {
  return (
    <div className="rt-adm__drawerhead">
      <span className="rt-adm__drawertitle">Menu</span>
      <button type="button" className="rt-adm__drawerclose" ref={drawer.closeBtn} onClick={drawer.closeMenu}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        <span className="rt-sr">Close menu</span>
      </button>
    </div>
  );
}

// A group's fold arrow (turns when the group is folded).
export const FoldChevron = () => (
  <svg className="rt-adm__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
);
