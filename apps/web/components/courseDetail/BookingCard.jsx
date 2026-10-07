"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { IN_HOUSE_NOTE, MODE_LABEL, quoteHref, useBooking } from "./BookingProvider";
import { toItem, trackEvent } from "@/lib/analytics";
import { formatDateRange, formatPrice, savePercent } from "@/lib/courses";

const Check = () => (
  <svg className="rt-cd__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L20 7" />
  </svg>
);

// 16px line icons for the info lines (decoration only).
const I = {
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  pin: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>,
  tag: <><path d="M20 12l-8 8-9-9V3h8z" /><circle cx="7.5" cy="7.5" r="1.2" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  team: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.4c2.2.7 3.5 2.6 3.5 5.6" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />,
};
const Icon = ({ name, size = 16, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[name]}</svg>
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

// Same storage as the heart on the listing cards, so a course saved there shows as saved here.
const WISHLIST_KEY = "rt-course-wishlist";
const readWishlist = () => {
  try {
    return JSON.parse(window.localStorage.getItem(WISHLIST_KEY) || "[]");
  } catch {
    return [];
  }
};

function SaveButton() {
  const { course, notify } = useBooking();
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(readWishlist().includes(course.id)), [course.id]);
  const toggle = () => {
    const list = readWishlist();
    const saving = !list.includes(course.id);
    setSaved(saving);
    try {
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(saving ? [...list, course.id] : list.filter((id) => id !== course.id)));
      notify(saving ? "Saved to your list" : "Removed from your list");
      if (saving) trackEvent("add_to_wishlist", { items: [toItem(course)] });
    } catch {
      setSaved(!saving);
      notify("We could not update your list. Please try again.");
    }
  };
  return (
    <button type="button" className={`rt-bf__btn${saved ? " is-saved" : ""}`} aria-pressed={saved} aria-label={saved ? "Saved" : "Save"} title={saved ? "Saved" : "Save"} onClick={toggle}>
      <Icon name="heart" size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

// Share: the phone/OS share sheet where there is one, otherwise the link is copied. The shared link keeps the chosen option.
function ShareButton() {
  const { course, notify } = useBooking();
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: course.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      notify("Link copied");
    } catch (e) {
      if (e?.name !== "AbortError") notify("We could not share this course. Please copy the link from the address bar.");
    }
  };
  return (
    <button type="button" className="rt-bf__btn" aria-label="Share this course" title="Share" onClick={share}>
      <Icon name="share" size={18} />
    </button>
  );
}

const QUOTE_TEXT = "Contact us for a quote";
const IN_HOUSE_LINE = "In-house training is arranged on a date and at a place that suit your team. Choose Get a quote and we will confirm availability.";

// The booking card. SELECTED option on top (radio, price, info lines, link, button, trust items), then one row for every other
// option the course offers (choosing a row selects it everywhere), then a grey footer with Save.
// FULL (title visible): course image first, trust items under the button. COMPACT (desktop, title out of view): the image and
// the trust items collapse; everything else stays. Tablet and mobile: always FULL.
export default function BookingCard() {
  const { course, modes, mode, isInHouse, setMode, session, status, addToBasket, cardButtonRef, barOn, flash, openDates } = useBooking();
  const [desktop, setDesktop] = useState(false);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
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
            <span className="rt-bs__name">{MODE_LABEL[mode]}</span>
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
                <li><Icon name="team" /><span>{IN_HOUSE_NOTE}</span></li>
                <li><Icon name="calendar" /><span>{IN_HOUSE_LINE}</span></li>
              </>
            ) : onDemand ? (
              <>
                <li><Icon name="calendar" /><span>{session.time}</span></li>
                <li><Icon name="user" /><span>{session.provider}</span></li>
                <li><Icon name="tag" /><span>All inc</span></li>
              </>
            ) : (
              <>
                <li><Icon name="calendar" /><span>{formatDateRange(session.date, session.endDate)}</span></li>
                <li><Icon name="pin" /><span>{session.location}, {session.provider}</span></li>
                <li><Icon name="tag" /><span>All inc</span></li>
              </>
            )}
          </ul>

          {isInHouse ? (
            <p className="rt-bs__link"><Icon name="info" /><Link href={quoteHref(course)} className="rt-cd__link">Booking for a team? Get a group quote</Link></p>
          ) : !onDemand ? (
            <p className="rt-bs__link"><Icon name="info" /><button type="button" className="rt-cd__link rt-bs__change" onClick={openDates}>Change</button></p>
          ) : null}

          {isInHouse ? (
            <Link ref={cardButtonRef} href={quoteHref(course)} className="rt-cd__btn">Get a quote</Link>
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
              <span className="rt-br__name">{MODE_LABEL[m]}</span>
              <strong className="rt-br__from">{m === "inhouse" ? QUOTE_TEXT : `From ${formatPrice(fromFor(m))}`}</strong>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="rt-bf">
        <ShareButton />
        <SaveButton />
      </div>
    </div>
  );
}
