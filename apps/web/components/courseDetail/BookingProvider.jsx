"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useContextElement } from "@/context/Context";
import Toast from "@/components/courses/Toast";
import { toItem, trackEvent } from "@/lib/analytics";
import { formatShortDate } from "@/lib/courses";

const BookingContext = createContext(null);
export const useBooking = () => useContext(BookingContext);
export const MODE_LABEL = { classroom: "Classroom", online: "Live online", inhouse: "In-house" };
export const IN_HOUSE_NOTE = "For groups of 6 or more at your workplace";
export const QUOTE_HREF = "/template/contact-1";

const BASKET_HREF = "/template/course-cart";

// Shared booking state for the whole detail page: delivery mode, location filter and the selected session.
// BookingCard, DatesSection and MobileBuyBar all read this one source. It is mirrored to the URL (?mode=&session=)
// with history.replaceState, so a shared link opens with the same selection and nothing reloads or scrolls.
export default function BookingProvider({ course, initialMode, initialSession, children }) {
  const pathname = usePathname();
  const { addCourseToCart, isAddedToCartCourses } = useContextElement();

  // Only the options this course offers. "inhouse" has no dated sessions: it leads to a quote instead.
  const modes = useMemo(() => [...["classroom", "online"].filter((m) => course.sessions.some((s) => s.mode === m)), ...(course.inHouse ? ["inhouse"] : [])], [course]);
  const firstOf = useCallback((mode) => course.sessions.find((s) => s.mode === mode), [course]);

  // Initial state comes from the URL; invalid values fall back to the first session of the default mode.
  const [mode, setModeState] = useState(() => (modes.includes(initialMode) ? initialMode : modes[0]));
  const [sessionId, setSessionId] = useState(() => {
    const startMode = modes.includes(initialMode) && initialMode !== "inhouse" ? initialMode : modes.find((m) => m !== "inhouse");
    const wanted = course.sessions.find((s) => s.id === initialSession);
    return (wanted && wanted.mode === startMode ? wanted : firstOf(startMode))?.id;
  });
  const [city, setCity] = useState("");
  const [toast, setToast] = useState(null);
  const notify = useCallback((t) => setToast(typeof t === "string" ? { message: t } : t), []);

  const isInHouse = mode === "inhouse";
  const session = course.sessions.find((s) => s.id === sessionId) || firstOf(mode) || course.sessions[0];

  const writeUrl = useCallback(
    (nextMode, nextSession) => {
      try {
        const params = new URLSearchParams(window.location.search);
        params.set("mode", nextMode);
        if (nextSession) params.set("session", nextSession);
        else params.delete("session");
        window.history.replaceState(window.history.state, "", `${pathname}?${params.toString()}${window.location.hash}`);
      } catch {}
    },
    [pathname],
  );

  const setMode = useCallback(
    (next) => {
      if (!modes.includes(next) || next === mode) return;
      setModeState(next);
      setCity("");
      if (next === "inhouse") {
        // keep the last chosen session so switching back restores it
        writeUrl(next, null);
        return;
      }
      const target = session?.mode === next ? session : firstOf(next);
      setSessionId(target.id);
      writeUrl(next, target.id);
    },
    [modes, mode, session, firstOf, writeUrl],
  );

  const selectSession = useCallback(
    (id, { announce = true } = {}) => {
      const next = course.sessions.find((s) => s.id === id);
      if (!next) return;
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

  // ---- add to basket: one shared flow for the card and the mobile bar (no double add) ----
  const [status, setStatus] = useState("idle"); // idle | loading | added | error
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const inBasket = isAddedToCartCourses(course.id);
  const addToBasket = useCallback(() => {
    if (status === "loading" || status === "added" || !session || isInHouse) return;
    setStatus("loading");
    later(() => {
      try {
        addCourseToCart(course.id, {
          id: course.id,
          title: course.title,
          imageSrc: course.imageSrc,
          discountedPrice: session.price,
          originalPrice: session.wasPrice ?? session.price,
          sessionId: session.id,
        });
        setStatus("added");
        notify({ message: `Added to basket: ${formatShortDate(session.date)}, ${session.location}`, href: BASKET_HREF, label: "View basket" });
        trackEvent("add_to_cart", { currency: "GBP", value: session.price, items: [{ ...toItem(course), item_variant: session.id, price: session.price, quantity: 1 }] });
        later(() => setStatus("idle"), 1500);
      } catch {
        setStatus("error");
        notify("We could not add that course. Please try again.");
        later(() => setStatus("idle"), 1500);
      }
    }, 300);
  }, [status, session, isInHouse, addCourseToCart, course, notify]);

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
    trackEvent("view_item", { currency: "GBP", value: course.price, items: [toItem(course)] });
  }, [course]);

  const value = {
    course, modes, mode, isInHouse, setMode, city, setCity, session, selectSession,
    status, inBasket, addToBasket, notify, cardButtonRef,
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
      <Toast toast={toast} onDone={() => setToast(null)} duration={2600} />
    </BookingContext.Provider>
  );
}
