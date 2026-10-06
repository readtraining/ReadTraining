"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IN_HOUSE_NOTE, MODE_LABEL, QUOTE_HREF, useBooking } from "./BookingProvider";
import { formatDate, formatPrice } from "@/lib/courses";

const Check = () => (
  <svg className="rt-cd__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L20 7" />
  </svg>
);

// Existing descriptions per option. An option with no description (On Demand) simply shows none.
const BULLETS = {
  classroom: ["Focused study away from the workplace.", "Face-to-face support with experienced tutors.", "Interact with fellow professionals."],
  online: ["Learn from home or at work.", "Live sessions with an experienced tutor.", "Join from any device."],
  ondemand: ["Start anytime at your own pace."],
  inhouse: [
    "Book more, pay less: bulk discounts available.",
    "Choose from our centres or train on-site.",
    "Train your team together on a date that suits you.",
    "Customisable course content tailored to your workplace.",
    "Expert-led, hands-on training delivered at your location.",
  ],
};
const VISIBLE = 5;

const tilePart = (iso, opts) => new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

// Session dates as tiles (one radio per date) with a detail line for the chosen one. On Demand has no dates, so it only
// shows the detail line. Desktop shows 5 tiles and "Show more dates" reveals the rest; under 640px all tiles sit in one
// row that scrolls sideways.
function DateTiles({ rows, mode, session, selectSession, expanded, setExpanded }) {
  const rowRef = useRef(null);
  const onDemand = mode === "ondemand";
  const current = rows.find((r) => r.id === session.id) || rows[0];
  const hidden = rows.length - VISIBLE;
  const prices = rows.map((r) => r.price);
  const lowest = Math.min(...prices);
  const showLowest = Math.max(...prices) !== lowest;
  const startOf = (t) => String(t || "").split(" to ")[0];

  // Keep the chosen tile in view inside the sideways row only (the page itself never scrolls).
  useEffect(() => {
    const row = rowRef.current;
    const tile = row?.querySelector("label.is-selected");
    if (!row || !tile || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: tile.offsetLeft - (row.clientWidth - tile.offsetWidth) / 2, behavior: "auto" });
  }, [session.id]);

  return (
    <>
      {!onDemand && (
        <>
          <div className="rt-dt" id="dates" role="radiogroup" aria-label="Choose a date" ref={rowRef}>
            {rows.map((s, i) => {
              const on = current.id === s.id;
              const sameDay = rows.some((o) => o.id !== s.id && o.date === s.date);
              return (
                <label key={s.id} className={`rt-dt__tile${on ? " is-selected" : ""}${i >= VISIBLE && !expanded ? " is-extra" : ""}`}>
                  <input type="radio" name="rt-dt-session" value={s.id} checked={on} onChange={() => selectSession(s.id)} />
                  {showLowest && s.price === lowest && <span className="rt-dt__low">Lowest</span>}
                  <span className="rt-dt__muted">{tilePart(s.date, { weekday: "short" })}</span>
                  <strong className="rt-dt__day">{tilePart(s.date, { day: "numeric" })}</strong>
                  <span className="rt-dt__muted">{tilePart(s.date, { month: "short" })}</span>
                  {mode === "classroom" && s.city && <span className="rt-dt__muted rt-dt__city">{s.city}</span>}
                  {sameDay && <span className="rt-dt__muted">{startOf(s.time)}</span>}
                  <span className="rt-dt__price">{formatPrice(s.price)}</span>
                </label>
              );
            })}
          </div>
          {hidden > 0 && (
            <button type="button" className="rt-cd__link rt-cd__more rt-dt__toggle" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show fewer dates" : `Show more dates (${hidden})`}
            </button>
          )}
        </>
      )}

      <div className="rt-dt__detail" id={onDemand ? "dates" : undefined} aria-live="polite">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <strong>{onDemand ? current.time : formatDate(current.date)}</strong>
        <span className="rt-dt__muted-14">{onDemand ? "" : `${current.time}, `}provided by {current.provider}</span>
        {mode === "classroom" && current.venue && <span className="rt-dt__muted-14">{current.venue}{current.address ? `, ${current.address}, ${current.postcode}` : ""}</span>}
        <strong className="rt-dt__dprice">{formatPrice(current.price)}</strong>
      </div>
    </>
  );
}

