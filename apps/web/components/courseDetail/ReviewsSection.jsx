"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useBooking } from "./BookingProvider";
import Stars from "@/components/home/HomeStars";
import { formatNumber } from "@/lib/format";
import { Icon } from "./Icon";
import { initials } from "@/components/marketing/parts";

const fmtDate = (iso) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T00:00:00Z`));
const FIRST = 6;
const keyOf = (r) => `${r.name}-${r.date}`;

// Review text shows 4 lines (as on home); longer text gets a "More" text button that opens the whole review ("Less" closes it).
function ReviewBody({ text }) {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (!open && el.clientHeight > 0) setLong(el.scrollHeight > el.clientHeight + 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, text]);
  return (
    <>
      <p ref={ref} id={id} className={`rt-review__quote${open ? " is-open" : ""}`}>{text}</p>
      {(long || open) && (
        <button type="button" className="rt-cd__link rt-review__more" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>{open ? "Less" : "More"}</button>
      )}
    </>
  );
}

// Home's review card (.rt-review): stars and date on top, the review, then who wrote it, with the Helpful button on that row.
function ReviewCard({ r, helpful, toggle, wide }) {
  const on = Boolean(helpful[keyOf(r)]);
  return (
    <li className={wide ? "col-12" : "col-md-6"}>
      <article className="rt-review">
        <div className="rt-review__top">
          <Stars rating={r.rating} size="md" />
          <span className="rt-cd__sr">{r.rating} out of 5 stars</span>
          <time className="rt-review__source" dateTime={r.date}>{fmtDate(r.date)}</time>
        </div>
        <div className="rt-review__body">
          {r.title && <h3 className="rt-review__title">{r.title}</h3>}
          {r.body && <ReviewBody text={r.body} />}
        </div>
        <div className="rt-review__who">
          <span className="rt-review__avatar" aria-hidden="true">{initials(r.name).slice(0, 2)}</span>
          <div>
            <div className="rt-review__name">{r.name}</div>
            {r.org && <div className="rt-review__course">{r.org}</div>}
          </div>
          {typeof r.helpfulCount === "number" && (
            <button type="button" className={`button -sm ${on ? "-purple-1 text-white" : "-outline-purple-1 text-purple-1"} rt-review__helpful`} aria-pressed={on} onClick={() => toggle(keyOf(r))}>
              Helpful ({r.helpfulCount + (on ? 1 : 0)})
            </button>
          )}
        </div>
      </article>
    </li>
  );
}

// Reviews: two-column cards (home's review card), helpful buttons (only where a review has a helpful count), and "See all reviews", which opens a
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

  // Only ratings that have at least one written review can be filtered on (the bars show every rating, written or not).
  const written = useMemo(() => course.reviews.reduce((o, r) => ({ ...o, [r.rating]: (o[r.rating] || 0) + 1 }), {}), [course.reviews]);

  if (!course.reviews.length) return null;
  const summary = (
    <p className="rt-cd__rline">
      <Stars rating={course.rating} size="lg" />
      <strong>{course.rating.toFixed(1)}</strong> Course rating · {formatNumber(course.reviewCount)} ratings
    </p>
  );

  return (
    <section className="rt-cd__sec" id="reviews" aria-labelledby="rt-cd-reviews-h">
      <h2 id="rt-cd-reviews-h">Hear from our past customers</h2>
      {summary}

      <ul className="row y-gap-20 rt-cd__rlist">
        {course.reviews.slice(0, FIRST).map((r) => <ReviewCard key={keyOf(r)} r={r} helpful={helpful} toggle={toggle} />)}
      </ul>

      <button type="button" className="button -md -outline-purple-1 text-purple-1 rt-cd__more" onClick={() => setOpen(true)}>See all reviews</button>

      <dialog ref={dialogRef} className="rt-cd__dialog rt-cd__dialog--wide" aria-labelledby="rt-cd-allrev-h" onClose={() => setOpen(false)}>
        <div className="rt-cd__dialog-head">
          <h2 id="rt-cd-allrev-h">Hear from our past customers</h2>
          <button type="button" className="rt-icon-btn rt-cd__x" aria-label="Close" onClick={() => setOpen(false)}><Icon name="close" /></button>
        </div>
        {summary}

        <ul className="rt-cd__bars" aria-label="Filter by rating">
          {[5, 4, 3, 2, 1].map((n) => (
            <li key={n}>
              <button type="button" aria-pressed={stars === n} disabled={!written[n]} title={written[n] ? undefined : "No written reviews for this rating"} onClick={() => setStars(stars === n ? 0 : n)}>
                <span>{n} star{n > 1 ? "s" : ""}</span>
                <span className="rt-cd__bar-track"><span className="rt-cd__bar-fill" style={{ width: `${course.ratingBreakdown[n]}%` }} /></span>
                <span className="rt-cd__bar-pct">{course.ratingBreakdown[n]}%</span>
              </button>
            </li>
          ))}
        </ul>

        <label className="rt-field rt-cd__rsearch">
          <input type="search" placeholder="Search reviews" aria-label="Search reviews" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>

        <p className="rt-cd__rcount" aria-live="polite">Showing {filtered.length} written {filtered.length === 1 ? "review" : "reviews"} of {formatNumber(course.reviewCount)} ratings</p>

        {filtered.length === 0 ? (
          <p className="rt-cd__empty">No reviews match.</p>
        ) : (
          <ul className="row y-gap-20 rt-cd__rlist">
            {filtered.map((r) => <ReviewCard key={keyOf(r)} r={r} helpful={helpful} toggle={toggle} wide />)}
          </ul>
        )}
      </dialog>
    </section>
  );
}
