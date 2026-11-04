"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useContextElement } from "@/context/Context";
import Toast from "@/components/courses/Toast";
import { toItem, trackEvent } from "@/lib/analytics";
import { bookableModes, defaultMode as defaultModeOf, firstSession } from "@/lib/courseModes";
import { formatShortDate } from "@/lib/format";
import { lineFor } from "@/lib/basket";
import { TEAM } from "@/lib/teamTraining";
import { BASKET_HREF, QUOTE_HREF } from "@/lib/routes";

const BookingContext = createContext(null);
export const useBooking = () => useContext(BookingContext);
export const IN_HOUSE_NOTE = TEAM.note;
export const quoteHref = (course) => `${QUOTE_HREF}?course=${course.slug}`;

// Shared booking state for the whole detail page: delivery mode, location filter, the selected session and, on a course with
// packages (data/courseGuides.js), the chosen package. BookingCard, DatesSection, MobileBuyBar and PackagePicker all read this
// one source. It is mirrored to the URL (?mode=&session=&package=) with history.replaceState, so a shared link opens with the
// same selection and nothing reloads or scrolls. A package adds its `add` to the date's price (`price`, `wasPrice`) and goes
// into the basket with the date.
export default function BookingProvider({ course, initialMode, initialSession, initialPackage, packages = null, children }) {
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
  // the chosen package's key ("course": the course alone); none on a course without packages
  const [bundleKey, setBundleKey] = useState(() => (packages?.some((p) => p.key === initialPackage) ? initialPackage : packages?.[0]?.key ?? null));
  const bundle = packages?.find((p) => p.key === bundleKey) ?? null;
  const [city, setCity] = useState("");
  const [toast, setToast] = useState(null);
  const [datesOpen, setDatesOpen] = useState(false); // the "choose a date" pop-up
  const openerRef = useRef(null);
  const [flash, setFlash] = useState(0); // bumped on every choice made on the page; the card flashes briefly
  const [barOn, setBarOn] = useState(false); // true while the slim bar is showing (the card then collapses its image)
  const notify = useCallback((t) => setToast(typeof t === "string" ? { message: t } : t), []);

  const isInHouse = mode === "inhouse";
  const session = course.sessions.find((s) => s.id === sessionId) || (mode ? firstOf(mode) : null) || course.sessions[0] || null;
  // what one place costs with the chosen package (the date's price plus the package), and its was-price when the date has one
  const extra = bundle?.add ?? 0;
  const price = session ? session.price + extra : null;
  const wasPrice = session && session.wasPrice > session.price ? session.wasPrice + extra : null;

  const writeUrl = useCallback(
    (nextMode, nextSession, nextBundle) => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (nextMode) params.set("mode", nextMode);
        if (nextSession) params.set("session", nextSession);
        else if (nextMode) params.delete("session");
        if (nextBundle !== undefined) {
          if (nextBundle && nextBundle !== packages?.[0]?.key) params.set("package", nextBundle);
          else params.delete("package");
        }
        window.history.replaceState(window.history.state, "", `${pathname}?${params.toString()}${window.location.hash}`);
      } catch {}
    },
    [pathname, packages],
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

  // ---- a package (data/courseGuides.js): choosing one leaves dated booking on the same date, or goes back to it from team
  // training, and the booking card flashes with the new price ----
  const selectBundle = useCallback(
    (key) => {
      const next = packages?.find((p) => p.key === key);
      if (!next || key === bundleKey) return;
      setFlash((f) => f + 1);
      setBundleKey(key);
      if (mode === "inhouse" && defaultMode && defaultMode !== "inhouse") {
        const target = session?.mode === defaultMode ? session : firstOf(defaultMode);
        setModeState(defaultMode);
        if (target) setSessionId(target.id);
        writeUrl(defaultMode, target?.id, key);
      } else writeUrl(null, null, key);
      notify(`Selected: ${next.name}`);
      trackEvent("select_promotion", { promotion_id: next.key, promotion_name: next.name, items: [toItem(course)] });
    },
    [packages, bundleKey, mode, defaultMode, session, firstOf, writeUrl, notify, course],
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

  // ---- add to basket: one shared flow for the card and the mobile bar (no double add) ----
  const [status, setStatus] = useState("idle"); // idle | loading | added | error
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const lineBundle = bundle && bundle.add > 0 ? { key: bundle.key, name: bundle.name, add: bundle.add } : null;
  const inBasket = isAddedToCartCourses(course.id, session?.id || "", lineBundle?.key || "");
  const addToBasket = useCallback(() => {
    if (status === "loading" || status === "added" || !session || isInHouse) return;
    // the editors' Preview of a course that may not be live yet: nothing goes in the basket
    if (course.preview) return notify({ message: "This is a preview, so booking is off. Learners can book once the course is live." });
    setStatus("loading");
    later(() => {
      try {
        // with a package: the package goes with the line, and one that includes first aid answers the basket's first aid question
        const line = { ...lineFor(course, session), ...(lineBundle ? { bundle: lineBundle, ...(bundle.firstAid ? { firstAid: "bundle" } : {}) } : {}) };
        addCourseToCart(course.id, line);
        setStatus("added");
        // a self-paced course has no date: it starts whenever the learner likes
        const when = session.mode === "ondemand" ? "self-paced, start any time" : `${formatShortDate(session.date)}, ${session.location}`;
        notify({ message: `Added to basket: ${lineBundle ? `${lineBundle.name}, ` : ""}${when}`, href: BASKET_HREF, label: "View basket" });
        trackEvent("add_to_cart", { currency: "GBP", value: price, items: [{ ...toItem(course), item_variant: lineBundle ? `${session.id}:${lineBundle.key}` : session.id, price, quantity: 1 }] });
        later(() => setStatus("idle"), 1500);
      } catch {
        setStatus("error");
        notify("We could not add that course. Please try again.");
        later(() => setStatus("idle"), 1500);
      }
    }, 300);
  }, [status, session, isInHouse, addCourseToCart, course, notify, lineBundle, bundle, price]);

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
    status, inBasket, addToBasket, notify, cardButtonRef, barOn, setBarOn, flash, defaultMode, datesOpen, openDates, closeDates,
    packages, bundle, selectBundle, price, wasPrice,
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
      <Toast toast={toast} onDone={() => setToast(null)} duration={2600} />
    </BookingContext.Provider>
  );
}
