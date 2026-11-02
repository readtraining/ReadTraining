import React from "react";

// Where a review (or the overall rating) was first posted, e.g. "Google", as a small link to it there; plain text without a
// link, and nothing at all when no source is set. Opens in a new tab.
export default function SourceLink({ label, href, className = "rt-review__source" }) {
  if (!label) return null;
  if (!href) return <span className={className}>{label}</span>;
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {label}
      <span className="rt-sr"> (opens in a new tab)</span>
    </a>
  );
}
