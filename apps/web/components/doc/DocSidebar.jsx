"use client";

import React, { useMemo, useRef } from "react";
import { useHeaderOffset } from "@/components/testPrep/subject/useHeaderOffset";
import FilterScrollPill from "@/components/courses/FilterScrollPill";
import { goToSection, useKeepInView, useScrollSpy } from "./scrollSpy";

// The legal pages' contents column (from 992px), beside the document: "On this page", the document's numbered sections with
// the one being read marked (scrollspy). Pinned under the site header while the document scrolls; the list scrolls inside it
// when it is taller than the screen, with the catalogue's scroll pill. The switch between documents is the tab bar above.
// `items` is [{ id, num?, label }] (blog articles have no numbers).
export default function DocSidebar({ items, title = "On this page" }) {
  const listRef = useRef(null);
  const ids = useMemo(() => items.map((x) => x.id), [items]);
  const active = useScrollSpy(ids);
  useKeepInView(listRef, active);
  useHeaderOffset();

  return (
    <div className="rt-doc__side">
      <nav className="rt-doc__side-in" aria-labelledby="rt-doc-side-toc-h">
        <h2 className="rt-doc__side-title" id="rt-doc-side-toc-h">{title}</h2>
        <div className="rt-doc__side-scroll">
          <ol className="rt-doc__side-sections" role="list" ref={listRef}>
            {items.map((x) => (
              <li key={x.id}>
                <a href={`#${x.id}`} className={active === x.id ? "is-active" : undefined} aria-current={active === x.id ? "location" : undefined} onClick={(e) => goToSection(e, x.id)}>
                  {x.num && <span className="rt-doc__side-num">{x.num}</span>}
                  <span>{x.label}</span>
                </a>
              </li>
            ))}
          </ol>
          <FilterScrollPill scrollRef={listRef} />
        </div>
      </nav>
    </div>
  );
}
