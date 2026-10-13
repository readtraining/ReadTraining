"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";

// The switch between legal documents as a tab bar under the site header (as Google's Privacy & Terms pages): a line across
// the page, the tabs on the site container's edge, the current document dark with a purple underline, the others muted. Not
// sticky (the site header already is). Scrolls sideways when the documents do not fit, starting with the current tab in view.
// `items` is [{ slug, title, href }].
export default function DocTabsBar({ items, current }) {
  const listRef = useRef(null);

  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector("[aria-current]");
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = tab.offsetLeft - list.offsetLeft - 16;
  }, [current]);

  if (items.length < 2) return null;
  return (
    <nav className="rt-doc__bar" aria-label="Legal documents">
      <div className="container">
        <ul className="rt-doc__bar-list" ref={listRef}>
          {items.map((x) => (
            <li key={x.slug}>
              {x.slug === current ? <span aria-current="page">{x.title}</span> : <Link href={x.href}>{x.title}</Link>}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
