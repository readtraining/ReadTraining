"use client";

import React from "react";
import { Check } from "./Icon";
import { useBooking } from "./BookingProvider";
import { formatPrice } from "@/lib/format";

// The client's packages for the course (data/courseGuides.js), shown like the learning options' cards above (.rt-lc): what each
// includes and its starting price (the course's lowest live price plus its `add`). Information only: the package is chosen when a
// date is booked (Book now on a date, then "Choose your package", as Hurak's).
export default function PackagePicker({ packages }) {
  const { course } = useBooking();
  if (!packages?.items?.length) return null;
  const from = (p) => (course.price != null ? course.price + (p.add ?? 0) : null);
  return (
    <section className="rt-cd__sec rt-lo" id="packages" aria-labelledby="rt-cg-pkg-h">
      <h2 id="rt-cg-pkg-h">{packages.title}</h2>
      {packages.intro && <p className="rt-cd__lead">{packages.intro}</p>}
      <ul className={`rt-lc -n${packages.items.length} rt-cg__pkgs`}>
        {packages.items.map((p) => (
          <li key={p.key} className="rt-lc__card rt-cg__pkg">
            <span className="rt-lc__top">{p.badge && <span className="rt-pill -accent">{p.badge}</span>}</span>
            <div>
              <h3 className="rt-lc__name">{p.name}</h3>
              <p className="rt-cg__pkg-text">{p.text}</p>
            </div>
            <ul className="rt-lc__list">{p.points.map((x) => <li key={x}><Check /> <span>{x}</span></li>)}</ul>
            <span className="rt-lc__price">
              {from(p) != null && <><span>From</span> <strong>{formatPrice(from(p))}</strong></>}
            </span>
          </li>
        ))}
      </ul>
      {packages.note && <p className="rt-cd__lead rt-cg__note">{packages.note}</p>}
    </section>
  );
}
