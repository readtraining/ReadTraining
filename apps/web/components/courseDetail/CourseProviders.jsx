import React from "react";
import Link from "next/link";
import { formatPrice, formatShortDate } from "@/lib/format";
import { methodName } from "@/lib/taxonomy";
import { coursePath } from "@/lib/routes";

// A shared course page's training providers (the shared-listing model): each provider running this course, how they teach it,
// their next date, their lowest price and how many dates they have, with a link to their own course page (their wording, dates
// and terms). Only on a shared page: a provider's own page names its provider in the hero.
export default function CourseProviders({ course }) {
  if (course.kind !== "shared" || !course.offerings?.length) return null;
  const rows = course.offerings.map((o) => {
    const mine = course.sessions.filter((s) => s.courseId === o.courseId);
    const next = mine.find((s) => s.mode !== "ondemand");
    const from = mine.reduce((m, s) => (m === null || s.price < m ? s.price : m), null);
    return { o, mine, next, from };
  });
  return (
    <section className="rt-cd__sec" id="providers" aria-labelledby="rt-cd-prov-h">
      <h2 id="rt-cd-prov-h">Training providers</h2>
      <p className="rt-cd__lead">{rows.length === 1 ? "One approved provider runs this course." : `${rows.length} approved providers run this course. Compare their dates and prices.`}</p>
      <ul className="rt-cd__provs">
        {rows.map(({ o, mine, next, from }) => (
          <li key={o.courseId} className="rt-cd__prov">
            <span className="rt-cd__prov-logo" aria-hidden="true">
              {o.provider.logoUrl ? <img src={o.provider.logoUrl} alt="" /> : o.provider.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <div className="rt-cd__prov-text">
              <Link href={`/providers/${o.provider.slug}`} className="rt-cd__prov-name">{o.provider.name}</Link>
              <span>
                {[methodName(o.method), next ? `next ${formatShortDate(next.date)}${next.city ? `, ${next.city}` : ""}` : o.method === "self-paced" ? "start any time" : "no dates yet", mine.length > 1 ? `${mine.length} dates` : ""].filter(Boolean).join(" · ")}
              </span>
            </div>
            <div className="rt-cd__prov-end">
              {from !== null && <strong>From {formatPrice(from)}</strong>}
              <Link href={coursePath(o.slug)} className="rt-cd__link">View course<span className="rt-cd__sr"> from {o.provider.name}</span></Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
