"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PRICE_BOUNDS, buildCatalogueQuery, defaultSort, parseCatalogueParams } from "@/lib/catalogueFilters";
import { CATALOGUE_HREF } from "@/lib/routes";
import { subcategoriesOf } from "@/lib/taxonomy";
import { useTaxonomy } from "@/lib/taxonomyContext";

const CHECKBOX_GROUPS = ["subject", "sub", "method", "level"];
// The filter keys that "Remove last filter" can undo.
const FILTER_KEYS = [...CHECKBOX_GROUPS, "min", "max", "location", "q"];
const same = (a, b) => (Array.isArray(a) ? a.length === b.length && a.every((v, i) => v === b[i]) : a === b);
const snapshot = (state) => Object.fromEntries(FILTER_KEYS.map((k) => [k, Array.isArray(state[k]) ? [...state[k]] : state[k]]));
const sameFilters = (a, b) => FILTER_KEYS.every((k) => same(a[k], b[k]));

const TICK_DEBOUNCE = 250;

// Single source of truth for the catalogue: the URL query string.
// - Checkbox groups (subject, sub, method, level) hold several values; price is one range.
// - Ticks show instantly (an optimistic copy of the state), while the URL write is debounced 250ms, so ticking three
//   boxes quickly makes ONE update. `afterCommit` runs once, after that single write.
// - URL changes use the History API (Next.js keeps useSearchParams in sync), so there is no server request and no
//   scroll jump. One rule for Back: every change the visitor makes (a filter, the sort, the page, the location, the words) is
//   one history entry, so Back undoes exactly one change. Ticks made together in the debounce are one change; typing in a field
//   (`typing: "q"` or "location") is one change for as long as they keep typing in it, so Back undoes the whole word, not a
//   letter. Writing the address the page already has (or tidying it) adds no entry.
// The options are the course page's own choices (all optional):
// - `subject`: a subject page's subject (/courses/first-aid): its sub-subjects work without a ticked subject;
// - `location`: a town page's town (/courses/first-aid/leeds), the location the address leaves out;
// - `fixed`: the filters the page sets itself or doesn't show, which the address can't set (lib/catalogueFilters.js);
// - `towns` ([{ city, href }]) and `parentHref`: a town page's other towns and its course page.
// One address per search: one subject ticked on All courses is that subject's page (/courses/security, as the proxy sends
// /courses?subject=security), and a town page whose town is removed or changed is its course page with that location, or the
// other town's page. Such a change opens that page (keeping the other filters) instead of rewriting this one's address.
// The address is read against the catalogue list, so it is read again when the list arrives (a page built ahead of time
// fetches it in the browser), and it is never tidied while the list is still unknown, or ?subject=… would be lost.
const NONE = [];
export function useCourseQuery({ subject: baseSubject = "", location: baseLocation = "", fixed = NONE, towns = NONE, parentHref = "" } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fixedKey = fixed.join();
  const base = useMemo(
    () => ({ ...(baseSubject ? { subject: baseSubject } : {}), ...(baseLocation ? { location: baseLocation } : {}), fixed: fixedKey ? fixedKey.split(",") : [] }),
    [baseSubject, baseLocation, fixedKey],
  );
  const taxonomy = useTaxonomy();
  const listKnown = Boolean(taxonomy?.categories?.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const urlState = useMemo(() => parseCatalogueParams(searchParams, base), [searchParams, base, taxonomy]);

  // the address of another page that a search belongs on (above), or null when it belongs here
  const elsewhere = useCallback(
    (next) => {
      const at = (href, state, pageBase) => {
        const query = buildCatalogueQuery(state, pageBase);
        return query ? `${href}?${query}` : href;
      };
      if (!baseSubject && !baseLocation && pathname === CATALOGUE_HREF && next.subject.length === 1) {
        return at(`${CATALOGUE_HREF}/${next.subject[0]}`, { ...next, subject: [] }, { subject: next.subject[0] });
      }
      if (baseLocation && parentHref && next.location !== baseLocation) {
        const key = (v) => (v || "").trim().toLowerCase();
        const town = next.location && towns.find((t) => key(t.city) === key(next.location));
        const pageBase = baseSubject ? { subject: baseSubject } : {};
        return town ? at(town.href, { ...next, location: town.city }, { ...pageBase, location: town.city }) : at(parentHref, next, pageBase);
      }
      return null;
    },
    [baseSubject, baseLocation, pathname, parentHref, towns],
  );

  const [pending, setPending] = useState(null); // optimistic state while a debounced write is waiting
  const state = pending ?? urlState;
  const stateRef = useRef(state);
  stateRef.current = state;

  const timer = useRef(null);
  const commit = useRef({ query: "", mode: "push", after: null });
  // the field the last write came from while typing in it ("q", "location"), so its next write replaces instead of adding one
  const typingIn = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  // Back or Forward lands on another entry: typing after it adds a new one, never overwrites the entry gone back to
  useEffect(() => {
    const moved = () => (typingIn.current = null);
    window.addEventListener("popstate", moved);
    return () => window.removeEventListener("popstate", moved);
  }, []);

  const writeUrl = useCallback(
    (query, mode) => {
      const url = query ? `${pathname}?${query}` : pathname;
      // the page is already at this address: nothing to add (a search pressed after typing the same words, an unchanged sort)
      if (url === `${window.location.pathname}${window.location.search}`) return;
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [pathname],
  );

  // Drop the optimistic copy as soon as the URL changes and no write is waiting: either it just caught up with our
  // own write, or the user navigated (Back / Forward) and the URL must win.
  useEffect(() => {
    if (!timer.current) setPending(null);
  }, [urlState]);

  // Tidy the address bar: unknown values, duplicates, unsorted lists and legacy names are rewritten to the clean form, and a
  // search that belongs on another page goes there.
  useEffect(() => {
    if (pending || !listKnown) return;
    const away = elsewhere(urlState);
    if (away) return router.replace(away, { scroll: false });
    const clean = buildCatalogueQuery(urlState, base);
    const current = searchParams.toString().replace(/%2C/g, ",");
    if (current && clean !== current) {
      if (parseCatalogueParams(new URLSearchParams(current), base).page === urlState.page) writeUrl(clean, "replace");
    }
  }, [searchParams, urlState, pending, writeUrl, base, listKnown, elsewhere, router]);

  // Small history of filter changes so the latest single change can be undone ("Remove last filter").
  const history = useRef([]);
  const [canUndo, setCanUndo] = useState(false);

  const update = useCallback(
    (patch, { record = true, push = true, typing = null, debounce = 0, afterCommit = null } = {}) => {
      // `prev` is the search as it stands; `base` stays the page's own defaults (a town page's town, a subject page's subject),
      // which the address leaves out
      const prev = stateRef.current;
      const next = { ...prev, page: 1, ...patch };
      // Entering a location switches to "Closest"; clearing it goes back to "Most popular".
      if ("location" in patch && patch.location !== prev.location) next.sort = defaultSort(next.location);
      // Sub-subjects only make sense under a ticked subject.
      if ("subject" in patch && !("sub" in patch)) {
        const allowed = new Set([...next.subject, ...(baseSubject ? [baseSubject] : [])].flatMap((sv) => subcategoriesOf(sv).map((x) => x.slug)));
        next.sub = next.sub.filter((v) => allowed.has(v));
      }
      if (record && !sameFilters(prev, next)) {
        history.current.push(snapshot(prev));
        setCanUndo(true);
      }
      setPending(next);
      stateRef.current = next;
      // more typing in the same field replaces its entry; anything else adds one. A write still waiting (debounced ticks) keeps
      // "add" if either change wanted it, so merged changes are still one entry.
      const own = !push ? "replace" : typing && typingIn.current === typing ? "replace" : "push";
      const waiting = Boolean(timer.current);
      clearTimeout(timer.current);
      const mode = waiting && commit.current.mode === "push" ? "push" : own;
      commit.current = { state: next, query: buildCatalogueQuery(next, base), mode, after: afterCommit, typing };
      timer.current = setTimeout(() => {
        timer.current = null;
        const { state: committed, query, mode: m, after, typing: field } = commit.current;
        const away = elsewhere(committed);
        if (away) return m === "push" ? router.push(away, { scroll: false }) : router.replace(away, { scroll: false });
        writeUrl(query, m);
        typingIn.current = field || null;
        after?.();
      }, debounce);
    },
    [writeUrl, base, baseSubject, elsewhere, router],
  );

  // Checkbox groups: add or remove ONE value (debounced). Unticking a subject also drops its sub-subjects.
  const toggleFilter = useCallback(
    (group, value, opts = {}) => {
      const current = stateRef.current[group] || [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      update({ [group]: next }, { debounce: TICK_DEBOUNCE, ...opts });
    },
    [update],
  );
  // Price and any single value: one entry per change (typing a price range counts as one, like the words).
  const setFilter = useCallback((key, value, opts = {}) => update({ [key]: value }, opts), [update]);
  const setPrice = useCallback((min, max, opts = {}) => update({ min, max }, opts), [update]);
  const clearGroup = useCallback(
    (group, opts = {}) => {
      if (group === "price") update({ min: PRICE_BOUNDS.min, max: PRICE_BOUNDS.max }, opts);
      else if (group === "subject") update({ subject: [], sub: [] }, opts);
      else update({ [group]: [] }, opts);
    },
    [update],
  );
  const clearAll = useCallback(
    (opts = {}) =>
      update({ subject: [], sub: [], method: [], level: [], location: "", q: "", min: PRICE_BOUNDS.min, max: PRICE_BOUNDS.max }, opts),
    [update],
  );
  const setSort = useCallback((sort, opts = {}) => update({ sort }, opts), [update]);
  const setPage = useCallback((page, { push = true } = {}) => update({ page }, { record: false, push }), [update]);

  const undoLast = useCallback(
    (opts = {}) => {
      const previous = history.current.pop();
      setCanUndo(history.current.length > 0);
      if (previous) update(previous, { record: false, ...opts });
    },
    [update],
  );

  return { state, pathname, base, update, toggleFilter, setFilter, setPrice, clearGroup, clearAll, setSort, setPage, undoLast, canUndo };
}
