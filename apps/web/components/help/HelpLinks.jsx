import React from "react";
import Link from "next/link";

// A list of help articles or topics as home's row-link cards (.rt-helpcard: icon tile, title, one-line summary, arrow), in one
// column or, with `columns`, two. `items` is [{ title, summary, href, icon? }].
export default function HelpLinks({ items, columns = 1, icon = "icon-document" }) {
  return (
    <ul className={`rt-help__links${columns === 2 ? " -two" : ""}`}>
      {items.map((x) => (
        <li key={x.href}>
          <Link href={x.href} className="rt-helpcard">
            <span className="rt-helpcard__icon" aria-hidden="true"><i className={`${x.icon || icon} text-16`}></i></span>
            <span className="rt-helpcard__body">
              <span className="rt-helpcard__label">{x.title}</span>
              <span className="rt-helpcard__meta">{x.summary}</span>
            </span>
            <span className="rt-helpcard__arrow" aria-hidden="true"><i className="icon-arrow-right text-12"></i></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
