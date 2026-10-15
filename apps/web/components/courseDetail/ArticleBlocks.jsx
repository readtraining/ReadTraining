import React from "react";
import Link from "next/link";
import ClampBlock from "./ClampBlock";
import LongBody from "./LongBody";
import { Check } from "./Icon";
import { coursePath } from "@/lib/routes";


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
            <li key={l.slug}><Link href={coursePath(l.slug)} className="rt-cd__link">{l.title}</Link><span>{l.text}</span></li>
          ))}
        </ul>
      )}
      {b.note && <p className="rt-cd__note">{b.note}</p>}
      {b.outro?.length > 0 && <div className="rt-cd__prose">{b.outro.map((p) => <p key={p}>{p}</p>)}</div>}
    </>
  );
}

// part="intro": only the overview block (the course introduction). part="rest": every other block, each with a clamped body.
export default function ArticleBlocks({ blocks, part }) {
  const list = part === "intro" ? blocks.filter((b) => b.id === "overview") : part === "rest" ? blocks.filter((b) => b.id !== "overview") : blocks;
  return list.map((b) => {
    const content = (
      <>
        <Body b={b} />
        {b.subs?.map((s) => (
          <div key={s.title} className="rt-cd__sub">
            <h3 className="rt-cd__h3">{s.title}</h3>
            <Body b={s} />
          </div>
        ))}
      </>
    );
    return (
      <section key={b.title} className="rt-cd__sec" id={b.id}>
        <h2>{b.title}</h2>
        {part === "rest" ? <LongBody>{content}</LongBody> : content}
      </section>
    );
  });
}
