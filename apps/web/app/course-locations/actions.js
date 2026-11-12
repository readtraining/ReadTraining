"use server";

import { nearHref } from "@/lib/catalogueServer";

const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Where "Find a course near you" (the header's Location menu) and the home page's search go: the search there, or, when nothing
// runs near the place, the course's own page or the search without the place (lib/catalogueServer.js nearHref). Reads only the
// public catalogue.
export async function findNear(input) {
  const i = input && typeof input === "object" ? input : {};
  return nearHref({ slug: text(i.slug, 120), q: text(i.q, 80), location: text(i.location, 80), method: text(i.method, 40) });
}
