import React from "react";
import Link from "next/link";

// The breadcrumb of the course page and the test prep pages (.rt-cd__crumbs): `crumbs` is [{ label, href? }], the last one is the
// current page. `className` adds a page's own variant (as the test prep hero's .rt-tps__flat-crumbs).
export default function Crumbs({ crumbs, className = "" }) {
  return (
    <nav className={`rt-cd__crumbs${className ? ` ${className}` : ""}`} aria-label="Breadcrumb">
      <ol>
        {crumbs.map((c, i) => (
          <li key={i}>
            {c.href && i < crumbs.length - 1 ? <Link href={c.href} title={c.label}>{c.label}</Link> : <span aria-current="page" title={c.label}>{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
