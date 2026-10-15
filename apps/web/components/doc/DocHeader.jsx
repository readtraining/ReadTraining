import React from "react";
import Link from "next/link";

// A document's header (as Google's legal pages, no banner): the breadcrumb, the title, a short intro and one muted line with
// the dates and version. `crumbs` is [{ label, href? }] (the last is the current page); `meta` is [{ label, value, dateTime? }].
export default function DocHeader({ crumbs, title, lead, meta = [] }) {
  return (
    <header className="rt-doc__head">
      <nav className="rt-doc__crumbs" aria-label="Breadcrumb">
        <ol>
          {crumbs.map((c, i) => (
            <li key={c.label}>
              {c.href && i < crumbs.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <h1 className="rt-doc__title" id="rt-doc-title">{title}</h1>
      {lead && <p className="rt-doc__lead">{lead}</p>}
      {meta.length > 0 && (
        <p className="rt-doc__meta">
          {meta.map((x, i) => (
            <span key={x.label}>
              {i > 0 && <span className="rt-doc__meta-dot" aria-hidden="true">·</span>}
              {`${x.label} `}
              {x.dateTime ? <time dateTime={x.dateTime}>{x.value}</time> : x.value}
            </span>
          ))}
        </p>
      )}
    </header>
  );
}
