import React from "react";
import Link from "next/link";

// Text blocks for long-form documents (legal pages now; help articles and guides later). A block is a string (a paragraph)
// or { type: "ul" | "table", ... }. Text may hold [label](href) links and **bold**; nothing else is parsed,
// so content can never inject markup.
const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

export function Inline({ text }) {
  const out = [];
  let last = 0;
  let m;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${m.index}`;
    if (m[3]) out.push(<strong key={key}>{m[3]}</strong>);
    else if (/^(\/|#)/.test(m[2])) out.push(<Link key={key} href={m[2]}>{m[1]}</Link>);
    else out.push(<a key={key} href={m[2]}>{m[1]}</a>);
    last = INLINE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function DocBlock({ b }) {
  if (typeof b === "string") return <p><Inline text={b} /></p>;
  switch (b.type) {
    case "ul":
      return <ul>{b.items.map((x) => <li key={x}><Inline text={x} /></li>)}</ul>;
    case "table": {
      // on phones each row becomes a card: the first cell is its title, the others show their column name (data-label)
      const [head, ...rows] = b.rows;
      return (
        <div className="rt-doc__table-wrap">
          <table className="rt-doc__table">
            {b.caption && <caption className="rt-sr">{b.caption}</caption>}
            <thead>
              <tr>{head.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.join("|")}>
                  {r.map((c, i) => (i === 0 ? <th key={c} scope="row"><Inline text={c} /></th> : <td key={`${i}-${c}`} data-label={head[i]}><Inline text={c} /></td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return null;
  }
}

export default function DocBlocks({ blocks }) {
  return blocks.map((b, i) => <DocBlock key={i} b={b} />);
}
