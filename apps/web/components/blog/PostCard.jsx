import React from "react";
import Link from "next/link";
import BlogCover from "./BlogCover";

// An article card in home's course card (.rt-ucard): the cover, the category, the title, a two-line summary and the date and
// reading time. `post` is lib/blog's card shape; `as` is the title's heading level where the card sits.
export default function PostCard({ post: p, as: H = "h3" }) {
  return (
    <Link href={p.href} className="rt-ucard rt-bcard">
      <div className="rt-ucard__image">
        <BlogCover category={p.category} />
      </div>
      <span className="rt-bcard__cat">{p.category.label}</span>
      <H className="rt-ucard__title rt-bcard__title">{p.title}</H>
      <p className="rt-bcard__summary">{p.summary}</p>
      <p className="rt-ucard__meta rt-bcard__meta">
        <time dateTime={p.published}>{p.date}</time>
        <span aria-hidden="true">·</span>
        {p.readTime}
      </p>
    </Link>
  );
}
