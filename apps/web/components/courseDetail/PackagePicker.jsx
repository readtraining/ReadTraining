"use client";

import React from "react";
import { Check } from "./Icon";
import { useBooking } from "./BookingProvider";
import { formatPrice } from "@/lib/format";

// The client's packages for the course (data/courseGuides.js), side by side (three across when they fit, one under another on
// phones): each one's name and who it suits, its starting price near the top ("From", the course's lowest live price plus the
// package's `add`; the course-only package keeps that date's was-price and saving) and what it includes. Information only: the
// package is chosen in booking, after the date. "Most popular" is a badge on its card's border.
export default function PackagePicker({ packages }) {
  const { course } = useBooking();
  if (!packages?.items?.length) return null;
  // the cheapest date: its price is every package's starting point, and its was-price the course-only package's
  const dated = course.sessions.filter((s) => s.mode === "classroom" || s.mode === "online");
  const low = dated.reduce((a, b) => (!a || b.price < a.price ? b : a), null);
  return (
    <section className="rt-cd__sec rt-lo" id="packages" aria-labelledby="rt-cg-pkg-h">
      <h2 id="rt-cg-pkg-h">{packages.title}</h2>
      {packages.intro && <p className="rt-cd__lead">{packages.intro}</p>}
      <ul className={`rt-pkgs -n${packages.items.length}`}>
        {packages.items.map((p) => {
          const price = low ? low.price + (p.add ?? 0) : null;
          const was = low && !p.add && low.wasPrice > low.price ? low.wasPrice : null;
          return (
            <li key={p.key} className={`rt-pkg${p.badge ? " -popular" : ""}`}>
              {p.badge && <span className="rt-pkg__badge">{p.badge}</span>}
              <div className="rt-pkg__head">
                <h3 className="rt-pkg__name">{p.name}</h3>
                <p className="rt-pkg__for">{p.text}</p>
              </div>
              {price != null ? (
                <p className="rt-pkg__price">
                  <span>From</span>
                  <strong>{formatPrice(price)}</strong>
                  {was && <small><s><span className="rt-cd__sr">was </span>{formatPrice(was)}</s> · Save {formatPrice(was - price)}</small>}
                </p>
              ) : <span />}
              <ul className="rt-pkg__list">{p.points.map((x) => <li key={x}><Check /> <span>{x}</span></li>)}</ul>
            </li>
          );
        })}
      </ul>
      {packages.note && <p className="rt-cd__lead rt-cg__note">{packages.note}</p>}
    </section>
  );
}
