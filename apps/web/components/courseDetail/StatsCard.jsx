import React from "react";
import Stars from "@/components/home/HomeStars";
import { Icon } from "./Icon";
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
            <Icon name="badge" />
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
        <Stars rating={course.rating} size="md" />
        <a href="#reviews">({formatNumber(course.reviewCount)} ratings)</a>
      </div>
      <div className="rt-stats__students">
        <Icon name="friend" />
        <strong>{formatNumber(course.learnerCount)}</strong>
        <span>students enrolled</span>
      </div>
    </section>
  );
}
