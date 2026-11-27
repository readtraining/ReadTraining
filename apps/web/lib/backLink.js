"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { safeNext } from "@/lib/safeNext";
import { admin as A } from "@/data/admin";
import { pw } from "@/data/providerWorkspace";

// Back links that go back where you came from, in the admin and the provider workspace. A link to another page carries the page it
// was followed from in `?from=` (its address with its tab and filters, and its own `from`: withFrom); that page's back link goes
// there and names it (backTo), and without one goes to its usual parent, as before. `from` is only ever a page of the same area,
// checked with the sign-in redirects' rule (safeNext), so it can never lead off the site.

const KEY = "from";
const DEEP = 4; // pages kept behind the current one; older ones drop off
const pathOf = (url) => url.split(/[?#]/)[0];
const queryOf = (url) => (url.includes("?") ? url.slice(url.indexOf("?")).split("#")[0] : "");
const areaOf = (url) => (url.startsWith("/admin") ? "/admin" : url.startsWith("/provider") ? "/provider" : null);
const inArea = (url, root) => url === root || url.startsWith(`${root}/`) || url.startsWith(`${root}?`);

// the page `search` (a query string) says this one was opened from, when it is a page of the same area
export function fromOf(search, root) {
  const v = new URLSearchParams(search).get(KEY);
  if (!v || !root) return null;
  const s = safeNext(v, "");
  return s && inArea(s, root) ? s : null;
}

// `url` with its `from` chain cut to `depth` pages
function trimmed(url, depth) {
  const root = areaOf(url);
  const q = new URLSearchParams(queryOf(url));
  const f = fromOf(queryOf(url), root);
  if (!f) return url;
  if (depth <= 0) q.delete(KEY);
  else q.set(KEY, trimmed(f, depth - 1));
  return `${pathOf(url)}${q.size ? `?${q}` : ""}`;
}

/** `href` followed from the page at `here` (its path and query): it carries `here` as its `from`. A link to a page already behind
 * this one (the course's editor from its overview, opened from the editor) carries what was behind that page instead, so going
 * round in a circle never piles up; a link to this same page (another tab of it) keeps the `from` it has. */
export function withFrom(href, here) {
  const root = here && areaOf(here);
  if (!root || typeof href !== "string" || !inArea(href, root)) return href;
  if (pathOf(href) === pathOf(here)) {
    const f = fromOf(queryOf(here), root);
    if (!f || fromOf(queryOf(href), root)) return href;
    const q = new URLSearchParams(queryOf(href));
    q.set(KEY, f);
    return `${pathOf(href)}?${q}`;
  }
  // the pages behind: here, its from, that page's from, …
  const behind = [here];
  for (let f = fromOf(queryOf(here), root); f && behind.length < 10; f = fromOf(queryOf(f), root)) behind.push(f);
  const seen = behind.findIndex((b) => pathOf(b) === pathOf(href));
  const from = seen === -1 ? here : behind[seen + 1];
  const q = new URLSearchParams(queryOf(href));
  if (from) q.set(KEY, trimmed(from, DEEP - 1));
  else q.delete(KEY);
  return `${pathOf(href)}${q.size ? `?${q}` : ""}`;
}

// What a page is called in a back link: the menu's name for a list, or what a record's page is
const ADMIN_PAGES = [
  [/^\/admin\/catalogue\/[^/]+\/edit$/, "Edit course"],
  [/^\/admin\/catalogue\/[^/]+$/, "Course"],
  [/^\/admin\/providers\/[^/]+\/plans$/, "Price plans"],
  [/^\/admin\/providers\/[^/]+\/dates$/, "Dates"],
  [/^\/admin\/providers\/[^/]+\/profile$/, "Profile and venues"],
  [/^\/admin\/providers\/[^/]+$/, "Provider"],
  [/^\/admin\/orders\/[^/]+$/, "Order"],
  [/^\/admin\/learners\/[^/]+$/, "Learner"],
];
const PROVIDER_PAGES = [
  [/^\/provider\/courses\/[^/]+\/overview$/, "Course details"],
  [/^\/provider\/courses\/[^/]+$/, "Edit course"],
  [/^\/provider\/cohorts\/[^/]+$/, "Cohort"],
  [/^\/provider\/orders\/new$/, "New order"],
  [/^\/provider\/orders\/[^/]+$/, "Order"],
  [/^\/provider\/learners\/[^/]+$/, "Learner"],
  [/^\/provider\/review$/, "Account review"],
  [/^\/provider\/notifications$/, "Notifications"],
  [/^\/provider\/packages$/, "Price plans"],
  [/^\/provider\/courses$/, "Courses"],
];
const menuItems = (nav) => nav.flatMap((x) => (x.items ? x.items : [x]));
export function pageName(url) {
  const path = pathOf(url);
  const admin = path.startsWith("/admin");
  const found = (admin ? ADMIN_PAGES : PROVIDER_PAGES).find(([re]) => re.test(path));
  if (found) return found[1];
  const item = menuItems(admin ? A.nav : pw.nav).find((x) => x.href && pathOf(x.href) === path);
  return item?.label ?? "Back";
}

/** Where this page's back link goes: the page it was opened from (with its name), or `fallback` ({ label, href }, its usual parent) */
export function backTo(search, path, fallback) {
  const f = fromOf(search, areaOf(path || ""));
  return f ? { label: pageName(f), href: f } : fallback;
}

// the address's query, read from the browser on each render (not useSearchParams, which a page built ahead of time, such as the
// basket's, can't use without a Suspense boundary); the server's first render has none, then the browser's has it
const noop = () => () => {};
const readSearch = () => window.location.search;
const noSearch = () => "";

/** This page's address (path and query), for withFrom on the links it shows */
export function useHere() {
  const path = usePathname();
  const search = useSyncExternalStore(noop, readSearch, noSearch);
  return `${path}${search}`;
}

/** A link from this page that carries it as `from`: `const link = useFromLink(); <Link href={link("/admin/…")}>` */
export function useFromLink() {
  const here = useHere();
  return (href) => withFrom(href, here);
}
