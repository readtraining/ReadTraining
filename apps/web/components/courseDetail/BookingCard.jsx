"use client";

import React from "react";
import Link from "next/link";
import { IN_HOUSE_NOTE, MODE_LABEL, QUOTE_HREF, useBooking } from "./BookingProvider";
import { formatDateRange, formatPrice, savePercent } from "@/lib/courses";

const Check = () => (
  <svg className="rt-cd__check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L20 7" />
  </svg>
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

// The booking card. Sticky on desktop (CSS), static under the hero on tablet and mobile.
export default function BookingCard() {
  const { course, modes, mode, isInHouse, setMode, session, status, addToBasket, cardButtonRef } = useBooking();
  const save = isInHouse ? 0 : savePercent(session.price, session.wasPrice);
  const label = status === "loading" ? "Adding" : status === "added" ? "Added" : status === "error" ? "Try again" : "Add to basket";
  const trust = trustItems(course);
  const extras = (course.extras || []).slice(0, 2);

  const toDates = (e) => {
    e.preventDefault();
    document.getElementById("dates")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="rt-cd__card">
      {!isInHouse && (
        <>
          <div className="rt-cd__price-row">
            <span className="rt-cd__price">{formatPrice(session.price)}</span>
            {session.wasPrice > session.price && (
              <s className="rt-cd__was">
                <span className="rt-cd__sr">was </span>
                {formatPrice(session.wasPrice)}
              </s>
            )}
            {save > 0 && <span className="rt-cd__save">{save}% off</span>}
          </div>
          <p className="rt-cd__per">All inc</p>
        </>
      )}

      {modes.length > 1 && (
        <fieldset className="rt-cd__field">
          <legend className="rt-cd__label">How do you want to learn?</legend>
          <div className="rt-cd__seg" style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}>
            {modes.map((m) => (
              <label key={m} className={`rt-cd__seg-opt${mode === m ? " is-on" : ""}`}>
                <input type="radio" name="rt-cd-mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
                <span>{MODE_LABEL[m]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {isInHouse ? (
        <>
          <p className="rt-cd__inhouse" aria-live="polite">{IN_HOUSE_NOTE}</p>
          <Link ref={cardButtonRef} href={QUOTE_HREF} className="rt-cd__btn">Get a quote</Link>
        </>
      ) : (
        <>
          <div className="rt-cd__session" aria-live="polite">
            <div className="rt-cd__session-top">
              <strong>{formatDateRange(session.date, session.endDate)}</strong>
              <a href="#dates" className="rt-cd__link" onClick={toDates}>Change</a>
            </div>
            <div className="rt-cd__session-sub">{session.location}, {session.provider}</div>
          </div>

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

          <Link href={QUOTE_HREF} className="rt-cd__team">Booking for a team? Get a group quote</Link>
        </>
      )}

      {trust.length > 0 && (
        <ul className="rt-cd__included">
          {trust.map((t) => (
            <li key={t}><Check /> {t}</li>
          ))}
        </ul>
      )}

      <div className="rt-cd__staff">
        <strong>Interested in staff training?</strong>
        <p>Create an account to get exclusive discounts on group bookings.</p>
        <Link href={QUOTE_HREF} className="rt-cd__link">Click for more info</Link>
      </div>

      {extras.length > 0 && (
        <div className="rt-cd__extras">
          <p className="rt-cd__extras-title">Prepare for your exams</p>
          <ul>
            {extras.map((x) => (
              <li key={x.title}>
                <span className="rt-cd__extras-main">
                  <Link href={x.url} className="rt-cd__extras-link">{x.title}</Link>
                  {x.note && <small>{x.note}</small>}
                </span>
                <span>{x.price > 0 ? formatPrice(x.price) : "Free"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
