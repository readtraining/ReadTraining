"use client";

import React, { useMemo, useState } from "react";
import { initials } from "@/components/marketing/parts";

// The reviews, filterable by subject: the result page's filter pills (.rt-tr__filter, with a count each) above the home page's
// review cards (.rt-review). Here the reviewer comes first (initials, name, course and place, as the home card's foot), then the
// full text, and each card is as tall as its review. No star rating or source is shown: the testimonials have neither. `list` is { title, allLabel, reviews: [{ id, name, course, place, subject, text }] }.
export default function ReviewsList({ list }) {
  const [subject, setSubject] = useState("all");
  const subjects = useMemo(() => {
    const counts = list.reviews.reduce((o, r) => ({ ...o, [r.subject]: (o[r.subject] || 0) + 1 }), {});
    return [{ key: "all", label: list.allLabel, n: list.reviews.length }, ...Object.entries(counts).map(([k, n]) => ({ key: k, label: k, n }))];
  }, [list]);
  const shown = subject === "all" ? list.reviews : list.reviews.filter((r) => r.subject === subject);

  return (
    <section className="fb-section -lavender" aria-labelledby="rt-reviews-list-h">
      <div className="container">
        <div className="fb-head -center">
          <h2 className="fb-title" id="rt-reviews-list-h">{list.title}</h2>
        </div>
        <div className="rt-reviews__filters" role="group" aria-label="Filter reviews by subject">
          {subjects.map((s) => (
            <button key={s.key} type="button" className={`rt-tr__filter${subject === s.key ? " is-on" : ""}`} aria-pressed={subject === s.key} onClick={() => setSubject(s.key)}>
              {s.label}<span className="rt-tr__filter-n">{s.n}</span>
            </button>
          ))}
        </div>
        <p className="rt-sr" aria-live="polite">{`${shown.length} ${shown.length === 1 ? "review" : "reviews"} shown`}</p>
        <ul className="rt-reviews__grid">
          {shown.map((r) => (
            <li key={r.id}>
              <figure className="rt-review">
                <figcaption className="rt-review__who">
                  <span className="rt-review__avatar" aria-hidden="true">{initials(r.name)}</span>
                  <div>
                    <div className="rt-review__name">{r.name}</div>
                    <div className="rt-review__course">{[r.course, r.place].filter(Boolean).join(" · ")}</div>
                  </div>
                </figcaption>
                <blockquote className="rt-review__quote">{r.text}</blockquote>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
