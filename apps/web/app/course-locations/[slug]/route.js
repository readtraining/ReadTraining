import { NextResponse } from "next/server";
import { loadCoursePage, loadNav, searchFinds } from "@/lib/catalogueServer";
import { CATALOGUE_HREF, coursePath } from "@/lib/routes";

// The old course-in-a-town addresses (/course-locations/<slug>, from the previous site, still in search engines and old links).
// They used to send everyone to plain /courses, losing which course they were about. Now:
// - the slug is a live course (or is one with "-training" / "-course" on the end): that course's page, for good (308);
// - otherwise the course search for its words (left out when no live course has them), with a town at the end as the location
//   (temporary, 307, as courses come and go):
//   /course-locations/first-aid-at-work-leeds → /courses?q=first+aid+at+work&location=leeds
const FILLER = new Set(["training", "course", "courses", "in", "near", "uk"]);

export async function GET(request, { params }) {
  const { slug } = await params;
  const clean = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "").slice(0, 120);
  const here = new URL(request.url);
  for (const s of new Set([clean, clean.replace(/-(training|courses?)$/, "")])) {
    if (s && (await loadCoursePage(s))) return NextResponse.redirect(new URL(coursePath(s), here), 308);
  }
  const words = clean.split("-").filter(Boolean);
  // a town at the end (one to three words: "stoke-on-trent"), if it is one our venues are in
  const towns = new Set((await loadNav()).towns.map((t) => t.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()));
  let location = "";
  for (const n of [3, 2, 1]) {
    const tail = words.slice(-n).join(" ");
    if (words.length > n && towns.has(tail)) {
      location = tail;
      words.splice(-n);
      break;
    }
  }
  const search = new URLSearchParams();
  const q = words.filter((w) => !FILLER.has(w)).join(" ");
  // words no live course has would land on "No courses match": then the search is for the town alone (or all courses)
  if (q && (await searchFinds(`${CATALOGUE_HREF}?q=${encodeURIComponent(q)}`))) search.set("q", q);
  if (location) search.set("location", location);
  const query = search.toString();
  return NextResponse.redirect(new URL(`${CATALOGUE_HREF}${query ? `?${query}` : ""}`, here), 307);
}
