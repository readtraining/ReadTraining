"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { IN_HOUSE_NOTE, MODE_LABEL, QUOTE_HREF, useBooking } from "./BookingProvider";
import { formatDateRange, formatPrice } from "@/lib/courses";

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
const VISIBLE = 4;

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
  const shown = expanded ? rows : rows.slice(0, VISIBLE);
  const hidden = rows.length - VISIBLE;
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

      <div className="rt-lo__dates" id="dates">
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
        ) : (
          <>
            {rows.length === 0 ? (
              <p className="rt-cd__empty">No dates in this location yet. Try another location.</p>
            ) : (
              <ul className="rt-cd__sessions">
                {shown.map((s) => {
                  const selected = session.id === s.id;
                  return (
                    <li key={s.id} className={`rt-cd__row${selected ? " is-selected" : ""}`}>
                      <div className="rt-cd__row-date">
                        <strong>{mode === "ondemand" ? s.time : formatDateRange(s.date, s.endDate)}</strong>
                        {mode !== "ondemand" && <span>{s.time}</span>}
                      </div>
                      <div className="rt-cd__row-where">
                        <strong>{s.venue || s.location}</strong>
                        <span>{s.address ? `${s.address}, ${s.postcode} · ` : ""}Provided by {s.provider}</span>
                      </div>
                      <div className="rt-cd__row-price">{formatPrice(s.price)}</div>
                      <button type="button" className={`rt-cd__select-btn${selected ? " is-on" : ""}`} aria-pressed={selected} onClick={() => selectSession(s.id)}>
                        {selected ? "Selected" : "Select"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {hidden > 0 && (
              <button type="button" className="rt-cd__link rt-cd__more" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Show fewer dates" : `Show more dates (${hidden})`}
              </button>
            )}
          </>
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
