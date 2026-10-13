import React from "react";
import ProviderCourseCard from "./ProviderCourseCard";

// "Our courses": the centred section head (.fb-head -center) and the provider's courses as cards, three to a row.
export default function ProviderCourses({ courses, copy, text }) {
  return (
    <section id="rt-prov-courses" className="fb-section -lavender" aria-labelledby="rt-prov-courses-h">
      <div className="container">
        <div className="fb-head -center">
          <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{copy.eyebrow}</div>
          <h2 className="fb-title" id="rt-prov-courses-h">{copy.title}</h2>
          <p className="fb-lede">{text}</p>
        </div>
        <ul className="rt-prov__grid rt-prov__grid--courses">
          {courses.map((c) => (
            <li key={c.id}>
              <ProviderCourseCard course={c} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
