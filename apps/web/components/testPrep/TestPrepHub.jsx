"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { testCategories, testCategoryIcons, testPrepPage } from "@/data/testPrep";
import { formatDuration } from "@/lib/testPrep";
import { trackEvent } from "@/lib/analytics";
import CataloguePagination from "@/components/courses/CataloguePagination";
import ActiveFilters from "@/components/courses/ActiveFilters";
import FilterScrollPill from "@/components/courses/FilterScrollPill";
import { useHeaderOffset } from "@/components/testPrep/subject/useHeaderOffset";
import { useResultsScroll } from "@/components/courses/useResultsScroll";

// Test prep hub, built only from the site's own parts:
// hero = the course catalogue's hero (dark band, search box, popular tags, waves); the list = the catalogue's layout
// (.rt-cat__layout): a sticky panel with the category tiles (tick several; it scrolls inside itself with the catalogue's
// scroll pill), and the results column (.rt-res toolbar, the course list's filter chips, cards two to a row, pagination).
// Cards = the catalogue's card (.rt-card) without the image: details, then questions and pass mark with an arrow link.
// A test with a built page links there; the others say "Coming soon" and are not links.
const PAGE_SIZE = 8; // 4 rows of 2 (col-md-6)
const norm = (v) => String(v || "").toLowerCase().replace(/\s+/g, " ").trim();
const countLabel = (n) => `${n} ${n === 1 ? "test" : "tests"}`;

// `t.exam` is the subject's usual paper ({ questions, passMark, minutes }), `t.testCount` its number of mock tests.
// Layout, top to bottom: category (purple icon, grey name), title, description (3 lines at most), duration,
// then a tinted footer strip with the figures and the arrow. The arrow is the card's one action (a Tab stop with a label);
// an invisible link under everything makes the rest of the card open the same test, and the title keeps its own hover.
export function TestCard({ t }) {
  const { questions, passMark, minutes } = t.exam || {};
  const facts = [minutes ? formatDuration(minutes) : null, t.testCount > 1 ? `${t.testCount} mock tests` : null].filter(Boolean);
  const select = () => trackEvent("select_content", { content_type: "test_prep", item_id: t.slug });
  return (
    <article className={`rt-card rt-card--test${t.live ? " is-link" : ""}`}>
      {t.live && <Link href={t.href} className="rt-card__overlay" onClick={select} tabIndex={-1} aria-hidden="true"></Link>}
      <div className="rt-card__body">
        <span className="rt-card__subject">
          <i className={testCategoryIcons[t.category] || "icon-book"} aria-hidden="true"></i>
          {t.category}
        </span>
        <h3 className="rt-card__title">
          {t.live ? <Link href={t.href} className="rt-card__title-link" onClick={select} tabIndex={-1}>{t.title}</Link> : t.title}
        </h3>
        <p className="rt-card__desc">{t.lead}</p>
        {facts.length > 0 && (
          <p className="rt-card__time">
            <i className="icon-wall-clock" aria-hidden="true"></i>
            {facts.map((item, i) => (
              <Fragment key={item}>
                {i > 0 && <span className="rt-card__sep" aria-hidden="true"></span>}
                <span>{item}</span>
              </Fragment>
            ))}
          </p>
        )}
      </div>

      <div className="rt-card__aside">
        <dl className="rt-card__stats">
          <div className="rt-card__stat">
            <dt>Questions</dt>
            <dd>{questions ?? "–"}</dd>
          </div>
          <div className="rt-card__stat">
            <dt>Pass mark</dt>
            <dd>{passMark ? `${passMark}%` : "–"}</dd>
          </div>
        </dl>
        {t.live ? (
          <Link href={t.href} className="rt-card__go" onClick={select} aria-label={`Start ${t.title}`}>
            <i className="icon-arrow-right rt-card__go-icon" aria-hidden="true"></i>
          </Link>
        ) : (
          <span className="rt-card__soon">{testPrepPage.soonLabel}</span>
        )}
      </div>
    </article>
  );
}

