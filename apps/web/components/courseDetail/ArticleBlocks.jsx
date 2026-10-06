import React from "react";
import Link from "next/link";
import ClampBlock from "./ClampBlock";

const Check = () => (
  <svg className="rt-cd__check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.8" />
  </svg>
);

// Renders a course's `article`: a list of blocks { id?, title, paragraphs?, checks?, items?, note?, subs?, outro? }.
// Every part is optional and only shown when the course has it, so each course can have its own set of sections.
function Body({ b }) {
  return (
    <>
      {b.paragraphs?.length > 0 && (
        b.id === "overview"
          ? <ClampBlock><div className="rt-cd__prose">{b.paragraphs.map((p) => <p key={p}>{p}</p>)}</div></ClampBlock>
          : <div className="rt-cd__prose">{b.paragraphs.map((p) => <p key={p}>{p}</p>)}</div>
      )}
      {b.checks?.length > 0 && <ul className="rt-cd__checks is-one">{b.checks.map((c) => <li key={c}><Check /> <span>{c}</span></li>)}</ul>}
      {b.items?.length > 0 && <ul className="rt-cd__list">{b.items.map((i) => <li key={i}>{i}</li>)}</ul>}
      {b.links?.length > 0 && (
        <ul className="rt-cd__links">
          {b.links.map((l) => (
            <li key={l.slug}><Link href={`/template/courses/${l.slug}`} className="rt-cd__link">{l.title}</Link><span>{l.text}</span></li>
          ))}
        </ul>
      )}
      {b.note && <p className="rt-cd__note">{b.note}</p>}
      {b.outro?.length > 0 && <div className="rt-cd__prose">{b.outro.map((p) => <p key={p}>{p}</p>)}</div>}
    </>
  );
}

export default function ArticleBlocks({ blocks }) {
  return blocks.map((b) => (
    <section key={b.title} className="rt-cd__sec" id={b.id}>
      <h2>{b.title}</h2>
      <Body b={b} />
      {b.subs?.map((s) => (
        <div key={s.title} className="rt-cd__sub">
          <h3 className="rt-cd__h3">{s.title}</h3>
          <Body b={s} />
        </div>
      ))}
    </section>
  ));
}
