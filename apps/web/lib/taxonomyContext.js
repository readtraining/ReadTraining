"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { setTaxonomy } from "@/lib/taxonomy";

// The catalogue list in the browser: given once by the root layout (which loads it on the server), set before the pages
// render so lib/taxonomy.js lookups work in every component; useTaxonomy() returns the whole list.
// A page that was built ahead of time can arrive without the list (on Vercel the pages are built before the site's API is
// running): then the browser fetches it from the API straight away. While that runs the list is `loading`, so the page waits
// rather than showing an error; `unavailable` stays only if the API can't be reached at all, and `retry()` asks again.
const TaxonomyContext = createContext(null);
const EMPTY = { categories: [], methods: [], levels: [] };

export function TaxonomyProvider({ value, children }) {
  const [taxonomy, setList] = useState(() => (value?.categories?.length ? value : { ...EMPTY, unavailable: true, loading: true }));
  setTaxonomy(taxonomy);

  useEffect(() => {
    if (!taxonomy.loading) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/trpc/catalogue.taxonomy`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => body?.result?.data?.json)
      .then((list) => setList(list?.categories?.length ? list : { ...EMPTY, unavailable: true }))
      .catch(() => setList({ ...EMPTY, unavailable: true }));
  }, [taxonomy.loading]);

  const retry = () => setList({ ...EMPTY, unavailable: true, loading: true });
  return <TaxonomyContext.Provider value={{ ...taxonomy, retry }}>{children}</TaxonomyContext.Provider>;
}

export const useTaxonomy = () => useContext(TaxonomyContext);
