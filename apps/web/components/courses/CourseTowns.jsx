import React from "react";
import Link from "next/link";

// "Find <courses> near you": the towns with a venue for a course page, as the catalogue's chips, each linking to its town page
// (/courses/<page>/<town>). On a town page the current town is marked and the others stay links.
export default function CourseTowns({ title, towns, current = "" }) {
  if (!towns.length) return null;
  return (
    <section className="rt-ctowns layout-pt-md" aria-labelledby="rt-ctowns-h">
      <div className="container">
        <h2 className="rt-ctowns__h" id="rt-ctowns-h">{title}</h2>
        <ul className="rt-ctowns__list">
          {towns.map((t) => (
            <li key={t.slug}>
              {t.slug === current
                ? <span className="rt-tr__filter is-on" aria-current="page">{t.city}</span>
                : <Link href={t.href} className="rt-tr__filter">{t.city}</Link>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