// Learning options: the one place where the choice is made. The dated options (Classroom, Live online, On Demand) sit in one
// row of radio cards; team training (In-house) is a full-width card under them. The dates for the selected option follow,
// then the staff training and exam prep boxes. Choosing never moves the page.
export default function LearningSection() {
  const { course, modes, mode, setMode, city, setCity, session, selectSession, isInHouse } = useBooking();
  const [expanded, setExpanded] = useState(false);
  const [full, setFull] = useState(null);

  const cities = useMemo(() => [...new Set(course.sessions.filter((s) => s.mode === "classroom").map((s) => s.city))].sort(), [course]);
  const fromFor = (m) => Math.min(...course.sessions.filter((s) => s.mode === m).map((s) => s.price));
  const rows = course.sessions.filter((s) => s.mode === mode && (mode !== "classroom" || !city || s.city === city));
  const extras = (course.extras || []).slice(0, 2);

  return (
    <section className="rt-cd__sec rt-lo" id="learning-options" aria-labelledby="rt-cd-lo-h">
      <h2 id="rt-cd-lo-h">Learning options</h2>

      <fieldset className="rt-lc__fs">
        <legend className="rt-cd__sr">How do you want to learn?</legend>
        <div className="rt-lc" role="radiogroup" aria-label="How do you want to learn?" style={{ "--lc-cols": Math.min(modes.length, 3) }}>
          {modes.map((m) => {
            const on = mode === m;
            const list = BULLETS[m] || [];
            const more = list.length - 2;
            return (
              <label key={m} className={`rt-lc__card${on ? " is-selected" : ""}`}>
                <input type="radio" name="rt-lo-mode" value={m} checked={on} onChange={() => setMode(m)} />
                <span className="rt-lc__top">
                  {course.popularMode === m ? <span className="rt-lc__badge">Most popular</span> : <span />}
                  <span className={`rt-bs__radio${on ? " is-on" : ""}`} aria-hidden="true" />
                </span>
                <h3 className="rt-lc__name">{m === "inhouse" ? "Team training solutions" : MODE_LABEL[m]}</h3>
                {list.length > 0 && (
                  <ul className="rt-lc__list">
                    {list.slice(0, 2).map((b) => <li key={b}><Check /> <span>{b}</span></li>)}
                  </ul>
                )}
                {more > 0 && (
                  <button type="button" className="rt-lc__more" onClick={() => { setMode(m); setFull(m); }}>+ {more} more</button>
                )}
                <span className="rt-lc__price">
                  {m === "inhouse" ? <span className="rt-lc__quote">Contact us for a quote</span> : <><span>From</span> <strong>{formatPrice(fromFor(m))}</strong></>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="rt-lo__dates">
        <div className="rt-lo__dates-head">
          <h3 className="rt-lo__h">Study options for the {course.title}</h3>
          {!isInHouse && mode === "classroom" && (
            <label className="rt-cd__select">
              <span className="rt-cd__sr">Location</span>
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">All locations</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}
        </div>

        {!isInHouse && full === mode && BULLETS[mode]?.length > 2 && (
          <ul className="rt-lc__full">
            {BULLETS[mode].map((b) => <li key={b}><Check /> <span>{b}</span></li>)}
          </ul>
        )}

        {isInHouse ? (
          <div className="rt-lo__inhouse">
            <ul className="rt-lc__full rt-lc__full--cols">
              {BULLETS.inhouse.map((b) => <li key={b}><Check /> <span>{b}</span></li>)}
            </ul>
            <div className="rt-lc__cta">
              <Link href={QUOTE_HREF} className="rt-lc__quote-btn">Get a quote</Link>
              <Link href={QUOTE_HREF} className="rt-cd__team">Booking for a team? Get a group quote</Link>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <p className="rt-cd__empty">No dates in this location yet. Try another location.</p>
        ) : (
          <DateTiles rows={rows} mode={mode} session={session} selectSession={selectSession} expanded={expanded} setExpanded={setExpanded} />
        )}
      </div>

      <div className="rt-lo__xtra">
        <div className="rt-cd__staff">
          <strong>Interested in staff training?</strong>
          <p>Create an account to get exclusive discounts on group bookings.</p>
          <Link href={QUOTE_HREF} className="rt-cd__link">Click for more info</Link>
        </div>

        {extras.length > 0 && (
          <div className="rt-cd__extras">
            <p className="rt-cd__extras-title">Prepare for your exams</p>
            <ul>
              {extras.map((x) => (
                <li key={x.title}>
                  <span className="rt-cd__extras-main">
                    <Link href={x.url} className="rt-cd__extras-link">{x.title}</Link>
                    {x.note && <small>{x.note}</small>}
                  </span>
                  <span>{x.price > 0 ? formatPrice(x.price) : "Free"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
