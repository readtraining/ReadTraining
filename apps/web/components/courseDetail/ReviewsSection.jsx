"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useBooking } from "./BookingProvider";
import Stars from "./Stars";
import { formatNumber } from "@/lib/courses";

const fmtDate = (iso) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T00:00:00Z`));
const FIRST = 6;
const keyOf = (r) => `${r.name}-${r.date}`;

function ReviewCard({ r, helpful, toggle }) {
  const on = Boolean(helpful[keyOf(r)]);
  return (
    <li className="rt-cd__review">
      <div className="rt-cd__review-head">
        <span className="rt-cd__avatar" aria-hidden="true">{r.name[0]}</span>
        <div>
          <strong>{r.name}</strong>
          {r.org && <span className="rt-cd__org">{r.org}</span>}
          <div className="rt-cd__review-meta">
            <Stars rating={r.rating} size={14} />
            <span className="rt-cd__sr">{r.rating} out of 5 stars</span>
            <time dateTime={r.date}>{fmtDate(r.date)}</time>
          </div>
        </div>
      </div>
      {r.title && <h3 className="rt-cd__review-title">{r.title}</h3>}
      {r.body && <p>{r.body}</p>}
      {typeof r.helpfulCount === "number" && (
        <button type="button" className="rt-cd__helpful" aria-pressed={on} onClick={() => toggle(keyOf(r))}>
          Helpful ({r.helpfulCount + (on ? 1 : 0)})
        </button>
      )}
    </li>
  );
}

// Reviews: two-column cards, helpful buttons (only where a review has a helpful count), and "See all reviews", which opens a
// dialog with a star filter and a search box.
export default function ReviewsSection() {
  const { course } = useBooking();
  const [helpful, setHelpful] = useState({});
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [query, setQuery] = useState("");
  const dialogRef = useRef(null);
  const toggle = (k) => setHelpful((h) => ({ ...h, [k]: !h[k] }));

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return course.reviews.filter((r) => (!stars || r.rating === stars) && (!q || `${r.name} ${r.title || ""} ${r.body || ""}`.toLowerCase().includes(q)));
  }, [course.reviews, stars, query]);

  if (!course.reviews.length) return null;
  const summary = (
    <p className="rt-cd__rline">
      <Stars rating={course.rating} size={18} />
      <strong>{course.rating.toFixed(1)}</strong> Course rating · {formatNumber(course.reviewCount)} ratings
    </p>
  );

  return (
    <section className="rt-cd__sec" id="reviews" aria-labelledby="rt-cd-reviews-h">
      <h2 id="rt-cd-reviews-h">Hear from our past customers</h2>
      {summary}

      <ul className="rt-cd__reviews">
        {course.reviews.slice(0, FIRST).map((r) => <ReviewCard key={keyOf(r)} r={r} helpful={helpful} toggle={toggle} />)}
      </ul>

      <button type="button" className="rt-cd__ghost rt-cd__more" onClick={() => setOpen(true)}>See all reviews</button>

      <dialog ref={dialogRef} className="rt-cd__dialog rt-cd__dialog--wide" aria-labelledby="rt-cd-allrev-h" onClose={() => setOpen(false)}>
        <div className="rt-cd__dialog-head">
          <h2 id="rt-cd-allrev-h">Hear from our past customers</h2>
          <button type="button" className="rt-cd__x" aria-label="Close" onClick={() => setOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {summary}

        <ul className="rt-cd__bars" aria-label="Filter by rating">
          {[5, 4, 3, 2, 1].map((n) => (
            <li key={n}>
              <button type="button" aria-pressed={stars === n} onClick={() => setStars(stars === n ? 0 : n)}>
                <span>{n} star{n > 1 ? "s" : ""}</span>
                <span className="rt-cd__bar-track"><span className="rt-cd__bar-fill" style={{ width: `${course.ratingBreakdown[n]}%` }} /></span>
                <span className="rt-cd__bar-pct">{course.ratingBreakdown[n]}%</span>
              </button>
            </li>
          ))}
        </ul>

        <input type="search" className="rt-cd__input" placeholder="Search reviews" aria-label="Search reviews" value={query} onChange={(e) => setQuery(e.target.value)} />

        {filtered.length === 0 ? (
          <p className="rt-cd__empty">No reviews match.</p>
        ) : (
          <ul className="rt-cd__reviews rt-cd__reviews--dlg">
            {filtered.map((r) => <ReviewCard key={keyOf(r)} r={r} helpful={helpful} toggle={toggle} />)}
          </ul>
        )}
      </dialog>
    </section>
  );
}
