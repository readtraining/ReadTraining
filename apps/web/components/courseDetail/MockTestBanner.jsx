import React from "react";
import Link from "next/link";
import { testPrepPage } from "@/data/testPrep";
import { subjectLead } from "@/lib/testPrep";

// A course's own mock test, shown only for courses that have one (course.mockTest). It reuses the site's callout box (rt-cd__staff)
// and button. A test whose page is not built yet shows "Coming soon" instead of a link, so it never leads to a 404.
export default function MockTestBanner({ test }) {
  if (!test) return null;
  const text = test.banner || subjectLead(test.slug);
  return (
    <section className="rt-cd__sec" aria-label="Mock test for this course">
      <div className="rt-cd__staff rt-cd__mock">
        <strong>{test.title}</strong>
        {text && <p>{text}</p>}
        {test.live ? (
          <Link href={test.href} className="button -sm -purple-1 text-white">{testPrepPage.ctaLabel}</Link>
        ) : (
          <span className="rt-cd__link" aria-disabled="true">{testPrepPage.soonLabel}</span>
        )}
      </div>
    </section>
  );
}
