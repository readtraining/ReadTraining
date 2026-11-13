"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { initials } from "@/components/marketing/parts";
import { EmptyState } from "@/components/states/States";
import ReviewStars from "./ReviewStars";
import SourceLabel from "./SourceLabel";

// One review card (.rt-review, in the reviews grid .rt-reviews__grid): the reviewer first (initials, name, the course the
// review names), their own stars and, when set, where it was first posted (as text), then the full text with its line
// breaks. `clamp`: a long text is cut to six lines with "Read more" under it (it opens in the card), so one long review doesn't
// stretch its row of cards; the button shows only when the text is really cut. `meta`: what goes under the name, the course the
// review names (the reviews page) or when it was written (a course page, where the course is the page itself).

// a name typed all in capitals ("RAJA SEKHAR REDDY") shown in normal case; any other name exactly as written
const displayName = (name) =>
  name && name === name.toUpperCase() && /[A-Z]{2}/.test(name) ? name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase()) : name;
// the month it was written ("November 2026"), "About November 2026" when the day isn't known exactly; nothing when unknown
const monthOf = (r) => {
  if (!r.date) return null;
  const month = new Date(`${r.date}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return r.dateIsApproximate ? `About ${month}` : month;
};

function Quote({ text, clamp }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);
  useEffect(() => {
    if (!clamp) return;
    const el = ref.current;
    const check = () => el && setCut(el.scrollHeight > el.clientHeight + 1);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text, clamp]);
  return (
    <>
      <blockquote ref={ref} className={`rt-review__quote${clamp && !open ? " -clamp" : ""}`}>{text}</blockquote>
      {clamp && (cut || open) && (
        <button type="button" className="rt-review__more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </>
  );
}

export function ReviewCard({ review: r, clamp = false, meta = "course" }) {
  const name = displayName(r.name);
  const under = meta === "date" ? monthOf(r) : r.course;
  return (
    <figure className="rt-review">
      <figcaption className="rt-review__who">
        <span className="rt-review__avatar" aria-hidden="true">{initials(name)}</span>
        <div>
          <div className="rt-review__name">{name}</div>
          {under && <div className="rt-review__course">{meta === "date" && r.date ? <time dateTime={r.date}>{under}</time> : under}</div>}
        </div>
      </figcaption>
      <div className="rt-review__top">
        <ReviewStars rating={r.rating} />
        <SourceLabel label={r.origin} />
      </div>
      <Quote text={r.text} clamp={clamp} />
    </figure>
  );
}

// The reviews, sorted by course (data/customerReviews.js), filterable by the course each names: the result page's filter pills
// (.rt-tr__filter, with a count each), shown once the reviews name at least one course and there are two groups or more (the
// reviews that name none are "General"). They show a page at a time (PAGE), with "Show more reviews" for the next. With no
// reviews, an honest empty state instead. `list` is { title, lead, source:
// { label, href } (the overall rating's), allLabel, generalLabel, empty: { title, text }, reviews: [{ id, name, rating, text,
// course, origin, originUrl }] }.
const PAGE = 12;

export default function ReviewsList({ list }) {
  // a course page links here with ?course=<its name>: start on that course when the reviews have it
  const [group, setGroup] = useState(() => (list.initial && list.reviews.some((r) => r.course === list.initial) ? list.initial : "all"));
  const [count, setCount] = useState(PAGE);
  const pick = (key) => {
    setGroup(key);
    setCount(PAGE);
  };
  const groupOf = (r) => r.course || list.generalLabel;
  const groups = useMemo(() => {
    const counts = new Map();
    for (const r of list.reviews) counts.set(groupOf(r), (counts.get(groupOf(r)) || 0) + 1);
    return [{ key: "all", label: list.allLabel, n: list.reviews.length }, ...[...counts].map(([k, n]) => ({ key: k, label: k, n }))];
  }, [list]); // eslint-disable-line react-hooks/exhaustive-deps
  const filters = groups.length > 2 && list.reviews.some((r) => r.course);
  const shown = group === "all" ? list.reviews : list.reviews.filter((r) => groupOf(r) === group);

  return (
    <section className="fb-section -lavender" aria-labelledby="rt-reviews-list-h">
      <div className="container">
        <div className="fb-head -center">
          <h2 className="fb-title" id="rt-reviews-list-h">{list.title}</h2>
          {list.lead && (
            <p className="fb-lede">
              {list.lead}
              {list.source?.label && <> Rating from <SourceLabel label={list.source.label} className="rt-trust-source" />.</>}
            </p>
          )}
        </div>
        {filters && (
          <div className="rt-reviews__filters" role="group" aria-label="Filter reviews by course">
            {groups.map((s) => (
              <button key={s.key} type="button" className={`rt-tr__filter${group === s.key ? " is-on" : ""}`} aria-pressed={group === s.key} onClick={() => pick(s.key)}>
                {s.label}<span className="rt-tr__filter-n">{s.n}</span>
              </button>
            ))}
          </div>
        )}
        {list.reviews.length ? (
          <>
            <p className="rt-sr" aria-live="polite">{`${Math.min(count, shown.length)} of ${shown.length} ${shown.length === 1 ? "review" : "reviews"} shown`}</p>
            <ul className="rt-reviews__grid">
              {shown.slice(0, count).map((r) => (
                <li key={r.id}>
                  <ReviewCard review={r} />
                </li>
              ))}
            </ul>
            {shown.length > count && (
              <div className="rt-reviews__more">
                <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setCount((n) => n + PAGE)}>
                  Show more reviews <span className="rt-reviews__more-n">{`(${shown.length - count} more)`}</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rt-reviews__empty">
            <EmptyState icon="icon-star" title={list.empty.title} text={list.empty.text} />
          </div>
        )}
      </div>
    </section>
  );
}
