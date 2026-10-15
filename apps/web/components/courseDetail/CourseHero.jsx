import React from "react";
import BookNow from "./BookNow";
import Crumbs from "./Crumbs";
import SaverBadge from "@/components/skillSaver/SaverBadge";
import { isSkillSaverCourse } from "@/lib/skillSaver";
import { formatPrice, getSubjectLabel, getSubLabel, savePercent } from "@/lib/courses";
import { CATALOGUE_HREF } from "@/lib/routes";

const CATALOGUE = CATALOGUE_HREF;

// Hero, in this order: breadcrumb, title, summary, badge, provider count, price row with Book now, instalments line (only when
// supported). The rating, students and "Rated Excellent" proof now live in the stats card on the hero edge (StatsCard).
export default function CourseHero({ course }) {
  const subject = getSubjectLabel(course);
  const sub = getSubLabel(course);
  const lowest = course.sessions.reduce((best, s) => (s.price < best.price ? s : best), course.sessions[0]);
  const pct = savePercent(lowest.price, lowest.wasPrice);

  return (
    <div className="rt-cd__hero">
      <div className="rt-cd__hero-text">
        <Crumbs
          crumbs={[
            subject && { label: subject, href: `${CATALOGUE}?subject=${course.subject}` },
            subject && sub && { label: sub, href: `${CATALOGUE}?subject=${course.subject}&sub=${course.sub}` },
            { label: course.title },
          ].filter(Boolean)}
        />

        {isSkillSaverCourse(course.id) && <SaverBadge href="/skill-saver" className="rt-cd__saver" />}
        <h1 className="rt-cd__title" id="rt-cd-title">{course.title}</h1>
        <p className="rt-cd__summary">{course.summary}</p>

        <p className="rt-cd__providers"><strong>{course.providerCount}</strong> course providers</p>

        <div className="rt-cd__hrow">
          <p className="rt-cd__hprice">
            <span className="rt-cd__hprice-from">From</span>
            <strong className="rt-cd__hprice-now">{formatPrice(lowest.price)}</strong>
            <span className="rt-cd__hprice-inc">All inc</span>
            {lowest.wasPrice > lowest.price && <s className="rt-cd__hprice-was"><span className="rt-cd__sr">was </span>{formatPrice(lowest.wasPrice)}</s>}
            {pct > 0 && <span className="rt-cd__hprice-off">{pct}% off</span>}
          </p>
          <BookNow />
        </div>

        {course.trust?.instalments && <p className="rt-cd__klarna">Pay in 3 interest-free instalments with Klarna</p>}
      </div>
    </div>
  );
}
