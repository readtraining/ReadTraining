"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useContextElement } from "@/context/Context";
import Toast from "@/components/courses/Toast";
import { toItem, trackEvent } from "@/lib/analytics";
import { bookableModes, defaultMode as defaultModeOf, firstSession } from "@/lib/courseModes";
import { formatShortDate } from "@/lib/format";
import { firstAidFor, lineFor } from "@/lib/basket";
import { TEAM } from "@/lib/teamTraining";
import { BASKET_HREF, QUOTE_HREF } from "@/lib/routes";
import { useRouter } from "next/navigation";
import PackageDialog from "./PackageChooser";

const BookingContext = createContext(null);
export const useBooking = () => useContext(BookingContext);
export const IN_HOUSE_NOTE = TEAM.note;
export const quoteHref = (course) => `${QUOTE_HREF}?course=${course.slug}`;

// Shared booking state for the whole detail page: delivery mode, location filter and the selected session. BookingCard,
// DatesSection and MobileBuyBar all read this one source. It is mirrored to the URL (?mode=&session=) with
// history.replaceState, so a shared link opens with the same selection and nothing reloads or scrolls. A date or self-paced course
// sold in packages (its provider's price plan) shows its cheapest package's price, "From"; booking it asks which package first.
export default function BookingProvider({ course, initialMode, initialSession, children }) {
  const pathname = usePathname();
  const { addCourseToCart, isAddedToCartCourses } = useContextElement();

  // Only the options this course offers. "inhouse" has no dated sessions: it leads to a quote instead.
  const modes = useMemo(() => [...bookableModes(course), ...(course.inHouse ? ["inhouse"] : [])], [course]);
  // The first session of a mode and the default mode follow the shared rules in lib/courses.js (cheapest, most popular).
  const firstOf = useCallback((mode) => firstSession(course, mode), [course]);
  // a course with no dates yet has no dated mode: team training (if offered) is then the only option, or none at all (mode null)
  const defaultMode = useMemo(() => defaultModeOf(course) ?? modes[0] ?? null, [course, modes]);

  // Initial state comes from the URL; invalid values fall back to the first session of the default mode.
  const [mode, setModeState] = useState(() => (modes.includes(initialMode) ? initialMode : defaultMode));
  const [sessionId, setSessionId] = useState(() => {
    const startMode = modes.includes(initialMode) && initialMode !== "inhouse" ? initialMode : defaultMode;
    const wanted = course.sessions.find((s) => s.id === initialSession);
    return (wanted && wanted.mode === startMode ? wanted : startMode ? firstOf(startMode) : null)?.id;
  });
  const [city, setCity] = useState("");
  const [toast, setToast] = useState(null);
  const [datesOpen, setDatesOpen] = useState(false); // the "choose a date" pop-up
  const openerRef = useRef(null);
  const [flash, setFlash] = useState(0); // bumped on every choice made on the page; the card flashes briefly
  const [barOn, setBarOn] = useState(false); // true while the slim bar is showing (the card then collapses its image)
  const notify = useCallback((t) => setToast(typeof t === "string" ? { message: t } : t), []);

  const isInHouse = mode === "inhouse";
  const session = course.sessions.find((s) => s.id === sessionId) || (mode ? firstOf(mode) : null) || course.sessions[0] || null;
  // what one place costs (sold in packages: the cheapest package's, and `fromPrice` says so), and the date's was-price
  const price = session ? session.price : null;
  const wasPrice = session && session.wasPrice > session.price ? session.wasPrice : null;
  const fromPrice = Boolean(session?.packages);

  const writeUrl = useCallback(
    (nextMode, nextSession) => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (nextMode) params.set("mode", nextMode);
        if (nextSession) params.set("session", nextSession);
        else if (nextMode) params.delete("session");
        params.delete("package"); // the old course page packages (gone): an old shared link loses it
        window.history.replaceState(window.history.state, "", `${pathname}?${params.toString()}${window.location.hash}`);
      } catch {}
    },
    [pathname],
  );

  const setMode = useCallback(
    (next) => {
      if (!modes.includes(next) || next === mode) return;
      setFlash((f) => f + 1);
      setModeState(next);
      setCity("");
      if (next === "inhouse") {
        // keep the last chosen session so switching back restores it
        writeUrl(next, null);
        return;
      }
      const target = session?.mode === next ? session : firstOf(next);
      if (!target) return;
      setSessionId(target.id);
      writeUrl(next, target.id);
    },
    [modes, mode, session, firstOf, writeUrl],
  );

  const selectSession = useCallback(
    (id, { announce = true } = {}) => {
      const next = course.sessions.find((s) => s.id === id);
      if (!next) return;
      setFlash((f) => f + 1);
      setModeState(next.mode);
      setSessionId(next.id);
      writeUrl(next.mode, next.id);
      if (announce) {
        notify(`Selected ${formatShortDate(next.date)}, ${next.location}`);
        trackEvent("select_item", { items: [{ ...toItem(course), item_variant: next.id, price: next.price }] });
      }
    },
    [course, notify, writeUrl],
  );

  // ---- "choose a date" pop-up: opening adds a history entry (?dates=open) so the browser Back button closes it ----
  const openDates = useCallback(() => {
    openerRef.current = document.activeElement;
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("dates", "open");
      window.history.pushState({ ...(window.history.state || {}), rtDates: true }, "", `${pathname}?${params.toString()}${window.location.hash}`);
    } catch {}
    setDatesOpen(true);
  }, [pathname]);

  const closeDates = useCallback(
    ({ afterSelect = false } = {}) => {
      setDatesOpen(false);
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.has("dates")) {
          if (!afterSelect && window.history.state?.rtDates) window.history.back();
          else {
            params.delete("dates");
            const qs = params.toString();
            window.history.replaceState(window.history.state, "", `${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
          }
        }
      } catch {}
      setTimeout(() => openerRef.current?.isConnected && openerRef.current.focus?.(), 0);
    },
    [pathname],
  );

  // A reload or shared link can carry ?dates=open while the pop-up is closed; drop it so the URL matches what is on screen.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (!params.has("dates")) return;
      params.delete("dates");
      const qs = params.toString();
      window.history.replaceState(window.history.state, "", `${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
    } catch {}
  }, [pathname]);

  useEffect(() => {
    const onPop = () => {
      if (!new URLSearchParams(window.location.search).has("dates")) setDatesOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ---- Book now: one shared flow for the date pop-up, the card and the mobile bar. It puts the date in the basket (never twice:
  // the basket merges the same date and package) and goes straight to the basket, as Hurak's "Book now" does. A date sold in
  // packages asks which one first: the dates pop-up has its own step for it; the card and the bar open the packages here ----
  const router = useRouter();
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [pkgFor, setPkgFor] = useState({ open: false, id: null, qty: 1 }); // the steps pop-up (its date stays set while closing)
  const needsAid = useCallback((s) => firstAidFor({ mode: s.mode, subject: course.subject, sub: course.sub, topic: course.topic }), [course]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const inBasket = isAddedToCartCourses(course.id, session?.id || "");
  const book = useCallback(
    (sessionId, quantity = 1, pkgKey = null, firstAid = null) => {
      const target = sessionId ? course.sessions.find((s) => s.id === sessionId) : session;
      if (status === "loading" || !target || isInHouse) return;
      const pkg = target.packages?.find((p) => p.key === pkgKey) ?? null;
      // the package, then the first aid requirement, before the basket
      if ((target.packages && !pkg) || (needsAid(target) && !firstAid && !pkg?.firstAid)) return setPkgFor({ open: true, id: target.id, qty: quantity });
      // the editors' Preview of a course that may not be live yet: nothing goes in the basket
      if (course.preview) return notify({ message: "This is a preview, so booking is off. Learners see the dates once the course is live; online booking opens in a later update." });
      setStatus("loading");
      try {
        const line = { ...lineFor(course, target, pkg?.key), quantity, ...(firstAid && firstAid !== "bundle" ? { firstAid } : {}) };
        addCourseToCart(course.id, line);
        trackEvent("add_to_cart", { currency: "GBP", value: line.price * quantity, items: [{ ...toItem(course), item_variant: pkg ? `${target.id}:${pkg.key}` : target.id, price: line.price, quantity }] });
        router.push(BASKET_HREF);
      } catch {
        setStatus("error");
        notify("We could not add that course. Please try again.");
        later(() => setStatus("idle"), 1500);
      }
    },
    [status, session, isInHouse, addCourseToCart, course, notify, router, needsAid],
  );
  const addToBasket = useCallback(() => book(), [book]);
  // Book now, wherever it is on the page (hero, card, mobile bar), as Hurak's: nothing is chosen for the learner. A course with
  // dates opens them (venue, date, then the package and first aid); a self-paced course has no date, so it goes on to its steps.
  const bookNow = useCallback(() => (mode === "ondemand" ? book() : openDates()), [mode, book, openDates]);
  // a Learning options card's See dates: that study method's dates (the page follows the method)
  const openDatesFor = useCallback(
    (m) => {
      if (m && m !== mode) setMode(m);
      openDates();
    },
    [mode, setMode, openDates],
  );
  // What a study method offers, for the card, the mobile bar and Learning options: how many dates and venues, the towns, the
  // next date, and the lowest price (with that date's was-price); "From" when there is more than one price or packages.
  const summaryFor = useCallback(
    (m) => {
      const list = course.sessions.filter((s) => s.mode === m);
      if (!list.length) return null;
      const cheapest = list.reduce((a, b) => (b.price < a.price ? b : a));
      const next = list.reduce((a, b) => (b.date < a.date ? b : a));
      return {
        count: list.length,
        venues: new Set(list.map((s) => `${s.address}|${s.postcode}`)).size,
        towns: [...new Set(list.map((s) => s.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        next,
        price: cheapest.price,
        wasPrice: cheapest.wasPrice > cheapest.price ? cheapest.wasPrice : null,
        from: new Set(list.map((s) => s.price)).size > 1 || list.some((s) => s.packages),
      };
    },
    [course],
  );
  const closePackages = useCallback(() => setPkgFor((x) => ({ ...x, open: false })), []);
  const pkgSession = course.sessions.find((s) => s.id === pkgFor.id) ?? null;

  // The booking card's button, observed by the mobile buy bar.
  const cardButtonRef = useRef(null);

  // Publish the sticky header's height as --header-offset (same approach as the catalogue page).
  useEffect(() => {
    const header = document.querySelector("header.header");
    if (!header) return;
    const set = () => document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(header);
    window.addEventListener("resize", set);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", set);
      document.documentElement.style.removeProperty("--header-offset");
    };
  }, []);

  useEffect(() => {
    if (course.preview) return; // an editor's preview (perhaps a draft) isn't a learner viewing the course
    trackEvent("view_item", { currency: "GBP", value: course.price ?? 0, items: [toItem(course)] });
  }, [course]);

  const value = {
    course, modes, mode, isInHouse, setMode, city, setCity, session, selectSession,
    status, inBasket, addToBasket, book, notify, cardButtonRef, barOn, setBarOn, flash, defaultMode, datesOpen, openDates, openDatesFor, closeDates,
    price, wasPrice, fromPrice, bookNow, summaryFor,
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
      <PackageDialog open={pkgFor.open} onClose={closePackages} course={course} session={pkgSession} quantity={pkgFor.qty} needsAid={pkgSession ? needsAid(pkgSession) : false}
        onDone={(key, aid) => { closePackages(); book(pkgFor.id, pkgFor.qty, key, aid); }} />
      <Toast toast={toast} onDone={() => setToast(null)} duration={2600} />
    </BookingContext.Provider>
  );
}
