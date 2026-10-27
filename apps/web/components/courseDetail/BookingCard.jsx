"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { IN_HOUSE_NOTE, quoteHref, useBooking } from "./BookingProvider";
import { TEAM } from "@/lib/teamTraining";
import { toItem, trackEvent } from "@/lib/analytics";
import { useWishlist } from "@/lib/wishlist";
import { formatDateRange, formatPrice, savePercent } from "@/lib/format";
import { Check, Icon } from "./Icon";
import { modeLabel } from "@/lib/courseModes";


// The heart has no icon-font glyph, so it stays a line SVG (the same one as the listing card).
const Heart = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>
);

// Trust points come from course/site data only. An item with no data is not shown, and nothing is invented.
export function trustItems(course) {
  const t = course.trust || {};
  return [
    t.noBookingFee && "No booking fee",
    t.approvedProviders && "Approved providers only",
  ].filter(Boolean);
}

// Collapses to nothing in 200ms. While collapsed it is inert: nothing inside it can be focused. It stays in the DOM.
function Fold({ hidden, children, className = "" }) {
  return (
    <div className={`rt-bk__fold${hidden ? " is-hidden" : ""} ${className}`} inert={hidden}>
      <div className="rt-bk__fold-in">{children}</div>
    </div>
  );
}

function SaveButton() {
  const { course, notify } = useBooking();
  // Same list as the heart on the listing cards, so a course saved there shows as saved here.
  const [saved, toggleSaved] = useWishlist(course.id);
  const toggle = () => {
    try {
      const saving = toggleSaved();
      notify(saving ? "Saved to your list" : "Removed from your list");
      if (saving) trackEvent("add_to_wishlist", { items: [toItem(course)] });
    } catch {
      notify("We could not update your list. Please try again.");
    }
  };
  return (
    <button type="button" className={`rt-bf__save${saved ? " is-saved" : ""}`} aria-pressed={saved} onClick={toggle}>
      <Heart filled={saved} />
      <span>{saved ? "Saved to your list" : "Save for later"}</span>
    </button>
  );
}

const QUOTE_TEXT = TEAM.quoteText;
const IN_HOUSE_LINE = TEAM.line;

// The booking card. SELECTED option on top (radio, price, info lines, link, button, trust items), then one row for every other
// option the course offers (choosing a row selects it everywhere), then a grey footer with Save.
// FULL (title visible): course image first, trust items under the button. COMPACT (desktop, title out of view): the image and
// the trust items collapse; everything else stays. Tablet and mobile: always FULL.
// The card for a course with nothing to book yet: no dates are open and team training isn't offered.
function NoDatesCard({ course }) {
  return (
    <div className="rt-bk">
      {course.imageSrc && (
        <div className="rt-bk__img">
          <Image src={course.imageSrc} alt="" width={440} height={248} style={{ width: "100%", height: "100%" }} priority />
        </div>
      )}
      <div className="rt-bs">
        <p className="rt-bs__name">New dates coming soon</p>
        <p className="rt-bs__quote">No dates are open for booking yet. Save the course to come back to it, or ask us about it.</p>
        <Link href="/contact-us" className="button -md -outline-purple-1 text-purple-1 rt-btn-block">Ask about this course</Link>
      </div>
      <div className="rt-bf">
        <SaveButton />
      </div>
    </div>
  );
}

