"use client";

import React, { useRef, useState } from "react";
import { ReviewCard } from "@/components/customerReviews/ReviewsList";

// "Reviews of Read Training" on a course page: the published reviews that name this course's topic (lib/siteReviews.js
// reviewsForCourse), each with the reviewer's own stars, in the Customer reviews page's cards: the newest PAGE, then "Show more
// reviews" adds the next PAGE in place (as the Customer reviews page does), so they are all read here, without another page;
// once more than PAGE are open, "Show fewer" folds them back and returns to the section's heading.
// A long review is cut to six lines with Read more (ReviewCard `clamp`), so the cards in a row stay close in height. A course
// page can list dates from several providers, so the heading says whose reviews they are. Left out when no review names the
// course. `course` is the topic's name.
const PAGE = 4;

export default function CourseReviews({ reviews, course }) {
  const [count, setCount] = useState(PAGE);
  const ref = useRef(null);
  if (!reviews?.length) return null;
  const left = reviews.length - count;
  const fewer = () => {
    setCount(PAGE);
    ref.current?.scrollIntoView({ block: "start" });
  };
  return (
    <section className="rt-cd__sec" id="course-reviews" aria-labelledby="rt-cd-reviews-h" ref={ref}>
      <h2 id="rt-cd-reviews-h">Reviews of Read Training</h2>
      <p className="rt-cd__lead">What learners said about their {course} training with us, in their own words.</p>
      <ul className={`rt-reviews__grid rt-cd__reviews${reviews.length === 1 ? " -one" : ""}`}>
        {reviews.slice(0, count).map((r) => (
          <li key={r.id}>
            <ReviewCard review={r} clamp />
          </li>
        ))}
      </ul>
      {left > 0 ? (
        <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setCount((n) => n + PAGE)}>
          Show more reviews <span className="rt-reviews__more-n">({left} more)</span>
        </button>
      ) : (
        count > PAGE && (
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={fewer}>
            Show fewer reviews
          </button>
        )
      )}
    </section>
  );
}
