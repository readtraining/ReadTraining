"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { IN_HOUSE_NOTE, MODE_LABEL, QUOTE_HREF, useBooking } from "./BookingProvider";
import { formatDateRange, formatPrice, savePercent } from "@/lib/courses";

const Check = () => (
  <svg className="rt-cd__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L20 7" />
  </svg>
);

// One small icon per learning option (decoration only).
const ICONS = {
  classroom: <><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" /></>,
  online: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  ondemand: <><circle cx="12" cy="12" r="9" /><path d="M10 8.5l6 3.5-6 3.5z" /></>,
  inhouse: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>,
};
const OptionIcon = ({ mode }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[mode]}</svg>
);

// Trust points come from course/site data only. An item with no data is not shown, and nothing is invented.
export function trustItems(course) {
  const t = course.trust || {};
  return [
    t.noBookingFee && "No booking fee",
    t.approvedProviders && "Approved providers only",
    t.invoice && "Pay by invoice for businesses",
    t.instalments && "Pay in 3 interest-free instalments with Klarna",
    t.trustpilot && `${t.trustpilot} on Trustpilot`,
  ].filter(Boolean).slice(0, 5);
}

// Collapses to nothing in 200ms. While collapsed it is inert: nothing inside it can be focused. It stays in the DOM.
function Fold({ hidden, children, className = "" }) {
  return (
    <div className={`rt-bk__fold${hidden ? " is-hidden" : ""} ${className}`} inert={hidden}>
      <div className="rt-bk__fold-in">{children}</div>
    </div>
  );
}

const scrollTo = (id) => (e) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

// The booking card shows the current choice only (option, price, session, button). The choice itself is made in the
// Learning options section. FULL: image, choice, button, trust grid. COMPACT (desktop, H1 out of view): the image and the
// trust grid collapse; the choice, price, session and button always stay. On tablet and mobile the card is always FULL.
export default function BookingCard() {
  const { course, mode, isInHouse, session, status, addToBasket, cardButtonRef, barOn, flash } = useBooking();
  const [desktop, setDesktop] = useState(false);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // A choice made on the page flashes the choice area for 600ms (the CSS turns this off for reduced motion).
  useEffect(() => {
    if (!flash) return;
    setFlashing(true);
    const t = setTimeout(() => setFlashing(false), 600);
    return () => clearTimeout(t);
  }, [flash]);

  const compact = barOn && desktop;
  const label = status === "loading" ? "Adding" : status === "added" ? "Added" : status === "error" ? "Try again" : "Add to basket";
  const save = isInHouse ? 0 : savePercent(session.price, session.wasPrice);
  const trust = trustItems(course).slice(0, 4);
  const onDemand = mode === "ondemand";

  return (
    <div className={`rt-bk${compact ? " is-compact" : ""}`}>
      {course.imageSrc && (
        <Fold hidden={compact} className="rt-bk__fold--img">
          <div className="rt-bk__img">
            <Image src={course.imageSrc} alt="" width={440} height={248} priority />
          </div>
        </Fold>
      )}

      <div className="rt-bk__body">
        <div className={`rt-bk__choice${flashing ? " is-flash" : ""}`} aria-live="polite">
          <div className="rt-bk__opt">
            <OptionIcon mode={mode} />
            <strong>{MODE_LABEL[mode]}</strong>
            <a href="#learning-options" className="rt-cd__link" onClick={scrollTo("learning-options")}>Change</a>
          </div>

          {isInHouse ? (
            <p className="rt-bk__inhouse">{IN_HOUSE_NOTE}</p>
          ) : (
            <>
              <div className="rt-bk__price">
                <span className="rt-bk__now">{formatPrice(session.price)}</span>
                {session.wasPrice > session.price && <s className="rt-bk__was"><span className="rt-cd__sr">was </span>{formatPrice(session.wasPrice)}</s>}
                {save > 0 && <span className="rt-bk__off">{save}% off</span>}
              </div>
              <p className="rt-bk__vat">All inc</p>

              <div className="rt-bk__session">
                <div className="rt-bk__when">
                  <strong>{onDemand ? session.time : formatDateRange(session.date, session.endDate)}</strong>
                  <a href="#dates" className="rt-cd__link" onClick={scrollTo("dates")}>Change</a>
                </div>
                <div className="rt-bk__where">{session.location}, {session.provider}</div>
              </div>
            </>
          )}
        </div>

        {isInHouse ? (
          <Link ref={cardButtonRef} href={QUOTE_HREF} className="rt-cd__btn">Get a quote</Link>
        ) : (
          <button
            ref={cardButtonRef}
            type="button"
            className={`rt-cd__btn${status === "added" ? " is-added" : ""}`}
            onClick={addToBasket}
            disabled={status === "loading"}
            aria-busy={status === "loading"}
          >
            {label}
          </button>
        )}

        {trust.length > 0 && (
          <Fold hidden={compact} className="rt-bk__fold--trust">
            <ul className="rt-bk__trust">
              {trust.map((t) => (
                <li key={t}><Check /> <span>{t}</span></li>
              ))}
            </ul>
          </Fold>
        )}
      </div>
    </div>
  );
}
