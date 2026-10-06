import React from "react";
import Link from "next/link";
import Stars from "./Stars";
import BookNow from "./BookNow";
import { formatNumber, formatPrice, getSubjectLabel, getSubLabel, savePercent } from "@/lib/courses";

const CATALOGUE = "/template/courses-list-1";

// Hero: breadcrumb, badge, title, summary, provider count, "From" price, Book now, rating row, "Rated Excellent" and the
// instalments line (only when the site supports it). The booking card lives on the right (overlapping the band).
export default function CourseHero({ course }) {
  const subject = getSubjectLabel(course);
  const sub = getSubLabel(course);
  const excellent = course.rating >= 4.5;
  const lowest = course.sessions.reduce((best, s) => (s.price < best.price ? s : best), course.sessions[0]);
  const pct = savePercent(lowest.price, lowest.wasPrice);

  return (
    <div className="rt-cd__hero">
      <div className="rt-cd__hero-text">
        <nav className="rt-cd__crumbs" aria-label="Breadcrumb">
          <ol>
            {subject && <li><Link href={`${CATALOGUE}?subject=${course.subject}`}>{subject}</Link></li>}
            {subject && sub && <li><Link href={`${CATALOGUE}?subject=${course.subject}&sub=${course.sub}`}>{sub}</Link></li>}
            <li aria-current="page">{course.title}</li>
          </ol>
        </nav>

        {course.badge && <p className="rt-cd__kicker"><span className="rt-cd__badge">{course.badge}</span></p>}
        <h1 className="rt-cd__title" id="rt-cd-title">{course.title}</h1>
        <p className="rt-cd__summary">{course.summary}</p>

        <p className="rt-cd__providers"><strong>{course.providerCount}</strong> course providers</p>

        <p className="rt-cd__hprice">
          <span className="rt-cd__hprice-from">From</span>
          <strong className="rt-cd__hprice-now">{formatPrice(lowest.price)}</strong>
          <span className="rt-cd__hprice-inc">All inc</span>
          {lowest.wasPrice > lowest.price && <s className="rt-cd__hprice-was"><span className="rt-cd__sr">was </span>{formatPrice(lowest.wasPrice)}</s>}
          {pct > 0 && <span className="rt-cd__hprice-off">{pct}% off</span>}
        </p>

        <BookNow />

        <div className="rt-cd__proof">
          <span className="rt-cd__rating">
            <strong>{course.rating.toFixed(1)}</strong>
            <Stars rating={course.rating} />
            <a href="#reviews" className="rt-cd__link">({formatNumber(course.reviewCount)} ratings)</a>
          </span>
          <span>{formatNumber(course.learnerCount)} students enrolled</span>
        </div>

        {excellent && (
          <p className="rt-cd__excellent-line">
            <span>Rated <strong>Excellent</strong></span>
            <Stars rating={5} size={14} />
            <span>Based on {formatNumber(course.reviewCount)} ratings</span>
          </p>
        )}

        {course.trust?.instalments && <p className="rt-cd__klarna">Pay in 3 interest-free instalments with Klarna</p>}
      </div>
    </div>
  );
}
