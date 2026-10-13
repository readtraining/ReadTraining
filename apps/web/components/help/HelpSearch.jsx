"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const MIN = 2;
const MAX = 6;

// The Help Centre search, in the Test Prep hub's search bar (.rt-cat-search): suggestions as you type (from 2 letters), an
// ARIA combobox with a listbox (arrow keys move, Enter opens, Escape closes), the number of results announced, and, when nothing
// matches, a link to the contact page. Search looks through every article's title, summary and topic; each word must match.
// `items` is [{ title, summary, topic, href }].
export default function HelpSearch({ items, placeholder = "Search help articles", contactHref = "/contact-us" }) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const ready = query.trim().length >= MIN;
  const results = useMemo(() => {
    if (!ready) return [];
    return items.filter((x) => {
      const text = `${x.title} ${x.summary} ${x.topic}`.toLowerCase();
      return words.every((w) => text.includes(w));
    }).slice(0, MAX);
  }, [items, ready, words.join(" ")]); // eslint-disable-line react-hooks/exhaustive-deps

  const show = open && ready;
  const go = (href) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const pick = results[active] || results[0];
    if (pick) go(pick.href);
    else inputRef.current?.focus();
  };

  return (
    <div className="rt-help__search">
      <form className="rt-cat-search" role="search" onSubmit={onSubmit}>
        <div className="rt-cat-search__field">
          <i className="icon-search text-16 text-light-1" aria-hidden="true"></i>
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder={placeholder}
            aria-label={placeholder}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={show}
            aria-controls={listId}
            aria-activedescendant={show && active >= 0 ? `${id}-opt-${active}` : undefined}
            autoComplete="off"
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
          />
        </div>
        <button type="submit" className="rt-cat-search__btn">
          <i className="icon-search" aria-hidden="true"></i>
          <span>Search</span>
        </button>
      </form>
      <div className="rt-help__results" hidden={!show}>
        {results.length > 0 ? (
          <ul id={listId} role="listbox" aria-label="Help articles">
            {results.map((x, i) => (
              <li
                key={x.href}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "is-active" : undefined}
                onMouseDown={(e) => { e.preventDefault(); go(x.href); }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="rt-help__result-title">{x.title}</span>
                <span className="rt-help__result-topic">{x.topic}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rt-help__none" id={listId}>
            No articles match &ldquo;{query.trim()}&rdquo;. <Link href={contactHref} onMouseDown={(e) => e.preventDefault()}>Contact us</Link> and we will help.
          </p>
        )}
      </div>
      <p className="rt-sr" aria-live="polite">{show ? `${results.length} ${results.length === 1 ? "article" : "articles"} found` : ""}</p>
    </div>
  );
}
