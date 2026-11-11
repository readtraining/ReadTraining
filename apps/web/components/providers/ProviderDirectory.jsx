"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProviderCard from "./ProviderCard";
import CataloguePagination from "@/components/courses/CataloguePagination";
import { PROVIDERS_HREF, PROVIDERS_PAGE_SIZE } from "@/lib/providers";
import { EmptyState } from "@/components/states/States";

// The address of one view of the directory: the search (`q`), and the page (`page`, from 2) or every provider at once
// (`show=all`, as Hurak's "Show all"), so any view can be shared, refreshed or come back to with Back.
const viewHref = ({ q = "", page = 1, all = false }) => {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (all) p.set("show", "all");
  else if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `${PROVIDERS_HREF}?${s}` : PROVIDERS_HREF;
};

// The providers directory: a search (name, town, subject or headline, as you type), the count and a "Show all" toggle, the
// providers as cards, then the page links. The address is written with the History API, which Next.js keeps in sync with
// useSearchParams, so changing page does not reload.
export default function ProviderDirectory({ providers }) {
  return <Directory providers={providers} params={useSearchParams()} />;
}

// The directory for an address's `params` (null: the first page, with no search; the page's server-rendered stand-in until the
// browser has the address, so search engines and a slow connection get the cards and the page links).
export function Directory({ providers: all, params }) {
  const resultsRef = useRef(null);
  const urlQ = (params?.get("q") || "").trim().slice(0, 80);
  const showAll = params?.get("show") === "all";
  const [q, setQ] = useState(urlQ);
  // Back or Forward to another search: the box shows it
  useEffect(() => setQ((typed) => (typed.trim() === urlQ ? typed : urlQ)), [urlQ]);
  // a new search goes into the address (replaced, not added to the history), from page 1, keeping "Show all"
  useEffect(() => {
    const words = q.trim();
    if (words === urlQ) return;
    const t = setTimeout(() => window.history.replaceState(null, "", viewHref({ q: words, all: showAll })), 300);
    return () => clearTimeout(t);
  }, [q, urlQ, showAll]);

  const needle = q.trim().toLowerCase();
  // a provider matches on its name, where it is based, its headline, its subjects or a town it runs dates in
  const providers = needle ? all.filter((p) => [p.name, p.city, p.headline, ...p.subjects, ...p.towns].join(" ").toLowerCase().includes(needle)) : all;

  const totalPages = Math.max(1, Math.ceil(providers.length / PROVIDERS_PAGE_SIZE));
  // ?page= is a whole number from 1; anything else is page 1, and one past the end is the last page
  const asked = Number(params?.get("page"));
  const page = showAll || !Number.isInteger(asked) || asked < 1 ? 1 : Math.min(asked, totalPages);
  const shown = showAll ? providers : providers.slice((page - 1) * PROVIDERS_PAGE_SIZE, page * PROVIDERS_PAGE_SIZE);

  const hrefFor = (p) => viewHref({ q: q.trim(), page: p });
  const goToPage = (p) => {
    window.history.pushState(null, "", hrefFor(p));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  const toggleAll = () => window.history.pushState(null, "", viewHref({ q: q.trim(), all: !showAll }));

  return (
    <div ref={resultsRef} className="rt-prov__results">
      <form className="rt-cat-search rt-prov__search" role="search" onSubmit={(e) => e.preventDefault()} noValidate>
        <div className="rt-cat-search__field">
          <i className="icon-search text-16 text-light-1" aria-hidden="true"></i>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} placeholder="Search by provider, town or subject" aria-label="Search providers by name, town or subject" autoComplete="off" />
        </div>
      </form>
      <div className="rt-prov__bar">
        <p className="rt-prov__count" aria-live="polite"><strong>{providers.length}</strong> {providers.length === 1 ? "provider" : "providers"} found</p>
        {totalPages > 1 && (
          <button type="button" className="button -sm -outline-dark-1 text-dark-1 fb-btn" onClick={toggleAll}>
            {showAll ? "Show pages" : "Show all"}
          </button>
        )}
      </div>

      {!providers.length && <EmptyState title={needle ? "No providers match your search." : "No providers yet."} text={needle ? "Try another name, town or subject." : "Approved training providers will show here."} action={needle ? { label: "Clear the search", onClick: () => setQ("") } : null} />}
      <ul className="rt-prov__grid">
        {shown.map((p) => (
          <li key={p.slug}>
            <ProviderCard provider={p} />
          </li>
        ))}
      </ul>

      {!showAll && totalPages > 1 && (
        <div className="rt-prov__pager">
          <CataloguePagination page={page} totalPages={totalPages} hrefFor={hrefFor} onNavigate={goToPage} />
        </div>
      )}
    </div>
  );
}
