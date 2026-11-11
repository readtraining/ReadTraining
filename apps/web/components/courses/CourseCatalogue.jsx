"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  PAGE_SIZE,
  PRICE_BOUNDS,
  buildCatalogueQuery,
  closestSortOption,
  filterCourses,
  catalogueFilterGroups,
  sortCourses,
  venueIn,
  takenAnywhere,
  matchesKeyword,
  nearestVenue,
  distanceLabel,
  NEAR_KM,
  sortOptions,
} from "@/lib/catalogueFilters";
import { MODE_METHOD } from "@/lib/courseModes";
import { subcategoryOptions } from "@/lib/taxonomy";
import { trackEvent, toItem } from "@/lib/analytics";
import { jsonLd } from "@/lib/seo";
import { useFocusTrap } from "@/lib/useFocusTrap";
import ActiveFilters from "./ActiveFilters";
import CatalogueCourseCard from "./CatalogueCourseCard";
import CatalogueDropdown from "./CatalogueDropdown";
import CatalogueFilters from "./CatalogueFilters";
import CataloguePagination from "./CataloguePagination";
import Toast from "./Toast";
import FilterScrollPill from "./FilterScrollPill";
import { useCourseQuery } from "./useCourseQuery";
import { EmptyState } from "@/components/states/States";
import { ErrorState } from "@/components/states/States";
import { useTaxonomy } from "@/lib/taxonomyContext";
import { api } from "@/lib/trpc/react";

// Quick links under the search: each searches for its course by name (the words go in the search field). One that would find no
// live course isn't shown, so none leads to an empty list.
const popularSearches = ["Door Supervisor", "CSCS Green Card", "First Aid at Work", "CCTV Operator", "Health & Safety Level 1"];
// a booking mode of the course page (?mode=) by its way of study, so a card on a method page opens the course on that method
const MODE_OF = Object.fromEntries(Object.entries(MODE_METHOD).map(([mode, method]) => [method, mode]));

const countLabel = (n) => `${n} ${n === 1 ? "course" : "courses"}`;

