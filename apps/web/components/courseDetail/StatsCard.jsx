import React from "react";
import Stars from "./Stars";
import { formatNumber } from "@/lib/courses";

// The white bar on the hero edge: brand block, "Rated Excellent" text, rating, students. The first two cells exist only
// when the course is rated Excellent (4.5 or more). All text is the existing proof copy, just moved here from the hero.
export default function StatsCard({ course }) {
  const excellent = course.rating >= 4.5;
  return (
    <section className="rt-stats" aria-label="Course rating">
      {excellent && (
        <>
          <div className="rt-stats__brand" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="6" /><path d="M8.5 14L7 22l5-3 5 3-1.5-8" /></svg>
            <span>Excellent</span>
          </div>
          <div className="rt-stats__text">
            <strong>Rated Excellent</strong>
            <span>Based on {formatNumber(course.reviewCount)} ratings</span>
          </div>
        </>
      )}
      <div className="rt-stats__rating">
        <strong className="rt-stats__num">{course.rating.toFixed(1)}</strong>
        <Stars rating={course.rating} size={14} />
        <a href="#reviews">({formatNumber(course.reviewCount)} ratings)</a>
      </div>
      <div className="rt-stats__students">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.4c2.2.7 3.5 2.6 3.5 5.6" /></svg>
        <strong>{formatNumber(course.learnerCount)}</strong>
        <span>students enrolled</span>
      </div>
    </section>
  );
}
