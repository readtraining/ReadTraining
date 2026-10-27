import React from "react";
import BookNow from "./BookNow";
import Crumbs from "./Crumbs";
import SaverBadge from "@/components/skillSaver/SaverBadge";
import { formatPrice, getSubjectLabel, getSubLabel, savePercent } from "@/lib/courses";
import Link from "next/link";
import { CATALOGUE_HREF, coursePath } from "@/lib/routes";

const CATALOGUE = CATALOGUE_HREF;

// Hero, in this order: breadcrumb, title, summary, badge, provider count, price row with Book now, instalments line (only when
// supported). The rating, students and "Rated Excellent" proof now live in the stats card on the hero edge (StatsCard).
export default function CourseHero({ course }) {
  const subject = getSubjectLabel(course);
  const sub = getSubLabel(course);
  const lowest = course.sessions.reduce((best, s) => (!best || s.price < best.price ? s : best), null);
  const pct = lowest ? savePercent(lowest.price, lowest.wasPrice) : 0;

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

        {course.skillSaver && <SaverBadge href="/skill-saver" className="rt-cd__saver" />}
        <h1 className="rt-cd__title" id="rt-cd-title">{course.title}</h1>
        <p className="rt-cd__summary">{course.summary}</p>

        {/* the counts are in the bar under the hero; a provider's course on a shared page links to every date for that course */}
        {course.parent && <p className="rt-cd__providers"><Link href={coursePath(course.parent.slug)} className="rt-cd__link">See every date for {course.parent.title}</Link></p>}

        <div className="rt-cd__hrow">
          {lowest ? (
            <p className="rt-cd__hprice">
              <span className="rt-cd__hprice-from">From</span>
              <strong className="rt-cd__hprice-now">{formatPrice(lowest.price)}</strong>
              <span className="rt-cd__hprice-inc">All inc</span>
              {lowest.wasPrice > lowest.price && <s className="rt-cd__hprice-was"><span className="rt-cd__sr">was </span>{formatPrice(lowest.wasPrice)}</s>}
              {pct > 0 && <span className="rt-cd__hprice-off">{pct}% off</span>}
            </p>
          ) : (
            <p className="rt-cd__hprice"><strong className="rt-cd__hprice-soon">New dates coming soon</strong></p>
          )}
          <BookNow />
        </div>

        {course.trust?.instalments && <p className="rt-cd__klarna">Pay in 3 interest-free instalments with Klarna</p>}
      </div>
    </div>
  );
}
