import React from "react";
import { formatPrice, formatShortDate } from "@/lib/courses";

// "Training venues in {city}", on a course-in-a-city page: the venues the course runs at there, each with its postcode, its next
// date and the lowest price, in the page's definition list (.rt-cd__defs). The dates themselves are chosen in the booking card.
export default function VenuesSection({ city, venues, course }) {
  const n = venues.length;
  return (
    <section className="rt-cd__sec" id="venues" aria-labelledby="rt-cd-venues-h">
      <h2 id="rt-cd-venues-h">{city} training venues</h2>
      <div className="rt-cd__prose">
        <p>We run {course.title} at {n === 1 ? "one venue" : `${n} venues`}. Choose the venue that works best for your schedule when you book.</p>
      </div>
      <dl className="rt-cd__defs">
        {venues.map((v) => (
          <div key={`${v.name}|${v.postcode}`} className="rt-cd__def">
            <dt>{v.name}</dt>
            <dd>{v.postcode} · next date {formatShortDate(v.next)} · from {formatPrice(v.from)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
