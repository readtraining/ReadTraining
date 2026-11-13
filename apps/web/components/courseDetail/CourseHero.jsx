import React from "react";
import BookNow from "./BookNow";
import Crumbs from "./Crumbs";
import SaverBadge from "@/components/skillSaver/SaverBadge";
import { formatPrice, getSubjectLabel, getSubLabel, savePercent } from "@/lib/courses";
import Link from "next/link";
import { CATALOGUE_HREF, QUOTE_HREF, coursePath } from "@/lib/routes";
import { trustFigures } from "@/lib/siteContent";
import { TEAM } from "@/lib/teamTraining";
import RatingStars from "./RatingStars";

const CATALOGUE = CATALOGUE_HREF;

// Hero, in this order: breadcrumb, badge, title, summary, provider link, the price row with Book now and "Get a team quote" (a
// quote for this course, lib/teamTraining.js), then Read Training's rating (the site's trust numbers, Admin › Site content: our Google rating and its
// number of reviews, worded as ours, not the course's; left out until an admin has entered one). With reviews of the course
// on the page (`hasReviews`), the rating is a link down to them.
// `headline`: a course guide's { title, accent } (data/courseGuides.js): the name as the guide writes it, then its selling line
// in the accent colour; without one, the course's own name.
export default function CourseHero({ course, hasReviews = false, headline = null }) {
  const subject = getSubjectLabel(course);
  const sub = getSubLabel(course);
  const lowest = course.sessions.reduce((best, s) => (!best || s.price < best.price ? s : best), null);
  const pct = lowest ? savePercent(lowest.price, lowest.wasPrice) : 0;
  const trust = trustFigures();

  return (
    <div className="rt-cd__hero">
      <div className="rt-cd__hero-text">
        <Crumbs
          crumbs={[
            subject && { label: subject, href: `${CATALOGUE}/${course.subject}` },
            subject && sub && { label: sub, href: `${CATALOGUE}/${course.subject}?sub=${course.sub}` },
            { label: course.title },
          ].filter(Boolean)}
        />

        {/* in Skill Saver on every date, or on some (the dates pop-up and the booking card then mark which) */}
        {course.skillSaver && <SaverBadge href="/skill-saver" className="rt-cd__saver" label={course.skillSaver === "some" ? "Skill Saver on some dates" : undefined} />}
        <h1 className="rt-cd__title" id="rt-cd-title">
          {headline?.title && headline?.accent ? <>{headline.title} <span className="rt-cd__title-accent">{"— "}{headline.accent}</span></> : course.title}
        </h1>
        <p className="rt-cd__summary">{course.summary}</p>

        {/* the counts are in the bar under the hero; a provider's course on a shared page links to every date for that course */}
        {course.parent && <p className="rt-cd__providers"><Link href={coursePath(course.parent.slug)} className="rt-cd__link">See every date for {course.parent.title}</Link></p>}

        <div className="rt-cd__hrow">
          {lowest ? (
            <p className="rt-cd__hprice">
              <span className="rt-cd__hprice-from">From</span>
              <strong className="rt-cd__hprice-now">{formatPrice(lowest.price)}</strong>
              <span className="rt-cd__hprice-inc">inc. VAT</span>
              {lowest.wasPrice > lowest.price && <s className="rt-cd__hprice-was"><span className="rt-cd__sr">was </span>{formatPrice(lowest.wasPrice)}</s>}
              {pct > 0 && <span className="rt-cd__hprice-off">{pct}% off</span>}
            </p>
          ) : (
            <p className="rt-cd__hprice"><strong className="rt-cd__hprice-soon">New dates coming soon</strong></p>
          )}
          <div className="rt-cd__hctas">
            <BookNow />
            <Link href={`${QUOTE_HREF}?course=${course.slug}`} className="button -md -outline-white text-white rt-cd__hteam">{TEAM.cta}</Link>
          </div>
        </div>

        {trust.rating && trust.reviews && (
          <p className="rt-cd__htrust">
            <RatingStars rating={trust.rating} />
            {hasReviews ? (
              <a href="#course-reviews" className="rt-cd__htrust-link">
                <strong>{trust.ratingOutOf}</strong> from {trust.reviews} {trust.source ? `${trust.source} ` : ""}reviews of Read Training
              </a>
            ) : (
              <span>
                <strong>{trust.ratingOutOf}</strong> from {trust.reviews} {trust.source ? `${trust.source} ` : ""}reviews of Read Training
              </span>
            )}
          </p>
        )}

      </div>
    </div>
  );
}
