"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { IN_HOUSE_NOTE, MODE_LABEL, QUOTE_HREF, useBooking } from "./BookingProvider";
import { formatDateRange, formatPrice, savePercent } from "@/lib/courses";

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

// The booking card: course image, the learning option rows (the selected one opens its price and date), one primary
// button and one muted trust line. Everything else that used to be in the card now sits under the learning options.
// Sticky on desktop (CSS). While the slim bar is showing, the image collapses so the card stays compact.
export default function BookingCard() {
  const { course, modes, mode, isInHouse, setMode, session, status, addToBasket, cardButtonRef, barOn } = useBooking();
  const label = status === "loading" ? "Adding" : status === "added" ? "Added" : status === "error" ? "Try again" : "Add to basket";
  const trustLine = trustItems(course).slice(0, 2).join(" · ");

  const fromFor = (m) => {
    const list = course.sessions.filter((s) => s.mode === m);
    return list.length ? Math.min(...list.map((s) => s.price)) : null;
  };
  const toDates = (e) => {
    e.preventDefault();
    document.getElementById("dates")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={`rt-cd__card${barOn ? " is-compact" : ""}`}>
      {course.imageSrc && (
        <div className="rt-cd__card-img">
          <Image src={course.imageSrc} alt="" width={440} height={248} priority />
        </div>
      )}

      <div className="rt-cd__card-body">
        {modes.length > 1 && (
          <fieldset className="rt-cd__opts">
            <legend className="rt-cd__label">How do you want to learn?</legend>
            {modes.map((m) => {
              const on = mode === m;
              const from = m === "inhouse" ? null : fromFor(m);
              return (
                <div key={m} className={`rt-cd__opt${on ? " is-on" : ""}`}>
                  <label className="rt-cd__opt-row">
                    <input type="radio" name="rt-cd-mode" value={m} checked={on} onChange={() => setMode(m)} />
                    <span className="rt-cd__opt-name">{MODE_LABEL[m]}</span>
                    {from !== null && <span className="rt-cd__opt-from">From {formatPrice(from)}</span>}
                  </label>

                  {on && (
                    <div className="rt-cd__opt-detail" aria-live="polite">
                      {isInHouse ? (
                        <p className="rt-cd__inhouse">{IN_HOUSE_NOTE}</p>
                      ) : (
                        <>
                          <div className="rt-cd__price-row">
                            <span className="rt-cd__price">{formatPrice(session.price)}</span>
                            {session.wasPrice > session.price && (
                              <s className="rt-cd__was"><span className="rt-cd__sr">was </span>{formatPrice(session.wasPrice)}</s>
                            )}
                            {savePercent(session.price, session.wasPrice) > 0 && (
                              <span className="rt-cd__save">{savePercent(session.price, session.wasPrice)}% off</span>
                            )}
                            <span className="rt-cd__per">All inc</span>
                          </div>
                          <div className="rt-cd__session-line">
                            <span className="rt-cd__session-text"><strong>{formatDateRange(session.date, session.endDate)}</strong> {session.location}, {session.provider}</span>
                            <a href="#dates" className="rt-cd__link" onClick={toDates}>Change</a>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </fieldset>
        )}

        {modes.length <= 1 && !isInHouse && (
          <div className="rt-cd__opt-detail rt-cd__opt-detail--solo" aria-live="polite">
            <div className="rt-cd__price-row">
              <span className="rt-cd__price">{formatPrice(session.price)}</span>
              {session.wasPrice > session.price && (
                <s className="rt-cd__was"><span className="rt-cd__sr">was </span>{formatPrice(session.wasPrice)}</s>
              )}
              {savePercent(session.price, session.wasPrice) > 0 && (
                <span className="rt-cd__save">{savePercent(session.price, session.wasPrice)}% off</span>
              )}
              <span className="rt-cd__per">All inc</span>
            </div>
            <div className="rt-cd__session-line">
              <span className="rt-cd__session-text"><strong>{formatDateRange(session.date, session.endDate)}</strong> {session.location}, {session.provider}</span>
              <a href="#dates" className="rt-cd__link" onClick={toDates}>Change</a>
            </div>
          </div>
        )}

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

        {trustLine && <p className="rt-cd__trustline">{trustLine}</p>}
      </div>
    </div>
  );
}
