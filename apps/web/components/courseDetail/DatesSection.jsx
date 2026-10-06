"use client";

import React, { useMemo, useState } from "react";
import { MODE_LABEL, useBooking } from "./BookingProvider";
import { formatDateRange, formatPrice } from "@/lib/courses";

const VISIBLE = 4;

// Learning options: pills (synced with the booking card), a location filter (classroom only) and the session list.
// Selecting a session updates the shared state, shows a toast and never moves the page.
export default function DatesSection() {
  const { course, modes, mode, isInHouse, setMode, city, setCity, session, selectSession } = useBooking();
  const [expanded, setExpanded] = useState(false);

  const cities = useMemo(
    () => [...new Set(course.sessions.filter((s) => s.mode === "classroom").map((s) => s.city))].sort(),
    [course],
  );
  const rows = course.sessions.filter((s) => s.mode === mode && (mode !== "classroom" || !city || s.city === city));
  const shown = expanded ? rows : rows.slice(0, VISIBLE);
  const hidden = rows.length - VISIBLE;

  return (
    <section className="rt-cd__sec" id="dates" aria-labelledby="rt-cd-dates-h">
      <h2 id="rt-cd-dates-h">Study options for the {course.title}</h2>

      <div className="rt-cd__filters">
        <div className="rt-cd__pills" role="group" aria-label="Delivery">
          {modes.map((m) => (
            <button key={m} type="button" className="rt-cd__pill" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        {mode === "classroom" && (
          <label className="rt-cd__select">
            <span className="rt-cd__sr">Location</span>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All locations</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {isInHouse ? (
        <p className="rt-cd__empty">In-house training is arranged on a date and at a place that suit your team. Choose Get a quote and we will confirm availability.</p>
      ) : rows.length === 0 ? (
        <p className="rt-cd__empty">No dates in this location yet. Try another location.</p>
      ) : (
        <ul className="rt-cd__sessions">
          {shown.map((s) => {
            const selected = session.id === s.id;
            return (
              <li key={s.id} className={`rt-cd__row${selected ? " is-selected" : ""}`}>
                <div className="rt-cd__row-date">
                  <strong>{formatDateRange(s.date, s.endDate)}</strong>
                  <span>{s.time}</span>
                </div>
                <div className="rt-cd__row-where">
                  <strong>{s.venue || "Live online"}</strong>
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

      {!isInHouse && hidden > 0 && (
        <button type="button" className="rt-cd__link rt-cd__more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show fewer dates" : `Show more dates (${hidden})`}
        </button>
      )}
    </section>
  );
}
