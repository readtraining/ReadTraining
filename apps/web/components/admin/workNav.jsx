"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { SIDE_COOKIE } from "@/lib/sideMenu";

// The sidebar parts both work layouts share (the admin, AdminShell; the provider workspace, ProviderShell), so they look and
// behave the same: below 992px the sidebar is a drawer opened from the top bar's menu button (focus moves into it and is kept
// there, Esc or the close button shuts it, the page behind doesn't scroll, and it shuts when a page opens), and its groups fold
// one by one, remembered in this browser. From 992px the button at the sidebar's top right hides it, and the same button at the
// top left of the page brings it back (kept in a cookie, so the server draws the page the same way and nothing jumps on load).

// The sidebar hidden or shown, from 992px. The layouts read the cookie on the server (`closed`, lib/sideMenu.js).
const SideMenu = createContext({ closed: false, toggle: () => {} });
export function SideMenuProvider({ closed: initial = false, children }) {
  const [closed, setClosed] = useState(initial);
  const toggle = () => {
    const next = !closed;
    document.cookie = `${SIDE_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    setClosed(next);
    // the keyboard stays on the button, which has moved: the page's button when hidden, the sidebar's when shown
    requestAnimationFrame(() => document.querySelector(next ? ".rt-adm__sideopen" : ".rt-adm__sidehide")?.focus());
  };
  return <SideMenu.Provider value={{ closed, toggle }}>{children}</SideMenu.Provider>;
}
export const useSideMenu = () => useContext(SideMenu);

// The button that hides the sidebar (`where="side"`, at its top right) or brings it back (`where="page"`, the page's top left).
export function SideMenuButton({ where, controls }) {
  const { closed, toggle } = useSideMenu();
  const label = where === "side" ? "Hide menu" : "Show menu";
  return (
    <button type="button" className={where === "side" ? "rt-adm__sidehide" : "rt-adm__sideopen"} onClick={toggle} aria-expanded={!closed} aria-controls={controls} title={label}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d={where === "side" ? "m15.5 10-2 2 2 2" : "m13.5 10 2 2-2 2"} />
      </svg>
      <span className="rt-sr">{label}</span>
    </button>
  );
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
