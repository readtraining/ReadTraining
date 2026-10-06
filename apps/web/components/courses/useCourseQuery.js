"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PRICE_BOUNDS, buildCatalogueQuery, defaultSort, parseCatalogueParams, subSubjects } from "@/data/courseCatalogue";

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
//   scroll jump. Filter changes replace the entry; page changes push one so Back / Forward restore the page.
export function useCourseQuery() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlState = useMemo(() => parseCatalogueParams(searchParams), [searchParams]);

  const [pending, setPending] = useState(null); // optimistic state while a debounced write is waiting
  const state = pending ?? urlState;
  const stateRef = useRef(state);
  stateRef.current = state;

  const timer = useRef(null);
  const commit = useRef({ query: "", mode: "replace", after: null });
  useEffect(() => () => clearTimeout(timer.current), []);

  const writeUrl = useCallback(
    (query, mode) => {
      const url = query ? `${pathname}?${query}` : pathname;
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

  // Tidy the address bar: unknown values, duplicates, unsorted lists and legacy names are rewritten to the clean form.
  useEffect(() => {
    if (pending) return;
    const clean = buildCatalogueQuery(urlState);
    const current = searchParams.toString().replace(/%2C/g, ",");
    if (current && clean !== current) {
      if (parseCatalogueParams(new URLSearchParams(current)).page === urlState.page) writeUrl(clean, "replace");
    }
  }, [searchParams, urlState, pending, writeUrl]);

  // Small history of filter changes so the latest single change can be undone ("Remove last filter").
  const history = useRef([]);
  const [canUndo, setCanUndo] = useState(false);

  const update = useCallback(
    (patch, { record = true, push = false, debounce = 0, afterCommit = null } = {}) => {
      const base = stateRef.current;
      const next = { ...base, page: 1, ...patch };
      // Entering a location switches to "Closest"; clearing it goes back to "Most popular".
      if ("location" in patch && patch.location !== base.location) next.sort = defaultSort(next.location);
      // Sub-subjects only make sense under a ticked subject.
      if ("subject" in patch && !("sub" in patch)) {
        const allowed = new Set(next.subject.flatMap((sv) => (subSubjects[sv] || []).map((x) => x.value)));
        next.sub = next.sub.filter((v) => allowed.has(v));
      }
      if (record && !sameFilters(base, next)) {
        history.current.push(snapshot(base));
        setCanUndo(true);
      }
      setPending(next);
      stateRef.current = next;
      clearTimeout(timer.current);
      commit.current = { query: buildCatalogueQuery(next), mode: push ? "push" : "replace", after: afterCommit };
      timer.current = setTimeout(() => {
        timer.current = null;
        const { query, mode, after } = commit.current;
        writeUrl(query, mode);
        after?.();
      }, debounce);
    },
    [writeUrl],
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
  // Price (and any single value): replace.
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

  return { state, pathname, update, toggleFilter, setFilter, setPrice, clearGroup, clearAll, setSort, setPage, undoLast, canUndo };
}
