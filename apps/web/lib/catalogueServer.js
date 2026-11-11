import "server-only";
import { cache } from "react";
import { pickCourses, toCatalogueCourse } from "@/lib/catalogueData";
import { toCourseCard } from "@/lib/courses";
import { withLinks } from "@/lib/nav";
import { coursePages } from "@/data/coursePages";
import { buildCatalogueQuery, filterCourses, matchesKeyword, parseCatalogueParams } from "@/lib/catalogueFilters";
import { CATALOGUE_HREF, coursePath } from "@/lib/routes";
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

// Where a typed town, postcode area or postcode is on the map (catalogue.locate): { lat, lng, label }; null when there is no such
// place; undefined when the API can't be asked.
export const locatePlace = cache(async (words) => {
  try {
    return await query("catalogue.locate", { q: String(words).trim().slice(0, 80) });
  } catch {
    return undefined;
  }
});

// A town page's town with no venue there yet (lib/coursePages.js getCourseTownPage): the UK place of that name on the map
// (catalogue.locate), with its proper name; null when there is none, so /courses/<page>/islamabad is "page not found";
// undefined when the API can't be asked, so the page still shows.
export const ukPlace = cache(async (townSlug) => {
  const name = String(townSlug).replace(/-/g, " ").slice(0, 80);
  if (name.length < 2) return null;
  const hit = await locatePlace(name);
  if (hit === undefined) return undefined;
  // "King's Lynn" and the address's "kings-lynn" read the same
  const key = (v) => String(v || "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  return hit && key(hit.label) === key(name) ? hit.label : null;
});

// A course, or some words, in a place (the header's "Find a course near you", the home page's search, the old
// /course-locations addresses): where to go so it never lands on "No courses match" because of the place. The search for it
// there when that finds something (venues within NEAR_KM of the place on the map, or courses taken online, as the search
// itself counts); otherwise a chosen course (`slug`) opens its own page, with every date it has, and words are searched for
// everywhere. `method`: a way of study as the search reads it (?method=). Words no live course has stay as typed, so the
// search says so.
export async function nearHref({ slug = "", q = "", location = "", method = "" }) {
  await loadTaxonomy(); // the subject names the search also matches
  const all = await loadCatalogue();
  const state = { ...parseCatalogueParams(new URLSearchParams({ q, location, method })), sort: undefined };
  const point = state.location ? (await locatePlace(state.location)) || null : null;
  const finds = (s) => filterCourses(all, s, point).length > 0;
  const search = (s) => {
    const qs = buildCatalogueQuery(s);
    return qs ? `${CATALOGUE_HREF}?${qs}` : CATALOGUE_HREF;
  };
  if (slug) {
    const course = all.find((c) => c.slug === slug);
    const place = { ...state, q: "" };
    // a course that has gone since the menu was loaded: what runs in the place, or every course
    if (!course) return finds(place) ? search(place) : CATALOGUE_HREF;
    return filterCourses([course], place, point).length ? search({ ...state, q: course.title }) : coursePath(course.slug);
  }
  return !state.location || finds(state) ? search(state) : search({ ...state, location: "" });
}
