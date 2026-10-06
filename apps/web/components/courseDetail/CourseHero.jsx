import React from "react";
import Link from "next/link";
import Stars from "./Stars";
import { formatNumber, getSubjectLabel, getSubLabel } from "@/lib/courses";

const CATALOGUE = "/template/courses-list-1";

// Hero (same content as the Hurak course page, in our layout): breadcrumb, title, one-line summary, rating row with
// students and provider count, and the "Rated Excellent" proof. The course image now lives in the booking card.
export default function CourseHero({ course }) {
  const subject = getSubjectLabel(course);
  const sub = getSubLabel(course);
  const excellent = course.rating >= 4.5;

  return (
    <div className="rt-cd__hero">
      <nav className="rt-cd__crumbs" aria-label="Breadcrumb">
        <ol>
          {subject && <li><Link href={`${CATALOGUE}?subject=${course.subject}`}>{subject}</Link></li>}
          {subject && sub && <li><Link href={`${CATALOGUE}?subject=${course.subject}&sub=${course.sub}`}>{sub}</Link></li>}
          <li aria-current="page">{course.title}</li>
        </ol>
      </nav>

      <div className="rt-cd__hero-top">
        <div className="rt-cd__hero-text">
          {course.badge && <p className="rt-cd__kicker"><span className="rt-cd__badge">{course.badge}</span></p>}
          <h1 className="rt-cd__title" id="rt-cd-title">{course.title}</h1>
          <p className="rt-cd__summary">{course.summary}</p>

          <p className="rt-cd__providers"><strong>{course.providerCount}</strong> course providers</p>

          <div className="rt-cd__proof">
            <span className="rt-cd__rating">
              <strong>{course.rating.toFixed(1)}</strong>
              <Stars rating={course.rating} />
              <a href="#reviews" className="rt-cd__link">({formatNumber(course.reviewCount)} ratings)</a>
            </span>
            <span>{formatNumber(course.learnerCount)} students enrolled</span>
          </div>
        </div>

        {excellent && (
          <div className="rt-cd__hero-side">
            <div className="rt-cd__excellent">
              <p>Rated <strong>Excellent</strong></p>
              <Stars rating={5} size={20} />
              <span>Based on {formatNumber(course.reviewCount)} ratings</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