export default function BookingCard() {
  const { course, modes, mode, isInHouse, setMode, session, status, addToBasket, cardButtonRef, barOn, flash, openDates } = useBooking();
  const [desktop, setDesktop] = useState(false);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 992px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // A choice made on the page flashes the selected section for 600ms (the CSS turns this off for reduced motion).
  useEffect(() => {
    if (!flash) return;
    setFlashing(true);
    const t = setTimeout(() => setFlashing(false), 600);
    return () => clearTimeout(t);
  }, [flash]);

  const compact = barOn && desktop;
  // nothing to book yet: no dates and no team training
  if (!mode) return <NoDatesCard course={course} />;
  const label = status === "loading" ? "Adding" : status === "added" ? "Added" : status === "error" ? "Try again" : "Add to basket";
  const save = isInHouse ? 0 : savePercent(session.price, session.wasPrice);
  const trust = trustItems(course);
  const onDemand = mode === "ondemand";
  const fromFor = (m) => Math.min(...course.sessions.filter((s) => s.mode === m).map((s) => s.price));
  const others = modes.filter((m) => m !== mode);

  return (
    <div className={`rt-bk${compact ? " is-compact" : ""}`}>
      {course.imageSrc && (
        <Fold hidden={compact} className="rt-bk__fold--img">
          <div className="rt-bk__img">
            <Image src={course.imageSrc} alt="" width={440} height={248} style={{ width: "100%", height: "100%" }} priority />
          </div>
        </Fold>
      )}

      <fieldset className="rt-bs__group">
        <legend className="rt-cd__sr">How do you want to learn?</legend>

        <div className={`rt-bs${flashing ? " is-flash" : ""}`} aria-live="polite">
          <label className="rt-bs__head">
            <input type="radio" name="rt-bk-mode" value={mode} checked onChange={() => {}} />
            <span className="rt-bs__radio is-on" aria-hidden="true" />
            <span className="rt-bs__name">{modeLabel(mode)}</span>
          </label>

          {isInHouse ? (
            <p className="rt-bs__quote">{QUOTE_TEXT}</p>
          ) : (
            <div className="rt-bs__price">
              <strong>{formatPrice(session.price)}</strong>
              {session.wasPrice > session.price && <s><span className="rt-cd__sr">was </span>{formatPrice(session.wasPrice)}</s>}
              {save > 0 && <span className="rt-bs__off">{save}% off</span>}
            </div>
          )}

          <ul className="rt-bs__info">
            {isInHouse ? (
              <>
                <li><Icon name="friend" /><span>{IN_HOUSE_NOTE}</span></li>
                <li><Icon name="calendar" /><span>{IN_HOUSE_LINE}</span></li>
              </>
            ) : onDemand ? (
              <>
                <li><Icon name="calendar" /><span>{session.time}</span></li>
                <li><Icon name="coupon" /><span>All inc</span></li>
              </>
            ) : (
              <>
                <li><Icon name="calendar" /><span>{formatDateRange(session.date, session.endDate)}</span></li>
                <li><Icon name="location" /><span>{session.location}</span></li>
                <li><Icon name="coupon" /><span>All inc</span></li>
              </>
            )}
          </ul>

          {!isInHouse && !onDemand ? (
            <p className="rt-bs__link"><Icon name="edit" /><button type="button" className="rt-cd__link rt-bs__change" onClick={openDates}>Change</button></p>
          ) : null}

          {isInHouse ? (
            <Link ref={cardButtonRef} href={quoteHref(course)} className="button -md -purple-1 text-white rt-btn-block">{TEAM.cta}</Link>
          ) : (
            <button
              ref={cardButtonRef}
              type="button"
              className={`button -md -purple-1 text-white rt-btn-block${status === "added" ? " is-added" : ""}`}
              onClick={addToBasket}
              disabled={status === "loading"}
              aria-busy={status === "loading"}
            >
              {label}
            </button>
          )}

          {trust.length > 0 && (
            <Fold hidden={compact} className="rt-bk__fold--trust">
              <ul className="rt-bs__trust">
                {trust.map((t) => (
                  <li key={t}><Check /> <span>{t}</span></li>
                ))}
              </ul>
            </Fold>
          )}
        </div>

        {others.map((m) => (
          <label key={m} className="rt-br">
            <input type="radio" name="rt-bk-mode" value={m} checked={false} onChange={() => setMode(m)} />
            <span className="rt-bs__radio" aria-hidden="true" />
            <span className="rt-br__text">
              <span className="rt-br__name">{modeLabel(m)}</span>
              <strong className="rt-br__from">{m === "inhouse" ? QUOTE_TEXT : `From ${formatPrice(fromFor(m))}`}</strong>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="rt-bf">
        <SaveButton />
      </div>
    </div>
  );
}
