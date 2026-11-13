"use client";

import React, { useRef, useState } from "react";
import { ReviewCard } from "@/components/customerReviews/ReviewsList";
import { trustFigures } from "@/lib/siteContent";
import RatingStars from "./RatingStars";

// "Reviews of Read Training" on a course page: the published reviews that name this course's topic (lib/siteReviews.js
// reviewsForCourse), each with the reviewer's own stars, in the Customer reviews page's cards: the newest PAGE, then "Show more
// reviews" adds the next PAGE in place (as the Customer reviews page does), so they are all read here, without another page;
// once more than PAGE are open, "Show fewer" folds them back and returns to the section's heading.
// A long review is cut to six lines with Read more (ReviewCard `clamp`), so the cards in a row stay close in height. A course
// page can list dates from several providers, so the heading says whose reviews they are. It opens on Read Training's rating
// (the site's trust numbers, the same as the hero's), so the count there and the selection here don't read as a mismatch; each
// card says when it was written (the course is the page itself). Left out when no review names the course. `course` is the
// topic's name.
const PAGE = 4;

export default function CourseReviews({ reviews, course }) {
  const [count, setCount] = useState(PAGE);
  const ref = useRef(null);
  if (!reviews?.length) return null;
  const left = reviews.length - count;
  const trust = trustFigures();
  const fewer = () => {
    setCount(PAGE);
    ref.current?.scrollIntoView({ block: "start" });
  };
  return (
    <section className="rt-cd__sec" id="course-reviews" aria-labelledby="rt-cd-reviews-h" ref={ref}>
      <h2 id="rt-cd-reviews-h">Reviews of Read Training</h2>
      {trust.rating && trust.reviews ? (
        <div className="rt-cd__rsum">
          <strong className="rt-cd__rsum-n">{trust.rating}</strong>
          <div className="rt-cd__rsum-text">
            <RatingStars rating={trust.rating} />
            <p>out of 5 from {trust.reviews} {trust.source ? `${trust.source} ` : ""}reviews of Read Training. Below, learners on {course} in their own words.</p>
          </div>
        </div>
      ) : (
        <p className="rt-cd__lead">What learners said about their {course} training with us, in their own words.</p>
      )}
      <ul className={`rt-reviews__grid rt-cd__reviews${reviews.length === 1 ? " -one" : ""}`}>
        {reviews.slice(0, count).map((r) => (
          <li key={r.id}>
            <ReviewCard review={r} clamp meta="date" />
          </li>
        ))}
      </ul>
      {reviews.length > PAGE && (
        <div className="rt-cd__reviews-more">
          <span className="rt-cd__reviews-count" aria-live="polite">Showing {Math.min(count, reviews.length)} of {reviews.length} reviews</span>
          {left > 0 ? (
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setCount((n) => n + PAGE)}>Show more reviews</button>
          ) : (
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={fewer}>Show fewer reviews</button>
          )}
        </div>
      )}
    </section>
  );
}