// `tests` are the hub entries with their lead, exam and test count already resolved by the page (lib/testPrep.js).
// The address keeps the view: ?category=Construction,Security&q=...&page=2
// `children` are the sections shown between the hero and the full list (how it works).
export default function TestPrepHub({ tests, initialCategory = "", initialQuery = "", initialPage = 1, children }) {
  const { hero, gridEyebrow, gridTitle } = testPrepPage;
  // several categories can be ticked; none ticked means all tests
  const [categories, setCategories] = useState(() => String(initialCategory).split(",").filter((c) => testCategories.includes(c)));
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(Math.max(1, Number(initialPage) || 1));
  const listRef = useRef(null);
  const { resultsRef, countRef, holdHeight, scrollToResults } = useResultsScroll();
  const scrollRef = useRef(null); // the panel body (scrolls up and down on desktop)
  const catsRef = useRef(null); // the tiles (a row that scrolls sideways on phones)
  const lastTile = useRef(null);
  useHeaderOffset();

  // On phones the tiles are a row that scrolls sideways: keep the tile just tapped in view (the page itself does not move).
  useEffect(() => {
    const row = catsRef.current;
    const tile = lastTile.current && row?.querySelector(`[data-category="${lastTile.current}"]`);
    if (!row || !tile || row.scrollWidth <= row.clientWidth) return;
    const left = tile.offsetLeft - row.offsetLeft - 15;
    const right = left + tile.offsetWidth + 30;
    if (left < row.scrollLeft || right > row.scrollLeft + row.clientWidth) row.scrollTo({ left, behavior: "smooth" });
  }, [categories]);

  // keep the filters in the address so a filtered view can be shared
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      categories.length ? params.set("category", categories.join(",")) : params.delete("category");
      query.trim() ? params.set("q", query.trim()) : params.delete("q");
      page > 1 ? params.set("page", String(page)) : params.delete("page");
      const qs = params.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    } catch {}
  }, [categories, query, page]);

  const list = useMemo(() => {
    const q = norm(query);
    return tests.filter((t) => (!categories.length || categories.includes(t.category)) && (!q || norm(`${t.title} ${t.category} ${t.lead || ""}`).includes(q)));
  }, [tests, categories, query]);

  // Pagination: 8 per page. A filter or search change goes back to page 1 (see applyFilters / searchFor); a page past the
  // end shows the last page.
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = list.length ? (current - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(current * PAGE_SIZE, list.length);
  const hrefFor = (p) => {
    const params = new URLSearchParams();
    if (categories.length) params.set("category", categories.join(","));
    if (query.trim()) params.set("q", query.trim());
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/test-prep${qs ? `?${qs}` : ""}#tests`;
  };

  const goToPage = (p) => {
    holdHeight();
    setPage(p);
    scrollToResults({ always: true });
  };

  const counts = useMemo(() => Object.fromEntries(testCategories.map((c) => [c, tests.filter((t) => t.category === c).length])), [tests]);
  const toList = () => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  // every change to the list goes through here, so each one scrolls the same way
  const applyFilters = (next) => {
    holdHeight();
    if (next.categories) setCategories(next.categories);
    if (next.query !== undefined) setQuery(next.query);
    setPage(1);
    scrollToResults();
  };
  // "All tests" unticks every category; a category tile ticks or unticks itself (ticked ones keep the tile order).
  // Ticking the last unticked category is the same as all tests, so it goes back to "All tests".
  const toggleCategory = (c) => {
    lastTile.current = c || "all";
    if (!c) return categories.length && applyFilters({ categories: [] });
    const next = categories.includes(c) ? categories.filter((x) => x !== c) : testCategories.filter((x) => x === c || categories.includes(x));
    if (next.length === testCategories.length) lastTile.current = "all";
    applyFilters({ categories: next.length === testCategories.length ? [] : next });
  };
  const searchFor = (q) => { setQuery(q); setPage(1); };
  const pick = (q) => { searchFor(q); setCategories([]); toList(); };
  const clear = () => applyFilters({ categories: [], query: "" });

  // The course list's chips: the search words, then one per ticked category. Each removes only itself.
  const chips = [
    query.trim() && { key: "q", label: `“${query.trim()}”` },
    ...categories.map((c) => ({ key: `category:${c}`, label: c })),
  ].filter(Boolean);
  const removeChip = (key) => (key === "q" ? applyFilters({ query: "" }) : applyFilters({ categories: categories.filter((c) => `category:${c}` !== key) }));

  return (
    <>
      <section className="rt-cat__hero rt-tp__hero">
        <div className="rt-cat__hero-bg" aria-hidden="true" style={{ backgroundImage: "url(/assets/img/home-1/hero/bg.png)" }}></div>
        <div className="container">
          <div className="text-center">
            <div className="rt-eyebrow rt-eyebrow--pill -onDark"><span className="rt-eyebrow__dot"></span>{hero.eyebrow}</div>
          </div>
          <h1 className="rt-cat__title">{hero.title.map((line, i) => <Fragment key={line}>{i > 0 && <br />}{line}</Fragment>)}</h1>
          <p className="rt-tp__lede">{hero.text}</p>

          <form className="rt-cat-search" role="search" noValidate onSubmit={(e) => { e.preventDefault(); toList(); }}>
            <div className="rt-cat-search__field">
              <i className="icon-search text-16 text-light-1" aria-hidden="true"></i>
              <input type="search" value={query} onChange={(e) => searchFor(e.target.value)} placeholder={hero.searchPlaceholder} aria-label="Search tests" autoComplete="off" />
              {query && (
                <button type="button" className="rt-cat-search__clear" aria-label="Clear search" onClick={() => searchFor("")}>
                  <i className="icon-close text-9" aria-hidden="true"></i>
                </button>
              )}
            </div>
            <button type="submit" className="rt-cat-search__btn">
              <i className="icon-search" aria-hidden="true"></i>
              <span>Search</span>
            </button>
          </form>

          <div className="rt-cat-popular">
            <span className="rt-cat-popular__label">{hero.popularLabel}</span>
            <div className="rt-cat-popular__list">
              {hero.popular.map((p) => (
                <button key={p} type="button" className="rt-cat-popular__tag" onClick={() => pick(p)}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        <svg className="svg-waves" xmlns="http://www.w3.org/2000/svg" viewBox="0 24 150 28" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <path id="rt-tp-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
          </defs>
          <g className="svg-waves__parallax">
            <use href="#rt-tp-wave" x="48" y="0" />
            <use href="#rt-tp-wave" x="48" y="3" />
            <use href="#rt-tp-wave" x="48" y="5" />
            <use href="#rt-tp-wave" x="48" y="7" />
          </g>
        </svg>
      </section>

      {children}

      <section className="rt-tp layout-pt-lg layout-pb-lg" id="tests" ref={listRef} aria-labelledby="rt-tp-h">
        <div className="container">
          <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{gridEyebrow}</div>
          <h2 className="sectionTitle__title mt-20" id="rt-tp-h">{gridTitle}</h2>
          <p className="sectionTitle__text mt-5">{tests.length} free mock tests across {testCategories.join(", ").replace(/, ([^,]*)$/, " and $1").toLowerCase()}.</p>

          <div className="rt-cat__layout rt-tp__layout">
            {/* Category tiles: home's benefit card (white, light border, purple icon square) as a toggle; a ticked tile takes the
                selected learning-option card's purple border and pale purple fill. Desktop: stacked in a sticky panel that
                scrolls inside itself with the catalogue's scroll pill. Tablets: a grid of 3. Phones: a row that scrolls sideways. */}
            <aside className="rt-tpside" aria-label="Filter tests by category">
              <div className="rt-tpside__scroll" ref={scrollRef}>
                <div className="rt-tpcats" role="group" aria-label="Categories" ref={catsRef}>
                  {["", ...testCategories].map((c) => {
                    const active = c ? categories.includes(c) : categories.length === 0;
                    return (
                      <Fragment key={c || "all"}>
                        <button type="button" data-category={c || "all"} className={`rt-tpcat${active ? " is-active" : ""}`} aria-pressed={active} onClick={() => toggleCategory(c)}>
                          <span className="rt-benefit__icon" aria-hidden="true"><i className={`${c ? testCategoryIcons[c] : "icon-book"} text-16`}></i></span>
                          <span className="rt-tpcat__text">
                            <span className="rt-tpcat__name">{c || "All tests"}</span>
                            <span className="rt-tpcat__count">{countLabel(c ? counts[c] : tests.length)}</span>
                          </span>
                        </button>
                        {/* "All tests" is not a category: a rule sets it apart from the categories below */}
                        {!c && <hr className="rt-tpcats__rule" aria-hidden="true" />}
                      </Fragment>
                    );
                  })}
                </div>
              </div>
              <FilterScrollPill scrollRef={scrollRef} />
            </aside>

            <div className="rt-res" ref={resultsRef}>
              <div className="rt-res__toolbar">
                <div className="rt-res__counts">
                  <p className="rt-res__count" id="rt-res-count" aria-live="polite" ref={countRef} tabIndex={-1}>
                    {chips.length ? `${countLabel(list.length)} found` : countLabel(list.length)}
                  </p>
                  <p className="rt-res__showing">{list.length > PAGE_SIZE ? `Showing ${from} to ${to} of ${list.length}` : ""}</p>
                </div>
              </div>

              <ActiveFilters chips={chips} onRemove={removeChip} onClearAll={clear} />

              {list.length === 0 ? (
                <div className="rt-res__empty" role="status">
                  <p className="rt-res__empty-title">No tests match your search</p>
                  <p>Try another name, or see all tests.</p>
                  <div className="rt-res__empty-actions">
                    <button type="button" className="button -md -purple-1 text-white" onClick={clear}>Show all tests</button>
                  </div>
                </div>
              ) : (
                <>
                  <ul className="row x-gap-20 y-gap-20 rt-tp__list">
                    {pageItems.map((t) => (
                      <li key={t.slug} className="col-md-6">
                        <TestCard t={t} />
                      </li>
                    ))}
                  </ul>
                  {totalPages > 1 && <CataloguePagination page={current} totalPages={totalPages} hrefFor={hrefFor} onNavigate={goToPage} />}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
