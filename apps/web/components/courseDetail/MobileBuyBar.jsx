"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { IN_HOUSE_NOTE, QUOTE_HREF, useBooking } from "./BookingProvider";
import { formatPrice, formatShortDate } from "@/lib/courses";

// Fixed bar at 1023px and under. It appears only once the booking card's button has scrolled out of view above the screen.
// In-house follows the card: no price, and the button becomes "Get a quote".
export default function MobileBuyBar() {
  const { session, isInHouse, status, addToBasket, cardButtonRef } = useBooking();
  const [visible, setVisible] = useState(false);

  // Visible once the card's button is fully above the top of the screen. A scroll check (rAF-throttled) is used instead of
  // an IntersectionObserver because the observer stays silent when the page jumps from below the button to above it
  // (for example after tapping a section link), which would leave the bar hidden.
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const btn = cardButtonRef.current;
      if (btn) setVisible(btn.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [cardButtonRef, isInHouse]);

  const label = status === "loading" ? "Adding" : status === "added" ? "Added" : status === "error" ? "Try again" : "Add to basket";

  return (
    <div className={`rt-cd__bar${visible ? " is-visible" : ""}`} aria-hidden={!visible} inert={!visible}>
      {isInHouse ? (
        <>
          <div className="rt-cd__bar-info">
            <strong>In-house training</strong>
            <span>{IN_HOUSE_NOTE}</span>
          </div>
          <Link href={QUOTE_HREF} className="rt-cd__btn" tabIndex={visible ? 0 : -1}>Get a quote</Link>
        </>
      ) : (
        <>
          <div className="rt-cd__bar-info">
            <strong>{formatPrice(session.price)}</strong>
            <span>{formatShortDate(session.date)}, {session.location}</span>
          </div>
          <button type="button" className={`rt-cd__btn${status === "added" ? " is-added" : ""}`} onClick={addToBasket} disabled={status === "loading"} tabIndex={visible ? 0 : -1}>
            {label}
          </button>
        </>
      )}
    </div>
  );
}
