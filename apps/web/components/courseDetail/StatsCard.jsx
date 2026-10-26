import React from "react";
import { Icon } from "./Icon";
import { formatNumber } from "@/lib/courses";

// The white bar on the hero edge: a purple "Approved providers" block with what is true of every course here (each provider and
// course is checked by our team), then the course at a glance from its own data: training providers, upcoming dates and its length.
// (A rating takes the purple block's place once real reviews exist, in a later milestone; never a made-up one.)
export default function StatsCard({ course }) {
  const selfPaced = course.duration === "Self-paced";
  return (
    <section className="rt-stats" aria-label="Course at a glance">
      <div className="rt-stats__brand" aria-hidden="true">
        <Icon name="badge" />
        <span>Approved providers</span>
      </div>
      {/* only where the bar has room for it (custom.scss) */}
      <div className="rt-stats__text">
        <strong>Checked by our team</strong>
        <span>Every course, before it goes live</span>
      </div>
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
          <span>{selfPaced ? "start any time" : "course length"}</span>
        </div>
      )}
    </section>
  );
}
