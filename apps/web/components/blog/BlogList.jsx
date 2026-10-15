"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PostCard from "./PostCard";
import BlogCover from "./BlogCover";
import CataloguePagination from "@/components/courses/CataloguePagination";

// The blog listing (#articles), in one column: the section head; the category chips in a row (.rt-tr__filter with counts, as the
// licence hub; "All" plus categories that tick on and off, several at once) with the article count beside them; then, on the
// unfiltered first page, the newest article as a wide featured card, and the rest in a grid of three (home's course card).
// Page links only appear past 12 articles. The address keeps the view (?category=security,first-aid&page=2) and the page reads
// it on the server, so the list is in the HTML.
const PAGE_SIZE = 12;
const countLabel = (n) => `${n} ${n === 1 ? "article" : "articles"}`;

// The newest article: the cover beside the category, the title, a three-line summary, the date and reading time and a link cue.
function FeaturedPost({ post: p, copy }) {
  return (
    <Link href={p.href} className="rt-ucard rt-bfeat">
      <div className="rt-ucard__image rt-bfeat__image">
        <BlogCover category={p.category} />
      </div>
      <div className="rt-bfeat__body">
        <span className="rt-bfeat__tag">{copy.featured}</span>
        <span className="rt-bcard__cat">{p.category.label}</span>
        <h3 className="rt-bfeat__title">{p.title}</h3>
        <p className="rt-bfeat__summary">{p.summary}</p>
        <p className="rt-bcard__meta">
          <time dateTime={p.published}>{p.date}</time>
          <span aria-hidden="true">·</span>
          {p.readTime}
        </p>
        <span className="fb-textlink rt-bfeat__cue" aria-hidden="true">{copy.read}<i className="icon-arrow-right text-12"></i></span>
      </div>
    </Link>
  );
}

export default function BlogList({ posts, categories, copy, baseHref, initialCategory = "", initialPage = 1 }) {
  const [selected, setSelected] = useState(() => String(initialCategory).split(",").filter((k) => categories.some((c) => c.key === k)));
  const [page, setPage] = useState(Math.max(1, Number(initialPage) || 1));

  const search = (p, keys) => {
    const params = new URLSearchParams();
    if (keys.length) params.set("category", keys.join(","));
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${baseHref}${qs ? `?${qs}` : ""}`;
  };
  const list = useMemo(() => posts.filter((p) => !selected.length || selected.includes(p.category.key)), [posts, selected]);
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, totalPages); // a page past the end (an old link) shows the last page

  // keep the filters in the address so a filtered view can be shared
  useEffect(() => {
    try {
      window.history.replaceState(window.history.state, "", search(current, selected));
    } catch {}
  }, [selected, current]); // eslint-disable-line react-hooks/exhaustive-deps
  const pageItems = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  // the newest article leads the unfiltered first page; filtered, every article is a card
  const featured = !selected.length && current === 1 && pageItems.length > 2 ? pageItems[0] : null;
  const rest = featured ? pageItems.slice(1) : pageItems;

  // "All" unticks every category; a category ticks or unticks itself; ticking the last one is the same as "All".
  const toggle = (key) => {
    const next = !key ? [] : selected.includes(key) ? selected.filter((k) => k !== key) : categories.filter((c) => c.key === key || selected.includes(c.key)).map((c) => c.key);
    setSelected(next.length === categories.length ? [] : next);
    setPage(1);
  };
  const goToPage = (p) => {
    setPage(p);
    document.getElementById("articles")?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const chips = [{ key: "", label: copy.allLabel, count: posts.length }, ...categories];

  return (
    <section className="fb-section -white rt-blog__list" id="articles" aria-labelledby="rt-blog-h">
      <div className="container">
        <div className="rt-blog__head">
          <div>
            <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{copy.eyebrow}</div>
            <h2 className="fb-title" id="rt-blog-h">{copy.title}</h2>
          </div>
          <p className="rt-blog__count" aria-live="polite">{countLabel(list.length)}</p>
        </div>

        <div className="rt-blog__chips" role="group" aria-label={copy.filterLabel}>
          {chips.map((c) => {
            const active = c.key ? selected.includes(c.key) : selected.length === 0;
            return (
              <button key={c.key || "all"} type="button" className={`rt-tr__filter${active ? " is-on" : ""}`} aria-pressed={active} onClick={() => toggle(c.key)}>
                {c.label} <span className="rt-lic__count">{c.count}</span>
              </button>
            );
          })}
        </div>

        {featured && <FeaturedPost post={featured} copy={copy} />}

        <ul className="rt-blog__grid rt-blog__cards">
          {rest.map((p) => (
            <li key={p.slug}>
              <PostCard post={p} />
            </li>
          ))}
        </ul>
        {totalPages > 1 && <CataloguePagination page={current} totalPages={totalPages} hrefFor={(p) => `${search(p, selected)}#articles`} onNavigate={goToPage} />}
      </div>
    </section>
  );
}
