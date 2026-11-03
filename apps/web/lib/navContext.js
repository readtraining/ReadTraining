"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { EMPTY_NAV, withLinks } from "@/lib/nav";

// The site's navigation in the browser (lib/nav.js): given by the root layout, which loads it on the server. A page built ahead
// of time can arrive without it (on Vercel the pages are built before the API runs): the browser then asks the API straight
// away, so the menus fill in rather than staying empty. useNav() returns { subjects, methods, towns, courses }.
const NavContext = createContext(EMPTY_NAV);

export function NavProvider({ value, methodPages = [], children }) {
  const [nav, setNav] = useState(() => (value?.subjects?.length ? value : EMPTY_NAV));
  const empty = !nav.subjects.length;
  useEffect(() => {
    if (!empty) return;
    let gone = false;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/trpc/catalogue.nav`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => body?.result?.data?.json)
      .then((raw) => !gone && raw?.subjects?.length && setNav(withLinks(raw, methodPages)))
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [empty, methodPages]);
  return <NavContext.Provider value={nav}>{children}</NavContext.Provider>;
}

export const useNav = () => useContext(NavContext);
