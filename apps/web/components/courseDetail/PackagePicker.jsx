"use client";

import React from "react";
import { Check } from "./Icon";
import { useBooking } from "./BookingProvider";
import { formatPrice } from "@/lib/format";

// The packages (data/courseGuides.js), chosen like the learning options' cards above (.rt-lc): the whole card picks the package
// and the radio inside is what keyboards and screen readers use. The choice goes to the booking card, the mobile buy bar and the
// basket (BookingProvider `bundle`): each package is the chosen date plus its `add`. A card's "From" price is the course's lowest
// live price plus that.
export default function PackagePicker({ packages }) {
  const { course, bundle, selectBundle } = useBooking();
  if (!packages?.items?.length) return null;
  const from = (p) => (course.price != null ? course.price + (p.add ?? 0) : null);
  return (
    <section className="rt-cd__sec rt-lo" id="packages" aria-labelledby="rt-cg-pkg-h">
      <h2 id="rt-cg-pkg-h">{packages.title}</h2>
      {packages.intro && <p className="rt-cd__lead">{packages.intro}</p>}
      <fieldset className="rt-lc__fs">
        <legend className="rt-cd__sr">Choose a package</legend>
        <div className={`rt-lc -n${packages.items.length} rt-cg__pkgs`} role="radiogroup" aria-label="Choose a package">
          {packages.items.map((p) => {
            const on = bundle?.key === p.key;
            return (
              <div key={p.key} className={`rt-lc__card rt-cg__pkg${on ? " is-selected" : ""}`} onClick={() => selectBundle(p.key)}>
                <input type="radio" name="rt-cg-pkg" value={p.key} checked={on} onChange={() => selectBundle(p.key)} aria-labelledby={`rt-cg-pkg-${p.key}`} aria-describedby={`rt-cg-pkg-${p.key}-d`} />
                <span className="rt-lc__top">{p.badge && <span className="rt-pill -accent">{p.badge}</span>}</span>
                <div>
                  <h3 className="rt-lc__name" id={`rt-cg-pkg-${p.key}`}>{p.name}</h3>
                  <p className="rt-cg__pkg-text" id={`rt-cg-pkg-${p.key}-d`}>{p.text}</p>
                </div>
                <ul className="rt-lc__list">{p.points.map((x) => <li key={x}><Check /> <span>{x}</span></li>)}</ul>
                <span className="rt-lc__price">
                  {from(p) != null && <><span>From</span> <strong>{formatPrice(from(p))}</strong></>}
                </span>
              </div>
            );
          })}
        </div>
      </fieldset>
      {packages.note && <p className="rt-cd__lead rt-cg__note">{packages.note}</p>}
    </section>
  );
}
