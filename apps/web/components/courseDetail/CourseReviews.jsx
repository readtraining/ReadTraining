import React from "react";
import Link from "next/link";
import { ReviewCard } from "@/components/customerReviews/ReviewsList";
import { reviewsHref } from "@/lib/siteReviews";

// "Reviews of Read Training" on a course page: the published reviews that name this course's topic (lib/siteReviews.js
// reviewsForCourse), each with the reviewer's own stars, in the Customer reviews page's cards: the newest SHOWN, then a link to
// all of them on Customer reviews, filtered to this course. A course page can list dates from several providers, so the
// heading says whose reviews they are. Left out when no review names the course. `course` is the topic's name.
const SHOWN = 4;

export default function CourseReviews({ reviews, course }) {
  if (!reviews?.length) return null;
  const more = reviews.length > SHOWN;
  return (
    <section className="rt-cd__sec" id="course-reviews" aria-labelledby="rt-cd-reviews-h">
      <h2 id="rt-cd-reviews-h">Reviews of Read Training</h2>
      <p className="rt-cd__lead">What learners said about their {course} training with us, in their own words.</p>
      <ul className={`rt-reviews__grid rt-cd__reviews${reviews.length === 1 ? " -one" : ""}`}>
        {reviews.slice(0, SHOWN).map((r) => (
          <li key={r.id}>
            <ReviewCard review={r} />
          </li>
        ))}
      </ul>
      <Link href={reviewsHref(course)} className="rt-cd__link">{more ? `Read all ${reviews.length} ${course} reviews` : "Read more reviews"}</Link>
    </section>
  );
}
