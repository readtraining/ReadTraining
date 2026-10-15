"use client";

import React from "react";
import { pw } from "@/data/providerWorkspace";
import { DAY } from "@/lib/providerWorkspace";

// Performance: star ratings, the date ranges (pw.ranges) and the chart buckets.

// "4 out of 5 stars" as five stars; the number is read out, the icons are hidden.
export function Stars({ rating, large = false }) {
  const n = Math.round(rating);
  return (
    <span className={`rt-pws-stars${large ? " -lg" : ""}`} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={`icon-star${i <= n ? "" : " -off"}`} aria-hidden="true"></i>)}
    </span>
  );
}

export const isRange = (k) => pw.ranges.some((r) => r.key === k);

// The first moment of a range, in ms. "All time" starts at the earliest record given.
export function rangeStart(key, now = Date.now(), earliest = now) {
  const r = pw.ranges.find((x) => x.key === key);
  if (r?.days) return now - r.days * DAY;
  return Math.min(earliest, now);
}

// Buckets for a chart over a range: days for up to about two months, otherwise months.
export function buckets(start, now = Date.now()) {
  const out = [];
  const byDay = now - start <= 62 * DAY;
  const s = new Date(start);
  if (byDay) {
    let t = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
    while (t <= now) {
      out.push({ from: t, to: t + DAY, label: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(t)) });
      t += DAY;
    }
  } else {
    let y = s.getUTCFullYear();
    let m = s.getUTCMonth();
    for (;;) {
      const from = Date.UTC(y, m, 1);
      if (from > now) break;
      const to = Date.UTC(y, m + 1, 1);
      out.push({ from, to, label: new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(from)) });
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
  }
  return out;
}
