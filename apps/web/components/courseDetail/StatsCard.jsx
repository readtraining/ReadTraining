import React from "react";
import { Icon } from "./Icon";
import { formatNumber } from "@/lib/courses";

// The white bar on the hero edge: the course at a glance, from its own data: how many training providers run it, its upcoming
// dates and its length. (Ratings and learner numbers come with reviews and bookings, in later milestones.)
export default function StatsCard({ course }) {
  return (
    <section className="rt-stats" aria-label="Course at a glance">
      <div className="rt-stats__students">
        <Icon name="person-3" />
        <strong>{formatNumber(course.providerCount)}</strong>
        <span>{course.providerCount === 1 ? "training provider" : "training providers"}</span>
      </div>
      <div className="rt-stats__students">
        <Icon name="calendar" />
        <strong>{formatNumber(course.upcoming ?? 0)}</strong>
        <span>upcoming {course.upcoming === 1 ? "date" : "dates"}</span>
      </div>
      {course.duration && (
        <div className="rt-stats__students">
          <Icon name="time-management" />
          <strong>{course.duration}</strong>
        </div>
      )}
    </section>
  );
}
