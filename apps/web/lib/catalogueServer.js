import "server-only";
import { cache } from "react";
import { pickCourses, toCatalogueCourse } from "@/lib/catalogueData";
import { toCourseCard } from "@/lib/courses";
import { withLinks } from "@/lib/nav";
import { coursePages } from "@/data/coursePages";
import { matchesKeyword } from "@/lib/catalogueFilters";
import { loadTaxonomy } from "@/lib/taxonomyServer";

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

// The site's navigation (API catalogue.nav: the subjects, methods, towns and courses every menu, the footer and the home page
// read), with each entry's address (lib/nav.js withLinks); empty lists when the API can't be reached.
export const loadNav = cache(async () => {
  let raw = null;
  try {
    raw = await query("catalogue.nav");
  } catch {}
  return withLinks(raw, methodPages);
});
// the delivery methods with a page of their own (/courses/<slug>), for the method links; the rest open the search filtered to them
export const methodPages = coursePages.filter((p) => p.select?.method && !p.select?.subject).map((p) => p.slug);

// Every listing as a catalogue course (lib/catalogueData.js toCatalogueCourse), for the pages that pick some of them.
export const loadCatalogue = cache(async () => (await loadListings()).map(toCatalogueCourse));

// The course cards a marketing or help page shows: the live courses under its picks (data/courseTopics.js), most popular
// first, as the home page's cards (HomeCourseCard). [] when none is live yet: the page then leaves the cards out.
export async function courseCards(picks, limit = 4) {
  return pickCourses(await loadCatalogue(), picks, limit).map(toCourseCard);
}

// ---- links that must lead somewhere --------------------------------------------------------------------------------------
// A link to the course search for some words (/courses?q=…, data/courseTopics.js courseSearch) leads to "No courses match" when
// no live course has those words. Pages built from fixed wording (the licence guides, Security Jobs) check their links here:
// one that would find nothing is left out, or turned into a way to ask us. Any other link passes.
export async function searchFinds(href) {
  const m = /^\/courses\?q=([^&#]+)$/.exec(href || "");
  if (!m) return true;
  const words = decodeURIComponent(m[1].replace(/\+/g, " "));
  await loadTaxonomy(); // the subject names the search also matches
  return (await loadCatalogue()).some((c) => matchesKeyword(c, words));
}
/** The links (each { href, … }) that lead to at least one live course. */
export async function liveLinks(links) {
  const ok = await Promise.all(links.map((l) => searchFinds(l.href)));
  return links.filter((_, i) => ok[i]);
}
/** `href`, or `fallback` (all courses) when it is a search that would find nothing. */
export async function liveHref(href, fallback = "/courses") {
  return (await searchFinds(href)) ? href : fallback;
}
