"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  PAGE_SIZE,
  PRICE_BOUNDS,
  PROJECT_NAME,
  buildCatalogueQuery,
  catalogueCourses,
  closestSortOption,
  filterCourses,
  filterGroups,
  sortCourses,
  sortOptions,
  subSubjects,
} from "@/data/courseCatalogue";
import { trackEvent, toItem } from "@/lib/analytics";
import ActiveFilters from "./ActiveFilters";
import CatalogueCourseCard from "./CatalogueCourseCard";
import CatalogueDropdown from "./CatalogueDropdown";
import CatalogueFilters from "./CatalogueFilters";
import CataloguePagination from "./CataloguePagination";
import Toast from "./Toast";
import FilterScrollPill from "./FilterScrollPill";
import { useCourseQuery } from "./useCourseQuery";

// Quick links under the search: each applies the matching subject filter (no navigation).
const popularSearches = [
  { label: "Door Supervisor", subject: "security" },
  { label: "CSCS Green Card", subject: "construction" },
  { label: "First Aid at Work", subject: "first-aid" },
  { label: "CCTV Operator", subject: "security" },
  { label: "Health & Safety Level 1", subject: "health-and-safety" },
];

const countLabel = (n) => `${n} ${n === 1 ? "course" : "courses"}`;

// One reusable catalogue. The URL query string is the single source of truth for filters, search, sort and page
// (see useCourseQuery). Everything below the hero scrolls with the page; only the filter panel is sticky.
export default function CourseCatalogue({ courses = catalogueCourses }) {
  const { state, pathname, update, toggleFilter, clearAll: clearAllRaw, setPage, undoLast, canUndo } = useCourseQuery();
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
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e) => e.key === "Escape" && setFiltersOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filtersOpen]);
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
      update({ q: next });
    }, 300);
    return () => clearTimeout(t);
  });
  useEffect(() => {
    const next = locationDraft.trim();
    if (next === pushedLocation.current) return;
    const t = setTimeout(() => {
      pushedLocation.current = next;
      update({ location: next });
    }, 350);
    return () => clearTimeout(t);
  });

  const results = useMemo(() => sortCourses(filterCourses(courses, state), state.sort, state.location, courses), [courses, state]);
  const noMatches = results.length === 0;
  // With zero matches the count says "0 courses found" but the full list stays on screen so the page is not empty.
  const displayed = useMemo(() => (noMatches ? sortCourses(courses, state.sort, state.location) : results), [noMatches, courses, results, state.sort, state.location]);

  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const page = Math.min(state.page, totalPages);
  const pageItems = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // A ?page beyond the last page goes to the last page (an invalid ?page was already treated as 1).
  useEffect(() => {
    if (state.page !== page) setPage(page, { push: false });
  }, [state.page, page, setPage]);

  // Analytics: the list on screen (one event per page of results).
  useEffect(() => {
    trackEvent("view_item_list", { item_list_name: "All courses", items: pageItems.map((c, i) => toItem(c, i)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, state.subject, state.sub, state.method, state.level, state.min, state.max, state.location, state.q, state.sort]);

  const pageHref = (p) => {
    const query = buildCatalogueQuery({ ...state, page: p });
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
  const [subjectGroup, methodGroup, levelGroup] = filterGroups;
  const subLabels = Object.fromEntries(Object.values(subSubjects).flat().map((x) => [x.value, x.label]));
  const priceActive = state.min > PRICE_BOUNDS.min || state.max < PRICE_BOUNDS.max;
  const chips = [
    state.q && { key: "q", label: `\u201c${state.q}\u201d` },
    ...state.method.map((v) => ({ key: `method:${v}`, label: optionLabel(methodGroup, v) })),
    ...state.subject.map((v) => ({ key: `subject:${v}`, label: optionLabel(subjectGroup, v) })),
    ...state.sub.map((v) => ({ key: `sub:${v}`, label: subLabels[v] })),
    ...state.level.map((v) => ({ key: `level:${v}`, label: optionLabel(levelGroup, v) })),
    priceActive && { key: "price", label: `\u00a3${state.min.toLocaleString("en-GB")} to \u00a3${state.max.toLocaleString("en-GB")}` },
    state.location && { key: "location", label: state.location },
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
  // One ticked subject names the page; none or several keep the general heading.
  const subjectTitle = state.subject.length === 1 ? optionLabel(subjectGroup, state.subject[0]) : "";

  // "Remove last filter": undo the latest change; with no history (e.g. a shared URL) drop the last active chip.
  const removeLast = () => {
    if (canUndo) undoLast({ afterCommit });
    else if (chips.length) removeChip(chips[chips.length - 1].key);
  };

  // Live counts: for each checkbox option, how many courses match that option with ALL OTHER groups applied
  // (its own group is ignored, so ticking one option never makes its siblings read 0).
  const counts = useMemo(() => {
    const out = {};
    filterGroups.forEach((g) => {
      out[g.key] = {};
      g.options.forEach((o) => {
        out[g.key][o.value] = filterCourses(courses, { ...state, [g.key]: [o.value], ...(g.key === "subject" ? { sub: [] } : {}) }).length;
      });
    });
    out.sub = {};
    state.subject.forEach((sv) =>
      (subSubjects[sv] || []).forEach((o) => {
        out.sub[o.value] = filterCourses(courses, { ...state, sub: [o.value] }).length;
      }),
    );
    return out;
  }, [courses, state]);

  const showingFrom = (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, results.length);

  return (
    <section className="rt-cat">
      <div className="rt-cat__hero">
        {/* Header band: Home hero artwork + the same animated waves */}
        <div className="rt-cat__hero-bg" aria-hidden="true" style={{ backgroundImage: "url(/assets/img/home-1/hero/bg.png)" }}></div>
        <div className="container">
          <h1 className="rt-cat__title">
            {subjectTitle ? `${subjectTitle.replace(/ and /g, " & ")} Training Courses - ${PROJECT_NAME}` : "Find the right course for you"}
          </h1>

          <form className="rt-cat-search" onSubmit={submitSearch} role="search">
            <div className="rt-cat-search__field">
              <i className="icon-search text-16 text-light-1"></i>
              <input type="search" value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder="Course or skill" aria-label="Course or skill" autoComplete="off" />
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
              <input type="text" value={locationDraft} onChange={(e) => setLocationDraft(e.target.value)} placeholder="Town or postcode" aria-label="Town or postcode" autoComplete="postal-code" />
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

          <div className="rt-cat-popular">
            <span className="rt-cat-popular__label">Popular searches:</span>
            <div className="rt-cat-popular__list">
              {popularSearches.map((item) => (
                <button key={item.label} type="button" className="rt-cat-popular__tag" onClick={() => applyPatch({ subject: [item.subject], sub: [] })}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
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
          <span aria-current="page">All courses</span>
        </nav>

        <div className="rt-cat__layout">
          <div className={`rt-fp${filtersOpen ? " is-open" : ""}`}>
            <div className="rt-fp__backdrop" onClick={() => setFiltersOpen(false)}></div>
            <aside className="rt-fp__panel" aria-label="Filters" role={isSheet ? "dialog" : undefined} aria-modal={isSheet ? "true" : undefined}>
              <span className="rt-fp__handle" aria-hidden="true"></span>
              <div className="rt-fp__head">
                <h2 className="rt-fp__heading">Filters</h2>
                <button ref={closeBtnRef} type="button" className="rt-fp__close" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.3 5.3a1 1 0 011.4 0L10 8.6l3.3-3.3a1 1 0 111.4 1.4L11.4 10l3.3 3.3a1 1 0 01-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 01-1.4-1.4L8.6 10 5.3 6.7a1 1 0 010-1.4z" /></svg>
                </button>
              </div>
              <div className="rt-fp__scrollwrap">
                <div className="rt-fp__scroll" ref={scrollRef}>
                  <CatalogueFilters
                    state={state}
                    counts={counts}
                    onToggle={toggle}
                    onPriceChange={(min, max) => applyPatch({ min, max })}
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

          <div className="rt-res" aria-busy="false">
            <div className="rt-res__toolbar">
              <div className="rt-res__counts">
                <p className="rt-res__count" id="rt-res-count" tabIndex={-1} aria-live="polite">
                  {hasFilters ? `${countLabel(results.length)} found` : countLabel(results.length)}
                </p>
                <p className="rt-res__showing">{results.length > 0 ? `Showing ${showingFrom} to ${showingTo} of ${results.length}` : ""}</p>
              </div>
              <button ref={filterBtnRef} type="button" className="rt-res__filterbtn" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" aria-expanded={filtersOpen}>
                Filters{activeGroups > 0 && <span className="rt-res__filterbtn-count">{activeGroups}</span>}
              </button>
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

            {noMatches && (
              <div className="rt-res__empty" role="status">
                <p className="rt-res__empty-title">No courses match your filters</p>
                <p>Try removing a filter or choosing a different price range.</p>
                <div className="rt-res__empty-actions">
                  <button type="button" className="rt-res__btn rt-res__btn--secondary" onClick={removeLast}>
                    Remove last filter
                  </button>
                  <button type="button" className="rt-res__btn rt-res__btn--primary" onClick={clearAll}>
                    Clear all filters
                  </button>
                </div>
              </div>
            )}

            <div className="rt-res__list" id="rt-res-list" tabIndex={-1}>
              {pageItems.map((course, i) => (
                <CatalogueCourseCard key={course.id} course={course} index={(page - 1) * PAGE_SIZE + i} onNotify={setToast} />
              ))}
            </div>

            <CataloguePagination page={page} totalPages={totalPages} hrefFor={pageHref} onNavigate={goToPage} />
          </div>
        </div>

        <hr className="rt-cat__rule" />
        <section className="rt-cat__about-wrap" aria-labelledby="rt-about-title">
        <h2 className="rt-cat__about-title" id="rt-about-title">About our training courses</h2>
        <p className="rt-cat__about">
          Our affordable courses give you high-quality skills training, from essential compliance topics such as safeguarding, health &amp; safety and food safety to personal development and wellbeing. Learn at the time, place and pace that suit you. Most of our courses are certified.
        </p>
        </section>
      </div>
      <hr className="rt-cat__rule rt-cat__rule--full" />

      <Toast toast={toast} onDone={() => setToast(null)} />
      {/* ItemList structured data for the courses on this page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
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
