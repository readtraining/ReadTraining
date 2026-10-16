"use client";

import { createContext, useContext } from "react";
import { setTaxonomy } from "@/lib/taxonomy";

// The catalogue list in the browser: given once by the root layout (which loads it on the server), set before the pages
// render so lib/taxonomy.js lookups work in every component; useTaxonomy() returns the whole list.
const TaxonomyContext = createContext(null);

export function TaxonomyProvider({ value, children }) {
  setTaxonomy(value);
  return <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>;
}

export const useTaxonomy = () => useContext(TaxonomyContext);
