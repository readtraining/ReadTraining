import "server-only";
import { cache } from "react";
import { pickCourses, toCatalogueCourse } from "@/lib/catalogueData";
import { toCourseCard } from "@/lib/courses";

// Server side: the real catalogue from the API (catalogue.listings, catalogue.course), saved by Next for a minute under the tag
// "courses", so a course an admin approves (or a date a provider adds) shows on the site within a minute; an admin's decision
// marks it out of date at once (app/admin/actions.js). If the API can't be reached the pages show no courses rather than old
// or made-up ones. cache(): a page and its metadata share one request.
const API = process.env.NEXT_PUBLIC_API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:4000");
const REVALIDATE = 60;

async function query(procedure, input) {
  const url = `${API}/api/trpc/${procedure}${input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE, tags: ["courses"] } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${procedure}: ${res.status}`);
  return (await res.json())?.result?.data?.json ?? null;
}

// Every listing (most popular first); [] when the API can't be reached.
export const loadListings = cache(async () => {
  try {
    return (await query("catalogue.listings")) || [];
  } catch {
    return [];
  }
});

// One course page by its address; null when there is no such live page (or the API can't be reached).
export const loadCoursePage = cache(async (slug) => {
  try {
    return await query("catalogue.course", { slug: String(slug).slice(0, 120) });
  } catch {
    return null;
  }
});

// Each category's number of courses and its three most popular, for the header's subject menu.
export const loadCourseMenu = cache(async () => {
  try {
    return (await query("catalogue.menu")) || {};
  } catch {
    return {};
  }
});

// Every listing as a catalogue course (lib/catalogueData.js toCatalogueCourse), for the pages that pick some of them.
export const loadCatalogue = cache(async () => (await loadListings()).map(toCatalogueCourse));

// The course cards a marketing or help page shows: the live courses under its picks (data/courseTopics.js), most popular
// first, as the home page's cards (HomeCourseCard). [] when none is live yet: the page then leaves the cards out.
export async function courseCards(picks, limit = 4) {
  return pickCourses(await loadCatalogue(), picks, limit).map(toCourseCard);
}
