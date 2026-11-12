import "server-only";
import { cache } from "react";
import { setTaxonomy } from "@/lib/taxonomy";
import { apiQuery, withLastGood } from "@/lib/apiServer";

// Server side: the catalogue list from the API (catalogue.taxonomy), cached by Next for 5 minutes, so a change an admin makes
// shows on the site within minutes without a deploy. Every page reads it, so when the API can't answer it is the last list this
// server had, else the error (lib/apiServer.js withLastGood), never an empty list in its place. While the site is built it is
// marked `unavailable` and the browser asks for it (lib/taxonomyContext.js). cache(): one request asks once (the layout, the page
// and its metadata all read it).
const UNAVAILABLE = { categories: [], methods: [], levels: [], unavailable: true };

export const loadTaxonomy = cache(withLastGood(async () => {
  const t = await apiQuery("catalogue.taxonomy", undefined, { revalidate: 300, tags: ["taxonomy"], whenBuilding: UNAVAILABLE });
  if (!t.unavailable) setTaxonomy(t);
  return t;
}));
