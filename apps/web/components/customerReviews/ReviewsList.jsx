"use client";

import React, { useMemo, useState } from "react";
import { initials } from "@/components/marketing/parts";
import { EmptyState } from "@/components/states/States";
import ReviewStars from "./ReviewStars";
import SourceLink from "./SourceLink";

// One review card (.rt-review, in the reviews grid .rt-reviews__grid): the reviewer first (initials, name, the course the
// review names), their own stars and, when set, where it was first posted (a small link), then the full text with its line
// breaks.
export function ReviewCard({ review: r }) {
  return (
    <figure className="rt-review">
      <figcaption className="rt-review__who">
        <span className="rt-review__avatar" aria-hidden="true">{initials(r.name)}</span>
        <div>
          <div className="rt-review__name">{r.name}</div>
          {r.course && <div className="rt-review__course">{r.course}</div>}
        </div>
      </figcaption>
      <div className="rt-review__top">
        <ReviewStars rating={r.rating} />
        <SourceLink label={r.origin} href={r.originUrl} />
      </div>
      <blockquote className="rt-review__quote">{r.text}</blockquote>
    </figure>
  );
}

// The reviews, sorted by course (data/customerReviews.js), filterable by the course each names: the result page's filter pills
// (.rt-tr__filter, with a count each), shown once the reviews name at least one course and there are two groups or more (the
// reviews that name none are "General"). With no reviews, an honest empty state instead. `list` is { title, lead, source:
// { label, href } (the overall rating's), allLabel, generalLabel, empty: { title, text }, reviews: [{ id, name, rating, text,
// course, origin, originUrl }] }.
export default function ReviewsList({ list }) {
  const [group, setGroup] = useState("all");
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
              {list.source?.label && <> Source: <SourceLink label={list.source.label} href={list.source.href} className="rt-trust-source" />.</>}
            </p>
          )}
        </div>
        {filters && (
          <div className="rt-reviews__filters" role="group" aria-label="Filter reviews by course">
            {groups.map((s) => (
              <button key={s.key} type="button" className={`rt-tr__filter${group === s.key ? " is-on" : ""}`} aria-pressed={group === s.key} onClick={() => setGroup(s.key)}>
                {s.label}<span className="rt-tr__filter-n">{s.n}</span>
              </button>
            ))}
          </div>
        )}
        {list.reviews.length ? (
          <>
            <p className="rt-sr" aria-live="polite">{`${shown.length} ${shown.length === 1 ? "review" : "reviews"} shown`}</p>
            <ul className="rt-reviews__grid">
              {shown.map((r) => (
                <li key={r.id}>
                  <ReviewCard review={r} />
                </li>
              ))}
            </ul>
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
