import React from "react";
import Link from "next/link";
import { testCategoryIcons, testPrepPage } from "@/data/testPrep";

// "More mock tests": other subject pages, near the end of the page, as home's row-link cards (.rt-helpcard: icon tile, name,
// number of tests, round arrow), three to a row on wide screens. `items` are hub entries with `testCount` added by the page.
export default function SubjectMore({ items }) {
  if (!items.length) return null;
  const t = testPrepPage.subject;
  return (
    <section className="rt-tps__related" aria-labelledby="rt-tps-more-h">
      <h2 className="rt-tps__h2" id="rt-tps-more-h">{t.moreTitle}</h2>
      <ul className="rt-tps__related-grid">
        {items.map((x) => (
          <li key={x.slug}>
            <Link href={x.href} className="rt-helpcard">
              <span className="rt-helpcard__icon" aria-hidden="true"><i className={`${testCategoryIcons[x.category] || "icon-book"} text-16`}></i></span>
              <span className="rt-helpcard__body">
                <span className="rt-helpcard__label">{x.title}</span>
                <span className="rt-helpcard__meta">{x.category}{x.testCount ? ` · ${x.testCount} ${x.testCount === 1 ? "mock test" : "mock tests"}` : ""}</span>
              </span>
              <span className="rt-helpcard__arrow" aria-hidden="true"><i className="icon-arrow-right text-12"></i></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
