"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { IN_HOUSE_NOTE, MODE_LABEL, QUOTE_HREF, useBooking } from "./BookingProvider";
import { formatDateRange, formatPrice } from "@/lib/courses";

const CardCheck = () => (
  <svg className="rt-cd__check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.8" />
  </svg>
);

// Existing descriptions per option. An option with no description (On Demand) simply shows none.
const BULLETS = {
  classroom: ["Focused study away from the workplace.", "Face-to-face support with experienced tutors.", "Interact with fellow professionals."],
  online: ["Learn from home or at work.", "Live sessions with an experienced tutor.", "Join from any device."],
  inhouse: [
    "Book more, pay less: bulk discounts available.",
    "Choose from our centres or train on-site.",
    "Train your team together on a date that suits you.",
    "Customisable course content tailored to your workplace.",
    "Expert-led, hands-on training delivered at your location.",
  ],
};
const VISIBLE = 4;

// Learning options: the one place where the choice is made. Radio cards for every option the course offers, then the
// dates for the selected option, then the staff training and exam prep boxes. Choosing never moves the page.
export default function LearningSection() {
  const { course, modes, mode, setMode, city, setCity, session, selectSession, isInHouse } = useBooking();
  const [expanded, setExpanded] = useState(false);

  const cities = useMemo(() => [...new Set(course.sessions.filter((s) => s.mode === "classroom").map((s) => s.city))].sort(), [course]);
  const fromFor = (m) => Math.min(...course.sessions.filter((s) => s.mode === m).map((s) => s.price));
  const rows = course.sessions.filter((s) => s.mode === mode && (mode !== "classroom" || !city || s.city === city));
  const shown = expanded ? rows : rows.slice(0, VISIBLE);
  const hidden = rows.length - VISIBLE;
  const extras = (course.extras || []).slice(0, 2);

  return (
    <section className="rt-cd__sec rt-lo" id="learning-options" aria-labelledby="rt-cd-lo-h">
      <h2 id="rt-cd-lo-h">Learning options</h2>

      <fieldset className="rt-lo__cards" style={{ "--lo-cols": Math.min(modes.length, 3) }}>
        <legend className="rt-cd__sr">How do you want to learn?</legend>
        {modes.map((m) => {
          const on = mode === m;
          return (
            <div key={m} className="rt-lo__col">
              <label className={`rt-lo__card${on ? " is-selected" : ""}`}>
                <input type="radio" name="rt-lo-mode" value={m} checked={on} onChange={() => setMode(m)} />
                <span className="rt-lo__radio" aria-hidden="true" />
                {course.popularMode === m && <span className="rt-cd__lo-tag">Most popular</span>}
                <h3>{m === "inhouse" ? "Team training solutions" : MODE_LABEL[m]}</h3>
                {BULLETS[m] && (
                  <ul>
                    {BULLETS[m].map((b) => <li key={b}><CardCheck /> {b}</li>)}
                  </ul>
                )}
                <p className="rt-lo__from">
                  {m === "inhouse" ? <span className="rt-cd__lo-quote">Contact us for a quote</span> : <>From <strong>{formatPrice(fromFor(m))}</strong></>}
                </p>
              </label>
              {m === "inhouse" && <Link href={QUOTE_HREF} className="rt-cd__team">Booking for a team? Get a group quote</Link>}
            </div>
          );
        })}
      </fieldset>

      <div className="rt-lo__dates" id="dates">
        <h3 className="rt-lo__h">Study options for the {course.title}</h3>

        {isInHouse ? (
          <div className="rt-lo__inhouse">
            <p>{IN_HOUSE_NOTE}</p>
            <p className="rt-cd__empty">In-house training is arranged on a date and at a place that suit your team. Choose Get a quote and we will confirm availability.</p>
            <Link href={QUOTE_HREF} className="rt-cd__ghost">Get a quote</Link>
          </div>
        ) : (
          <>
            {mode === "classroom" && (
              <label className="rt-cd__select">
                <span className="rt-cd__sr">Location</span>
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">All locations</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            )}

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
                        {s.address && <span>{s.address}, {s.postcode}</span>}
                        <span>Provided by {s.provider}</span>
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