// One reusable catalogue. The URL query string is the single source of truth for filters, search, sort and page
// (see useCourseQuery). Everything below the hero scrolls with the page; only the filter panel is sticky.
// `scope` makes it a course page for one category (/courses/[slug]; `courses` is then that category's list):
// { title, lead, crumb, parent?: { label, title, href } (a town page's course page), location?, towns?, none? (a town page's town,
// the page's towns and its empty title), allHref, links: [{ label, href }], subject?, method?, hide: ["method" | "subject"],
// fixed (the filters the address can't set), filters: false for a short list, about: { title, text } }.
// A subject page's `subject` replaces the Subject filter with its sub-subjects ("Course type").
// The hero then shows the page's title and intro, and links to the other course pages instead of the popular searches.
// `courses`: the real listings (lib/catalogueData.js toCatalogueCourse), given by the page from the server.
export default function CourseCatalogue({ courses, scope = null }) {
  const taxonomy = useTaxonomy();
  const { state, pathname, base, update, toggleFilter, clearAll: clearAllRaw, setPage, undoLast, canUndo } = useCourseQuery({
    subject: scope?.subject,
    location: scope?.location,
    fixed: scope?.fixed,
    towns: scope?.towns,
    parentHref: scope?.parent?.href,
  });
  const [toast, setToast] = useState(null);

  const [locationDraft, setLocationDraft] = useState(state.location);
  const [qDraft, setQDraft] = useState(state.q);
  const pushedQ = useRef(state.q);
  const pushedLocation = useRef(state.location);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isSheet, setIsSheet] = useState(false); // filters render as a bottom sheet at 1024px and under
  const filterBtnRef = useRef(null);
  const closeBtnRef = useRef(null);
  const scrollRef = useRef(null);

  // The sticky header's height, published once as --header-offset so the sticky panel / toolbar sit below it.
  useEffect(() => {
    const header = document.querySelector("header.header");
    if (!header) return;
    const set = () => document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(header);
    window.addEventListener("resize", set);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", set);
      document.documentElement.style.removeProperty("--header-offset");
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const sync = () => setIsSheet(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  // Esc closes the panel; as a bottom sheet, Tab also stays inside it (the shared focus trap)
  const panelRef = useRef(null);
  useFocusTrap(filtersOpen && isSheet, panelRef, () => setFiltersOpen(false));
  useEffect(() => {
    if (!filtersOpen || isSheet) return;
    const onKey = (e) => e.key === "Escape" && setFiltersOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filtersOpen, isSheet]);
  // Sheet only: lock page scroll, move focus to the close button, give focus back to the Filters button on close.
  useEffect(() => {
    if (!isSheet || !filtersOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    const trigger = filterBtnRef.current;
    return () => {
      document.body.style.overflow = prevOverflow;
      trigger?.focus();
    };
  }, [isSheet, filtersOpen]);

  // Pull external URL changes (chip removal, back button) into the search fields, but not our own pushes.
  useEffect(() => {
    if (state.location !== pushedLocation.current) {
      pushedLocation.current = state.location;
      setLocationDraft(state.location);
    }
  }, [state.location]);
  useEffect(() => {
    if (state.q !== pushedQ.current) {
      pushedQ.current = state.q;
      setQDraft(state.q);
    }
  }, [state.q]);
  // Keyword search is debounced 300ms; the location field 350ms.
  useEffect(() => {
    const next = qDraft.trim();
    if (next === pushedQ.current) return;
    const t = setTimeout(() => {
      pushedQ.current = next;
      update({ q: next }, { typing: "q" });
    }, 300);
    return () => clearTimeout(t);
  });
  // A town page waits for Search: a different place is another page (its course page, or another town's), which mustn't open
  // half way through typing.
  useEffect(() => {
    const next = locationDraft.trim();
    if (next === pushedLocation.current || scope?.location) return;
    const t = setTimeout(() => {
      pushedLocation.current = next;
      update({ location: next }, { typing: "location" });
    }, 350);
    return () => clearTimeout(t);
  });

  // where the typed town, postcode area or postcode is on the map (API catalogue.locate), so venues near it match, nearest first;
  // until it is found (or if it isn't, or can't be looked up), the town or postcode is matched by its words
  const where = state.location.trim();
  const located = api.catalogue.locate.useQuery({ q: where }, { enabled: Boolean(where), staleTime: Infinity, retry: false });
  const point = where ? located.data ?? null : null;
  // the ways of study asked for: ticked, or a method page's own (/courses/classroom/leeds); a location only counts those
  const methods = state.method.length ? state.method : scope?.method ? [scope.method] : [];
  const results = useMemo(() => sortCourses(filterCourses(courses, { ...state, method: methods }, point), state.sort, state.location, point), [courses, state, point, methods.join()]); // eslint-disable-line react-hooks/exhaustive-deps -- methods by value
  // With a place found on the map, each card says how far its nearest venue is (or that it is taken online). A distance is only
  // ever measured from the place itself, never guessed from a venue whose name happens to match.
  const distanceOf = (course) => {
    if (!where) return "";
    const anywhere = takenAnywhere(course, methods);
    const near = point && nearestVenue(course, point);
    if (!near) return anywhere && !venueIn(course, where) ? "Online, from anywhere" : "";
    // a course with a venue within reach: how far; one taken online that has no venue near: online first, the nearest venue after
    if (near.km <= NEAR_KM || !anywhere) return distanceLabel(near);
    return `Online, from anywhere. Nearest venue: ${distanceLabel(near).replace(/^About/, "about")}`;
  };
  // a town or postcode that isn't on the map and matches no venue: say so, rather than let the courses that can be taken online
  // (takenAnywhere) look like courses near it. Only those are left then, so the message can say they can be taken online.
  const placeUnknown = Boolean(where) && located.isSuccess && !located.data && !results.some((c) => venueIn(c, where));
  // the map can't be asked (postcodes.io down): venues are matched by the words typed, which finds few for a postcode
  const lookupDown = Boolean(where) && located.isError;
  // the place used, as the map names it, so the visitor can tell which Newport (or which postcode area) the results are near
  const placeName = point ? [point.label, point.area].filter(Boolean).join(", ") : "";
  const noMatches = results.length === 0;
  // Only what matches: with zero matches the page says so plainly and offers to loosen the filters; it never fills the space
  // with courses that don't match (Milestone 2's rule for an empty filter).
  const displayed = results;

  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const page = Math.min(state.page, totalPages);
  const pageItems = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // A ?page beyond the last page goes to the last page (an invalid ?page was already treated as 1).
  useEffect(() => {
    if (state.page !== page) setPage(page, { push: false });
  }, [state.page, page, setPage]);

  // Analytics: the list on screen (one event per page of results).
  const listName = scope?.title || "All courses";
  useEffect(() => {
    trackEvent("view_item_list", { item_list_name: listName, items: pageItems.map((c, i) => toItem(c, i)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, state.subject, state.sub, state.method, state.level, state.min, state.max, state.location, state.q, state.sort]);

  const pageHref = (p) => {
    const query = buildCatalogueQuery({ ...state, page: p }, base);
    return query ? `${pathname}?${query}` : pathname;
  };
  // After a filter, sort, chip or clear action: if the user is scrolled below the top of the results, smoothly bring the
  // results top (the "N courses" toolbar) just under the header; if it is already visible, do not scroll at all.
  // It runs immediately when the control is used (not after results change), so the page moves once only.
  // While the mobile sheet is open the scroll is held back and runs when the sheet closes.
  const pendingScroll = useRef(false);
  const scrollToResultsIfNeeded = () => {
    if (isSheet && filtersOpen) {
      pendingScroll.current = true;
      return;
    }
    const results = document.querySelector(".rt-res");
    if (!results) return;
    const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
    const targetY = Math.max(0, results.getBoundingClientRect().top + window.scrollY - offset - 16);
    if (window.scrollY > targetY + 1) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: targetY, behavior: reduce ? "auto" : "smooth" });
    }
  };
  useEffect(() => {
    if (filtersOpen || !pendingScroll.current) return;
    pendingScroll.current = false;
    const id = requestAnimationFrame(scrollToResultsIfNeeded);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersOpen]);

  // Every control that changes the results goes through these, so each one scrolls the same way.
  // The scroll runs once per committed (debounced) change, never per tick.
  const afterCommit = () => scrollToResultsIfNeeded();
  const applyPatch = (patch) => update(patch, { afterCommit });
  const toggle = (group, value) => toggleFilter(group, value, { afterCommit });
  const clearAll = () => clearAllRaw({ afterCommit });

  // Page change without a reload: push the URL, smooth-scroll the page to the results count (its scroll-margin-top
  // clears the header), then focus it. Filter, sort and chip changes never scroll the page.
  const goToPage = (p) => {
    setPage(p);
    requestAnimationFrame(() => {
      const el = document.getElementById("rt-res-count");
      if (!el) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      el.focus({ preventScroll: true });
    });
  };

  // ---- chips: one per ticked value, plus keyword, location and a price range ----
  const optionLabel = (group, value) => group.options.find((o) => o.value === value)?.label;
  const filterGroups = catalogueFilterGroups();
  const [subjectGroup, methodGroup, levelGroup] = filterGroups;
  const subLabels = Object.fromEntries(subjectGroup.options.flatMap((o) => subcategoryOptions(o.value)).map((x) => [x.value, x.label]));
  const priceActive = state.min > PRICE_BOUNDS.min || state.max < PRICE_BOUNDS.max;
  const chips = [
    state.q && { key: "q", label: `\u201c${state.q}\u201d` },
    ...state.method.map((v) => ({ key: `method:${v}`, label: optionLabel(methodGroup, v) })),
    ...state.subject.map((v) => ({ key: `subject:${v}`, label: optionLabel(subjectGroup, v) })),
    ...state.sub.map((v) => ({ key: `sub:${v}`, label: subLabels[v] })),
    ...state.level.map((v) => ({ key: `level:${v}`, label: optionLabel(levelGroup, v) })),
    priceActive && { key: "price", label: `\u00a3${state.min.toLocaleString("en-GB")} to \u00a3${state.max.toLocaleString("en-GB")}` },
    state.location && { key: "location", label: placeName ? `Near ${placeName}` : state.location },
  ].filter(Boolean);
  const hasFilters = chips.length > 0;
  // "Filters (n)": every ticked value, plus one for a price filter
  const activeGroups = state.subject.length + state.sub.length + state.method.length + state.level.length + (priceActive ? 1 : 0);
  // Removing a chip unticks only that value.
  const removeChip = (key) => {
    const [group, value] = key.split(":");
    if (value !== undefined) toggle(group, value);
    else if (key === "price") applyPatch({ min: PRICE_BOUNDS.min, max: PRICE_BOUNDS.max });
    else applyPatch({ [key]: "" });
  };

  const submitSearch = (e) => {
    e.preventDefault();
    pushedLocation.current = locationDraft.trim();
    pushedQ.current = qDraft.trim();
    update({ location: pushedLocation.current, q: pushedQ.current });
    trackEvent("search", { search_term: pushedQ.current, location: pushedLocation.current });
    requestAnimationFrame(() => document.getElementById("rt-res-count")?.focus());
  };
  // A course page keeps its own heading (one subject ticked on All courses opens that subject's page, useCourseQuery).
  const heading = scope ? scope.title : "Find the right course for you";
  const showFilters = !scope || scope.filters !== false;
  // a town page with nothing in reach and no filter of the visitor's own: say so for the town, and offer its course page and the
  // nearest town with a venue, rather than "no courses match your search" for filters nobody set
  const townEmpty = Boolean(scope?.location) && state.location === scope.location && chips.every((c) => c.key === "location");
  const nearestTown =
    townEmpty && point
      ? (scope.towns || [])
          .filter((t) => t.lat != null)
          .map((t) => ({ ...t, km: nearestVenue({ venues: [t] }, point).km }))
          .sort((a, b) => a.km - b.km)[0]
      : null;
  // a card on a method page (or with one method ticked) opens the course on that method's dates
  const cardMode = methods.length === 1 ? MODE_OF[methods[0]] || "" : "";

  // "Remove last filter": undo the latest change; with no history (e.g. a shared URL) drop the last active chip.
  // On a town page the town is the page's own, so the visitor's last filter goes first.
  const removeLast = () => {
    const own = scope?.location ? chips.filter((c) => c.key !== "location") : [];
    const last = (own.length ? own : chips).at(-1);
    if (canUndo) undoLast({ afterCommit });
    else if (last) removeChip(last.key);
  };

  // Live counts: for each checkbox option, how many courses match that option with ALL OTHER groups applied
  // (its own group is ignored, so ticking one option never makes its siblings read 0).
  const counts = useMemo(() => {
    const out = {};
    catalogueFilterGroups().forEach((g) => {
      out[g.key] = {};
      g.options.forEach((o) => {
        out[g.key][o.value] = filterCourses(courses, { ...state, method: methods, [g.key]: [o.value], ...(g.key === "subject" ? { sub: [] } : {}) }, point).length;
      });
    });
    out.sub = {};
    [...new Set([...state.subject, ...(scope?.subject ? [scope.subject] : [])])].forEach((sv) =>
      subcategoryOptions(sv).forEach((o) => {
        out.sub[o.value] = filterCourses(courses, { ...state, method: methods, sub: [o.value] }, point).length;
      }),
    );
    return out;
  }, [courses, state, point, methods.join()]); // eslint-disable-line react-hooks/exhaustive-deps -- methods by value

  const showingFrom = (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, results.length);

  return (
    <section className="rt-cat">
      <div className="rt-cat__hero">
        {/* Header band: Home hero artwork + the same animated waves */}
        <div className="rt-cat__hero-bg" aria-hidden="true" style={{ backgroundImage: "url(/assets/img/home-1/hero/bg.png)" }}></div>
        <div className="container">
          <h1 className="rt-cat__title">{heading}</h1>
          {scope?.lead && <p className="rt-cat__lede">{scope.lead}</p>}

          <form className="rt-cat-search" onSubmit={submitSearch} role="search" noValidate>
            <div className="rt-cat-search__field">
              <i className="icon-search text-16 text-light-1"></i>
              <input type="search" name="q" value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder="Course or skill" aria-label="Course or skill" autoComplete="off" />
              {qDraft && (
                <button
                  type="button"
                  className="rt-cat-search__clear"
                  aria-label="Clear course or skill"
                  onClick={() => {
                    setQDraft("");
                    pushedQ.current = "";
                    update({ q: "" });
                  }}
                >
                  <i className="icon-close text-9"></i>
                </button>
              )}
            </div>
            <span className="rt-cat-search__divider" aria-hidden="true"></span>
            <div className="rt-cat-search__field">
              <i className="icon-location text-16 text-light-1"></i>
              <input type="text" name="location" value={locationDraft} onChange={(e) => setLocationDraft(e.target.value)} placeholder="Town or postcode" aria-label="Town or postcode" autoComplete="postal-code" />
              {locationDraft && (
                <button
                  type="button"
                  className="rt-cat-search__clear"
                  aria-label="Clear location"
                  onClick={() => {
                    setLocationDraft("");
                    pushedLocation.current = "";
                    update({ location: "" });
                  }}
                >
                  <i className="icon-close text-9"></i>
                </button>
              )}
            </div>
            <button type="submit" className="rt-cat-search__btn">
              <i className="icon-search"></i>
              <span>Search</span>
            </button>
          </form>

          {scope ? (
            <nav className="rt-cat-popular" aria-label="Other course pages">
              <span className="rt-cat-popular__label">Also browse:</span>
              <ul className="rt-cat-popular__list">
                {scope.links.map((l) => (
                  <li key={l.href}><Link href={l.href} className="rt-cat-popular__tag">{l.label}</Link></li>
                ))}
              </ul>
            </nav>
          ) : (
            <div className="rt-cat-popular">
              <span className="rt-cat-popular__label">Popular searches:</span>
              <div className="rt-cat-popular__list">
                {popularSearches.filter((words) => courses.some((c) => matchesKeyword(c, words))).map((words) => (
                  <button
                    key={words}
                    type="button"
                    className="rt-cat-popular__tag"
                    aria-pressed={state.q === words}
                    onClick={() => {
                      setQDraft(words);
                      pushedQ.current = words;
                      applyPatch({ q: words });
                    }}
                  >
                    {words}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <svg className="svg-waves" xmlns="http://www.w3.org/2000/svg" viewBox="0 24 150 28" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <path id="rt-cat-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
          </defs>
          <g className="svg-waves__parallax">
            <use href="#rt-cat-wave" x="48" y="0" />
            <use href="#rt-cat-wave" x="48" y="3" />
            <use href="#rt-cat-wave" x="48" y="5" />
            <use href="#rt-cat-wave" x="48" y="7" />
          </g>
        </svg>
      </div>

      <div className="container rt-cat__body">
        <nav className="rt-res__crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          {scope ? (
            <>
              <Link href={scope.allHref}>All courses</Link>
              <span aria-hidden="true">/</span>
              {scope.parent && <><Link href={scope.parent.href}>{scope.parent.label}</Link><span aria-hidden="true">/</span></>}
              <span aria-current="page">{scope.crumb}</span>
            </>
          ) : (
            <span aria-current="page">All courses</span>
          )}
        </nav>

        <div className={`rt-cat__layout${showFilters ? "" : " -nofilters"}`}>
          {showFilters && (
          <div className={`rt-fp${filtersOpen ? " is-open" : ""}`}>
            <div className="rt-fp__backdrop" onClick={() => setFiltersOpen(false)}></div>
            <aside className="rt-fp__panel" ref={panelRef} aria-label="Filters" role={isSheet ? "dialog" : undefined} aria-modal={isSheet ? "true" : undefined}>
              <span className="rt-fp__handle" aria-hidden="true"></span>
              <div className="rt-fp__head">
                <h2 className="rt-fp__heading">Filters</h2>
                <button ref={closeBtnRef} type="button" className="rt-fp__close" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.3 5.3a1 1 0 011.4 0L10 8.6l3.3-3.3a1 1 0 111.4 1.4L11.4 10l3.3 3.3a1 1 0 01-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 01-1.4-1.4L8.6 10 5.3 6.7a1 1 0 010-1.4z" /></svg>
                </button>
              </div>
              <div className="rt-fp__scrollwrap">
                <div className="rt-fp__scroll" ref={scrollRef}>
                  {taxonomy?.unavailable && !taxonomy.loading && <ErrorState inCard title="We couldn't load the filters." text="The courses below are still up to date." onRetry={taxonomy.retry} />}
                  <CatalogueFilters
                    state={state}
                    counts={counts}
                    hide={scope?.hide}
                    baseSubject={scope?.fixed?.includes("sub") ? "" : scope?.subject}
                    onToggle={toggle}
                    onPriceChange={(min, max, o) => update({ min, max }, { afterCommit, typing: o?.typing ? "price" : null })}
                  />
                </div>
              </div>
              <FilterScrollPill scrollRef={scrollRef} />
              <div className="rt-fp__foot">
                <button type="button" className="rt-res__btn rt-res__btn--primary" onClick={() => setFiltersOpen(false)}>
                  Show {countLabel(results.length)}
                </button>
              </div>
            </aside>
          </div>
          )}

          <div className="rt-res" aria-busy="false">
            {/* names the results for screen readers, so the course titles (h3) never follow the page title directly */}
            <h2 className="rt-sr">Courses</h2>
            <div className="rt-res__toolbar">
              <div className="rt-res__counts">
                <p className="rt-res__count" id="rt-res-count" tabIndex={-1} aria-live="polite">
                  {hasFilters ? `${countLabel(results.length)} found` : countLabel(results.length)}
                </p>
                <p className="rt-res__showing">{results.length > 0 ? `Showing ${showingFrom} to ${showingTo} of ${results.length}` : ""}</p>
              </div>
              {showFilters && (
                <button ref={filterBtnRef} type="button" className="rt-res__filterbtn" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" aria-expanded={filtersOpen}>
                  Filters{activeGroups > 0 && <span className="rt-res__filterbtn-count">{activeGroups}</span>}
                </button>
              )}
              <CatalogueDropdown
                className="rt-cat-dd--sort"
                label="Sort by"
                prefix="Sort by:"
                options={state.location ? [closestSortOption, ...sortOptions] : sortOptions}
                value={state.sort}
                onChange={(value) => applyPatch({ sort: value })}
                clearable={false}
              />
            </div>

            <ActiveFilters chips={chips} onRemove={removeChip} onClearAll={clearAll} />
            {placeUnknown && (
              <p className="rt-res__place" role="status">
                We couldn’t find “{where}”. Check the town or postcode.{results.length > 0 ? " The courses below can be taken online, from anywhere." : ""}
              </p>
            )}
            {lookupDown && (
              <p className="rt-res__place" role="status">
                We can’t look up places right now, so only venues whose town or postcode matches “{where}” are shown. Please try again in a moment.
              </p>
            )}

            {noMatches &&
              (townEmpty ? (
                <EmptyState
                  live
                  title={scope.none}
                  text="New courses are added as training providers join. See where these courses run now, or try a town nearby."
                  action={{ label: scope.parent.title, href: scope.parent.href }}
                  secondary={nearestTown ? { label: `Nearest: ${nearestTown.city}`, href: nearestTown.href } : undefined}
                />
              ) : hasFilters ? (
                <EmptyState live title="No courses match your search" text={state.location.trim() ? "Nothing matches all of these filters. Try removing one, or search a wider area." : "Nothing matches all of these filters. Try removing one."} secondary={{ label: "Remove last filter", onClick: removeLast }} action={{ label: "Clear all filters", onClick: clearAll }} />
              ) : (
                <EmptyState live title="No courses here yet" text="New courses are added as training providers join. Check back soon, or contact us and we'll help you find one." action={{ label: "Contact us", href: "/contact-us" }} />
              ))}

            <div className="rt-res__list" id="rt-res-list" tabIndex={-1}>
              {pageItems.map((course, i) => (
                <CatalogueCourseCard key={course.id} course={course} index={(page - 1) * PAGE_SIZE + i} onNotify={setToast} distance={distanceOf(course)} listName={listName} mode={cardMode} />
              ))}
            </div>

            {totalPages > 1 && <CataloguePagination page={page} totalPages={totalPages} hrefFor={pageHref} onNavigate={goToPage} />}
          </div>
        </div>

        <hr className="rt-cat__rule" />
        <section className="rt-cat__about-wrap" aria-labelledby="rt-about-title">
        <h2 className="rt-cat__about-title" id="rt-about-title">{scope?.about.title || "About the courses on ReadTraining"}</h2>
        <p className="rt-cat__about">
          {scope?.about.text ||
            "ReadTraining brings together courses from independent UK training providers, each approved by our team before it can list a course. Compare dates, venues and prices in one place, and check each course page for how it is taught and what it leads to."}
        </p>
        </section>
      </div>
      <hr className="rt-cat__rule rt-cat__rule--full" />

      <Toast toast={toast} onDone={() => setToast(null)} />
      {/* ItemList structured data for the courses on this page (jsonLd escapes "<": a title can never close the script tag) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: pageItems.map((c, i) => ({
              "@type": "ListItem",
              position: (page - 1) * PAGE_SIZE + i + 1,
              name: c.title,
              url: c.detailsHref || undefined,
            })),
          }),
        }}
      />
    </section>
  );
}
