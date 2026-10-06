"use client";

import React, { useState } from "react";
import { useBooking } from "./BookingProvider";
import Stars from "./Stars";
import { formatNumber } from "@/lib/courses";

const fmtDate = (iso) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T00:00:00Z`));
const FIRST = 6;

// Reviews, as on the Hurak course page: course rating line, review cards (avatar, name, provider, stars, date, text)
// and "See more reviews". The text is optional: a rating on its own is shown as a card without a paragraph.
export default function ReviewsSection() {
  const { course } = useBooking();
  const [all, setAll] = useState(false);
  const shown = all ? course.reviews : course.reviews.slice(0, FIRST);

  if (!course.reviews.length) return null;
  return (
    <section className="rt-cd__sec" id="reviews" aria-labelledby="rt-cd-reviews-h">
      <h2 id="rt-cd-reviews-h">Hear from our past customers</h2>
      <p className="rt-cd__rline">
        <Stars rating={course.rating} size={18} />
        <strong>{course.rating.toFixed(1)}</strong> Course rating · {formatNumber(course.reviewCount)} ratings
      </p>

      <ul className="rt-cd__reviews">
        {shown.map((r) => (
          <li key={`${r.name}-${r.date}`} className="rt-cd__review">
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
          </li>
        ))}
      </ul>

      {course.reviews.length > FIRST && (
        <button type="button" className="rt-cd__link rt-cd__more" onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer reviews" : "See more reviews"}
        </button>
      )}
    </section>
  );
}
