"use client";

import React, { useRef } from "react";
import { useSearchParams } from "next/navigation";
import ProviderCard from "./ProviderCard";
import CataloguePagination from "@/components/courses/CataloguePagination";
import { PROVIDERS_HREF, PROVIDERS_PAGE_SIZE } from "@/lib/providers";

// The providers directory: the count and a "Show all" toggle, the providers as cards, then the page links. `?page=` is the page
// and `?show=all` lists every provider at once (as Hurak's "Show all"), so a page of the list can be shared. The address is
// written with the History API, which Next.js keeps in sync with useSearchParams, so changing page does not reload.
export default function ProviderDirectory({ providers }) {
  const params = useSearchParams();
  const resultsRef = useRef(null);

  const totalPages = Math.max(1, Math.ceil(providers.length / PROVIDERS_PAGE_SIZE));
  const showAll = params.get("show") === "all";
  const page = showAll ? 1 : Math.min(Math.max(parseInt(params.get("page"), 10) || 1, 1), totalPages);
  const shown = showAll ? providers : providers.slice((page - 1) * PROVIDERS_PAGE_SIZE, page * PROVIDERS_PAGE_SIZE);

  const hrefFor = (p) => (p === 1 ? PROVIDERS_HREF : `${PROVIDERS_HREF}?page=${p}`);
  const scrollToResults = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  const goToPage = (p) => {
    window.history.pushState(null, "", hrefFor(p));
    scrollToResults();
  };
  const toggleAll = () => window.history.pushState(null, "", showAll ? PROVIDERS_HREF : `${PROVIDERS_HREF}?show=all`);

  return (
    <div ref={resultsRef} className="rt-prov__results">
      <div className="rt-prov__bar">
        <p className="rt-prov__count" aria-live="polite"><strong>{providers.length}</strong> {providers.length === 1 ? "provider" : "providers"} found</p>
        {totalPages > 1 && (
          <button type="button" className="button -sm -outline-dark-1 text-dark-1 fb-btn" onClick={toggleAll}>
            {showAll ? "Show pages" : "Show all"}
          </button>
        )}
      </div>

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
