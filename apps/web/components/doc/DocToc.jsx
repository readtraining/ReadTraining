"use client";

import React, { useMemo, useRef } from "react";
import { goToSection, useScrollSpy } from "./scrollSpy";

// A document's contents on phones and tablets (from 992px the sidebar, DocSidebar, takes over): a native <details> above the
// text, closed until opened, marking the section being read. Plain in-page links, so they work without JavaScript. A click
// scrolls to the section, moves keyboard focus to its heading and closes the list. `items` is [{ id, num?, label }] (blog articles have no numbers).
export default function DocToc({ title = "Contents", items }) {
  const ref = useRef(null);
  const ids = useMemo(() => items.map((x) => x.id), [items]);
  const active = useScrollSpy(ids);

  const goTo = (e, id) => {
    if (goToSection(e, id) && ref.current) ref.current.open = false;
  };

  return (
    <nav className="rt-doc__toc" aria-labelledby="rt-doc-toc-h">
      <details ref={ref}>
        <summary className="rt-doc__toc-summary">
          <h2 className="rt-doc__toc-title" id="rt-doc-toc-h">{title}</h2>
          <i className="icon-chevron-down" aria-hidden="true"></i>
        </summary>
        <ol className="rt-doc__toc-list" role="list">
          {items.map((x) => (
            <li key={x.id}>
              <a href={`#${x.id}`} className={active === x.id ? "is-active" : undefined} aria-current={active === x.id ? "location" : undefined} onClick={(e) => goTo(e, x.id)}>
                {x.num && <span className="rt-doc__toc-num">{x.num}</span>}
                <span>{x.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  );
}
