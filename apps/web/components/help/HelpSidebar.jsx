import React from "react";
import Link from "next/link";

// The Help Centre's side column (from 992px), in the legal pages' contents column (.rt-doc__side): a title and a list of links
// with the current one marked. On a topic page it lists the topics; on an article page, the topic's articles.
// `items` is [{ key, label, href }].
export default function HelpSidebar({ title, items, current }) {
  return (
    <div className="rt-doc__side">
      <nav className="rt-doc__side-in" aria-label={title}>
        <p className="rt-doc__side-title">{title}</p>
        <ul className="rt-doc__side-sections">
          {items.map((x) => (
            <li key={x.key}>
              <Link href={x.href} className={x.key === current ? "is-active" : undefined} aria-current={x.key === current ? "page" : undefined}>
                <span>{x.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
