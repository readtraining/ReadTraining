import React from "react";
import Link from "next/link";

// The Skill Saver badge on a course in the programme (cards, the course page, basket lines). With `href` it links to the
// programme page; inside a card that is already a link it is a plain label.
export default function SaverBadge({ href, className = "" }) {
  const body = <><i className="icon-star" aria-hidden="true"></i>Skill Saver</>;
  return href ? (
    <Link href={href} className={`rt-sv-badge ${className}`} title="Skill Saver course: members get their level discount">{body}</Link>
  ) : (
    <span className={`rt-sv-badge ${className}`}>{body}</span>
  );
}
