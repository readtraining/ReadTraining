import React from "react";
import SubjectToc from "./SubjectToc";
import { testPrepPage } from "@/data/testPrep";

// The subject's article: one section per entry in data (id, heading, blocks). Each block type maps to a plain element;
// a subject without sections renders nothing, so no empty headings or boxes appear.
function Block({ b }) {
  switch (b.type) {
    case "h3":
      return <h3>{b.text}</h3>;
    case "note":
      return <p className="rt-tps__note">{b.text}</p>;
    case "ul":
      return <ul>{b.items.map((x) => <li key={x}>{x}</li>)}</ul>;
    case "ol":
      return <ol>{b.items.map((x) => <li key={x}>{x}</li>)}</ol>;
    case "table": {
      const [head, ...rows] = b.rows;
      return (
        <div className="rt-tps__table-wrap">
          <table className="rt-tps__table">
            <thead>
              <tr>{head.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => <tr key={r.join("|")}>{r.map((c, i) => <td key={`${i}-${c}`}>{c}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return <p>{b.text}</p>;
  }
}

// A table of contents only helps on a longer article: from 3 sections up it opens the article. GUIDE_ID is the article's start
// (the slim bar's "Guide" link), so no section anchor is linked twice.
export const TOC_MIN_SECTIONS = 3;
export const GUIDE_ID = "guide";

// The guide (docs layout): with a contents list, a pinned contents column on the left and the article on the right; without
// one (a short article), the article alone on the readable column.
export default function SubjectArticle({ sections }) {
  if (!sections.length) return null;
  const withToc = sections.length >= TOC_MIN_SECTIONS;
  return (
    <div className={`rt-tps__guide${withToc ? " -toc" : ""}`} id={GUIDE_ID}>
      {withToc && <SubjectToc title={testPrepPage.subject.tocTitle} items={sections.map((s) => ({ id: s.id, heading: s.heading }))} />}
      <div className="rt-tps__article">
        {sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
            <h2 className="rt-tps__h2" id={`${s.id}-h`}>{s.heading}</h2>
            {s.blocks.map((b, i) => <Block key={`${s.id}-${i}`} b={b} />)}
          </section>
        ))}
      </div>
    </div>
  );
}
