import React from "react";

// Where a review (or the overall rating) was first posted, e.g. "Google" or "Trustpilot", as plain text; nothing when no
// source is set. Not a link for now (the client's choice): the link to it there is kept with the review as a record only.
export default function SourceLabel({ label, className = "rt-review__source" }) {
  if (!label) return null;
  return <span className={className}>{label}</span>;
}
