"use client";

import React from "react";
import Link from "next/link";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";

// Shared bits of the provider workspace. The pills, tabs, search, address helpers and date-time format are the admin's
// (components/admin/adminParts.jsx), so both work layouts look and behave the same. Added here: the status tones, the loading
// skeleton, the empty state, a toggle switch and a labelled select for toolbars.
export { Pill, Tabs, Search, Stats, RowMenu, setQuery, getQuery, formatWhen } from "@/components/admin/adminParts";

export const COURSE_TONE = { draft: "muted", pending: "warn", approved: "ok", changes: "late" };
export const COHORT_TONE = { upcoming: "info", progress: "warn", completed: "muted", partial: "warn", certificated: "ok", cancelled: "muted" };
export const ORDER_TONE = { paid: "ok", incomplete: "warn", cancelled: "muted", refunded: "muted", partial: "info", dispute: "late", lost: "late" };

// While the records load: grey blocks in the shape of the page (a strip of stats, then cards), not a spinner.
export function Loading({ rows = 3, stats = false }) {
  return (
    <div className="rt-acc__stack rt-pws-skel" aria-busy="true" aria-label="Loading">
      {stats && <div className="rt-pws-skel__stats">{[0, 1, 2, 3].map((i) => <span key={i} className="rt-pws-skel__block -stat"></span>)}</div>}
      {Array.from({ length: rows }, (_, i) => <span key={i} className="rt-pws-skel__block"></span>)}
    </div>
  );
}

// Hurak's List / Calendar switch above the cohorts and the calendar.
export function CohortViews({ current }) {
  return (
    <nav className="rt-pws-views" aria-label="Cohort views">
      {[["list", "List", "/provider/cohorts"], ["calendar", "Calendar", "/provider/calendar"]].map(([key, label, href]) => (
        <Link key={key} href={href} className={`rt-pws-views__link${current === key ? " is-on" : ""}`} aria-current={current === key ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}

// An on/off switch with its label (a real checkbox, so it works with the keyboard and screen readers).
export function Toggle({ id, checked, onChange, label, hint, disabled = false }) {
  return (
    <div className="rt-pws-toggle">
      <input id={id} type="checkbox" role="switch" className="rt-pws-toggle__input" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} aria-describedby={hint ? `${id}-h` : undefined} />
      <label htmlFor={id} className="rt-pws-toggle__label">
        <span className="rt-pws-toggle__track" aria-hidden="true"><span></span></span>
        <span>{label}</span>
      </label>
      {hint && <p className="rt-acc__note rt-pws-toggle__hint" id={`${id}-h`}>{hint}</p>}
    </div>
  );
}

// A select for a toolbar (course, status, date range), labelled for screen readers.
export function ToolSelect({ id, label, value, onChange, options }) {
  return (
    <div className="rt-field rt-adm-select -inline">
      <label htmlFor={id} className="rt-sr">{label}</label>
      <FieldSelect id={id} label={label} value={value} onChange={onChange} options={options} compact />
    </div>
  );
}

// Yes / No (or any two to four choices) as the catalogue's radio style.
export function Choice({ name, legend, value, onChange, options, error, hint }) {
  const errId = `${name}-e`;
  return (
    <fieldset className="rt-field rt-pws-choice" aria-describedby={error ? errId : undefined}>
      <legend>{legend}</legend>
      {hint && <p className="rt-acc__note">{hint}</p>}
      {error && <p className="rt-q__err" id={errId}><span className="rt-sr">Error: </span>{error}</p>}
      <div className="rt-pws-choice__row">
        {options.map((o) => (
          <label key={o.value} className="rt-fp__opt rt-pws-choice__opt">
            <input type="radio" className="rt-fp__radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} aria-invalid={error ? true : undefined} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Two or three larger choices, each a card with a line of explanation (and optional points), for questions that need it
// (course type, performance model, mode of study).
export function CardChoice({ name, legend, value, onChange, options, error, hideLegend = false }) {
  const errId = `${name}-e`;
  return (
    <fieldset className="rt-field rt-pws-optcards" aria-describedby={error ? errId : undefined}>
      <legend className={hideLegend ? "rt-sr" : undefined}>{legend}</legend>
      {error && <p className="rt-q__err" id={errId}><span className="rt-sr">Error: </span>{error}</p>}
      <div className="rt-pws-optcards__row">
        {options.map((o) => (
          <label key={o.value} className={`rt-pws-optcard${value === o.value ? " is-on" : ""}${o.disabled ? " is-off" : ""}`}>
            <input type="radio" className="rt-fp__radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} disabled={o.disabled} aria-invalid={error ? true : undefined} />
            <span>
              <b>{o.label}</b>
              {o.text && <small>{o.text}</small>}
              {o.points && <ul>{o.points.map((p) => <li key={p}><i className="icon-check text-10" aria-hidden="true"></i>{p}</li>)}</ul>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// "Tue 20 Oct" from an ISO day, and a range from a date-time in ms
const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
export const shortDay = (iso) => dayFmt.format(new Date(`${iso}T00:00:00Z`));
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
export const formatDay = (ms) => dateFmt.format(new Date(ms));
