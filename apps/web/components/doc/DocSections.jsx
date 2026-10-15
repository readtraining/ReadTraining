import React from "react";
import DocBlocks from "./DocBlocks";

// A numbered document: one <section> per entry, its number and title (h2, the anchor the contents link to) and its blocks.
export default function DocSections({ sections }) {
  return sections.map((s) => (
    <section key={s.id} id={s.id} className="rt-doc__section" aria-labelledby={`${s.id}-h`}>
      <h2 className="rt-doc__h2" id={`${s.id}-h`} tabIndex={-1}>
        <span className="rt-doc__h2-num">{`${s.num}.`}</span>
        {s.title}
      </h2>
      <DocBlocks blocks={s.blocks} />
    </section>
  ));
}
