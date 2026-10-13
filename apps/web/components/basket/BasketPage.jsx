"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useContextElement } from "@/context/Context";
import { basket as copy } from "@/data/basket";
import { basketIssues, basketTotals, isSelected, lineFor, lineKey, mergeLines, promoFor } from "@/lib/basket";
import { useSkillSaver } from "@/lib/useSkillSaver";
import { bookableModes, defaultMode, formatShortDate, getCourseBySlug } from "@/lib/courses";
import { DatesPicker } from "@/components/courseDetail/DatesDialog";
import BasketSteps from "./BasketSteps";
import BasketLine from "./BasketLine";
import { BasketBar, BasketSummary } from "./BasketSummary";
import HomeCourseCard from "@/components/home/HomeCourseCard";
import { useHeaderOffset } from "@/components/testPrep/subject/useHeaderOffset";

const PROMO_KEY = "rt-promo";
const UNDO_MS = 9000;

// The course basket: the title and the booking steps, then the lines (one per course and date) beside a sticky order summary, then
// a few more courses. Everything is kept in the shared basket (context, saved in this browser): changing the delegates, the package
// or the first aid choice updates the line at once. A removed line can be put back for a few seconds. Courses already in the basket
// are left out of "You might also like" (`recommended` arrives from the server as home's course cards).
// Only the ticked lines are paid for (the summary, Proceed and what blocks it count those); "Select all" ticks or clears them all.
// A date is chosen or changed in the date pop-up on this page; the line takes the new date (merging with a line already on it).
export default function BasketPage({ recommended }) {
  const { cartCourses, setCartCourses } = useContextElement();
  const [ready, setReady] = useState(false);
  const [promo, setPromo] = useState(null);
  const [removed, setRemoved] = useState(null); // { item, index }
  const [dates, setDates] = useState(null); // { key, detail, mode, selectedId } while the date pop-up is in use
  const [datesOpen, setDatesOpen] = useState(false);
  const [announce, setAnnounce] = useState("");
  const allRef = useRef(null);
  useHeaderOffset();

  // The basket and the promo code are read in the browser after mount, so the server and the first client render match.
  useEffect(() => {
    try {
      setPromo(promoFor(window.sessionStorage.getItem(PROMO_KEY)));
    } catch {}
    setReady(true);
  }, []);
  const choosePromo = (next) => {
    setPromo(next);
    try {
      next ? window.sessionStorage.setItem(PROMO_KEY, next.code) : window.sessionStorage.removeItem(PROMO_KEY);
    } catch {}
  };

  useEffect(() => {
    if (!removed) return;
    const t = setTimeout(() => setRemoved(null), UNDO_MS);
    return () => clearTimeout(t);
  }, [removed]);

  const change = (key, patch) => setCartCourses((list) => mergeLines(list.map((i) => (lineKey(i) === key ? { ...i, ...patch } : i))));

  // the date pop-up opens on the line's own study method (the course page's first choice for a line without one); only the line's
  // current date is marked "Selected", so nothing looks chosen that is not
  const openDates = (item) => {
    const detail = getCourseBySlug(item.id);
    if (!detail) return;
    const mode = bookableModes(detail).includes(item.mode) ? item.mode : defaultMode(detail);
    setDates({ key: lineKey(item), detail, mode, line: { mode: item.mode, sessionId: item.sessionId } });
    setDatesOpen(true);
  };
  const pickDate = (id) => {
    const session = dates.detail.sessions.find((s) => s.id === id);
    if (!session) return;
    change(dates.key, lineFor(dates.detail, session)); // delegates, package, first aid and the tick stay as they were
    setDatesOpen(false);
    setAnnounce(copy.dateChanged.replace("{date}", session.mode === "ondemand" ? session.time.toLowerCase() : formatShortDate(session.date)).replace("{place}", session.location));
  };
  const remove = (item) => {
    setRemoved({ item, index: cartCourses.indexOf(item) });
    setCartCourses((list) => list.filter((i) => i !== item));
  };
  const undo = () => {
    setCartCourses((list) => {
      const next = [...list];
      next.splice(Math.min(removed.index, next.length), 0, removed.item);
      return next;
    });
    setRemoved(null);
  };

  const chosen = cartCourses.filter(isSelected);
  const saver = useSkillSaver(); // the signed-in learner's level; null signed out, undefined while checking
  const totals = basketTotals(chosen, promo, saver || null);
  const issues = chosen.length ? basketIssues(chosen) : [copy.select.none];
  const allOn = chosen.length === cartCourses.length;
  const selectAll = (on) => setCartCourses((list) => list.map((i) => ({ ...i, selected: on })));
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = chosen.length > 0 && !allOn;
  });
  const empty = ready && cartCourses.length === 0;
  const more = recommended.filter((c) => !cartCourses.some((i) => i.id === c.id)).slice(0, 4);

  return (
    <>
      <section className="rt-bk__head">
        <div className="container">
          <div className="rt-bk__headrow">
            <div>
              <h1 className="rt-bk__h1">{copy.title}</h1>
              {ready && cartCourses.length > 0 && <p className="rt-bk__count">{cartCourses.length} {cartCourses.length === 1 ? "course" : "courses"} in your basket</p>}
            </div>
            <Link href={copy.continueLink.href} className="fb-textlink">{copy.continueLink.label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
          </div>
          <BasketSteps steps={copy.steps} current={1} />
        </div>
      </section>

      <section className="rt-bk layout-pt-md layout-pb-lg" aria-label="Your courses">
        <div className="container">
          {removed && (
            <div className="rt-bk__undo" role="status">
              <span>Removed <b>{removed.item.title}</b>.</span>
              <button type="button" onClick={undo}>Undo</button>
            </div>
          )}

          {empty && (
            <div className="rt-bk__empty">
              <span className="rt-bk__emptyicon" aria-hidden="true"><i className="icon-basket text-24"></i></span>
              <h2>{copy.empty.title}</h2>
              <p>{copy.empty.text}</p>
              <Link href={copy.empty.cta.href} className="button -md -purple-1 text-white">{copy.empty.cta.label}<i className="icon-arrow-right text-13 ml-10" aria-hidden="true"></i></Link>
            </div>
          )}

          {ready && cartCourses.length > 0 && (
            <div className="rt-bk__layout">
              <div className="rt-bk__lines" id="rt-bk-lines">
                {cartCourses.length > 1 && (
                  <div className="rt-bk__select">
                    <label className="rt-bk__check">
                      <input type="checkbox" ref={allRef} checked={allOn} onChange={(e) => selectAll(e.target.checked)} />
                      <span>{copy.select.all}</span>
                    </label>
                    <span className="rt-bk__selcount" aria-live="polite">{copy.select.count.replace("{n}", chosen.length).replace("{total}", cartCourses.length)}</span>
                  </div>
                )}
                {cartCourses.map((item) => (
                  <BasketLine key={lineKey(item)} item={item} onChange={(patch) => change(lineKey(item), patch)} onRemove={() => remove(item)} onDates={() => openDates(item)} />
                ))}
              </div>
              <BasketSummary totals={totals} issues={issues} promo={promo} onPromo={choosePromo} count={{ chosen: chosen.length, total: cartCourses.length }} signedOut={saver === null} />
            </div>
          )}
        </div>
      </section>

      {ready && more.length > 0 && (
        <section className="rt-bk__more layout-pt-lg layout-pb-lg" aria-labelledby="rt-bk-more-h">
          <div className="container">
            <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{copy.recommended.eyebrow}</div>
            <h2 className="rt-bk__moreh" id="rt-bk-more-h">{copy.recommended.title}</h2>
            <div className="row y-gap-30 mt-30">
              {more.map((c) => <HomeCourseCard key={c.id} data={c} />)}
            </div>
          </div>
        </section>
      )}

      {ready && cartCourses.length > 0 && <BasketBar totals={totals} issues={issues} />}

      <p className="rt-sr" aria-live="polite">{announce}</p>
      <DatesPicker
        open={datesOpen}
        onClose={() => setDatesOpen(false)}
        course={dates?.detail}
        mode={dates?.mode}
        modes={dates ? bookableModes(dates.detail) : undefined}
        onMode={(m) => setDates((d) => ({ ...d, mode: m }))}
        selectedId={dates && dates.mode === dates.line.mode ? dates.line.sessionId : undefined}
        onPick={pickDate}
      />
    </>
  );
}
