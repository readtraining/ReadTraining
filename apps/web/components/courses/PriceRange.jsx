"use client";

import React, { useEffect, useRef, useState } from "react";
import { PRICE_BOUNDS, PRICE_STEP, priceBands } from "@/data/courseCatalogue";
import { RadioRow } from "./RadioRow";

// Price stays single-select: radio bands (Any price, Under £50, £50 to £200, Over £200) plus a custom Min / Max range.
// Bands and the custom range cancel each other: choosing a band overwrites min/max, typing a range selects "Any price".
export default function PriceRange({ min, max, onChange }) {
  const [draft, setDraft] = useState({ min: String(min), max: String(max) });
  const timer = useRef(null);

  useEffect(() => setDraft({ min: String(min), max: String(max) }), [min, max]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const bands = priceBands; // Any price, Under £50, £50 to £200, Over £200
  const matched = bands.findIndex((b) => b.min === min && b.max === max);
  const checkedBand = matched === -1 ? 0 : matched; // a custom range shows "Any price"

  const pickBand = (band) => {
    clearTimeout(timer.current);
    setDraft({ min: String(band.min), max: String(band.max) });
    onChange(band.min, band.max);
  };

  // Typing a custom range is debounced 500ms.
  const typed = (field, raw) => {
    const next = { ...draft, [field]: raw };
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const clamp = (v, fallback) => (Number.isFinite(v) ? Math.min(Math.max(v, PRICE_BOUNDS.min), PRICE_BOUNDS.max) : fallback);
      let lo = clamp(parseFloat(next.min), PRICE_BOUNDS.min);
      let hi = clamp(parseFloat(next.max), PRICE_BOUNDS.max);
      if (lo > hi) [lo, hi] = [hi, lo];
      onChange(lo, hi);
    }, 500);
  };

  return (
    <div className="rt-fp__price">
      <div className="rt-fp__options">
        {bands.map((band, i) => (
          <RadioRow
            key={band.value}
            name="rt-price"
            opt={{ value: band.value, label: band.label }}
            checked={checkedBand === i}
            onChange={() => pickBand(band)}
          />
        ))}
      </div>
      <p className="rt-fp__subtitle">Custom range</p>
      <div className="rt-fp__range">
        <label>
          <span className="rt-sr">Minimum price in pounds</span>
          <span aria-hidden="true">£</span>
          <input type="number" inputMode="numeric" min={PRICE_BOUNDS.min} max={PRICE_BOUNDS.max} step={PRICE_STEP} placeholder="Min" value={draft.min === String(PRICE_BOUNDS.min) ? "" : draft.min} onChange={(e) => typed("min", e.target.value)} />
        </label>
        <label>
          <span className="rt-sr">Maximum price in pounds</span>
          <span aria-hidden="true">£</span>
          <input type="number" inputMode="numeric" min={PRICE_BOUNDS.min} max={PRICE_BOUNDS.max} step={PRICE_STEP} placeholder="Max" value={draft.max === String(PRICE_BOUNDS.max) ? "" : draft.max} onChange={(e) => typed("max", e.target.value)} />
        </label>
      </div>
    </div>
  );
}
