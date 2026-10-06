"use client";

import React from "react";
import Link from "next/link";
import { QUOTE_HREF, useBooking } from "./BookingProvider";
import { trustItems } from "./BookingCard";
import { formatPrice } from "@/lib/courses";

const Check = () => (
  <svg className="rt-cd__check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L20 7" />
  </svg>
);

// Everything that used to sit inside the booking card (trust list, group quote link, staff training box, exam prep links).
// The same content, moved under the learning options so the card can stay compact.
export default function OptionsExtras() {
  const { course, isInHouse } = useBooking();
  const trust = trustItems(course);
  const extras = (course.extras || []).slice(0, 2);

  return (
    <div className="rt-cd__xtra">
      {trust.length > 0 && (
        <ul className="rt-cd__included">
          {trust.map((t) => (
            <li key={t}><Check /> {t}</li>
          ))}
        </ul>
      )}

      {!isInHouse && <Link href={QUOTE_HREF} className="rt-cd__team">Booking for a team? Get a group quote</Link>}

      <div className="rt-cd__xtra-row">
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
    </div>
  );
}
