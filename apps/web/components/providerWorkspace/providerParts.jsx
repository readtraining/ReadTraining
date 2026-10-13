"use client";

import React from "react";
import Link from "next/link";

// Shared bits of the provider workspace. The pills, tabs, search, address helpers and date-time format are the admin's
// (components/admin/adminParts.jsx), so both work layouts look and behave the same. Added here: the status tones, the loading
// skeleton, the empty state, a toggle switch and a labelled select for toolbars.
export { Pill, Tabs, Search, setQuery, getQuery, formatWhen } from "@/components/admin/adminParts";

export const COURSE_TONE = { draft: "muted", pending: "warn", approved: "ok", changes: "late" };
export const COHORT_TONE = { upcoming: "info", progress: "warn", completed: "muted", partial: "warn", certificated: "ok", cancelled: "muted" };
export const ORDER_TONE = { paid: "ok", incomplete: "warn", cancelled: "muted", refunded: "muted", partial: "info", dispute: "late", lost: "late" };
export const REFUND_TONE = { open: "warn", approved: "ok", declined: "muted" };

// While the records load: grey blocks in the shape of the page (a strip of stats, then cards), not a spinner.
export function Loading({ rows = 3, stats = false }) {
  return (
    <div className="rt-acc__stack rt-pws-skel" aria-busy="true" aria-label="Loading">
      {stats && <div className="rt-pws-skel__stats">{[0, 1, 2, 3].map((i) => <span key={i} className="rt-pws-skel__block -stat"></span>)}</div>}
      {Array.from({ length: rows }, (_, i) => <span key={i} className="rt-pws-skel__block"></span>)}
    </div>
  );
}

// No records yet: a short title, one line, and one action (DESIGN-SYSTEM.md, section 7).
export function Empty({ title, text, action }) {
  return (
    <div className="rt-acc__card rt-pws-empty">
      <p className="rt-pws-empty__title">{title}</p>
      {text && <p className="rt-acc__note">{text}</p>}
      {action && (action.href
        ? <Link href={action.href} className="button -sm -purple-1 text-white">{action.label}</Link>
        : <button type="button" className="button -sm -purple-1 text-white" onClick={action.onClick}>{action.label}</button>)}
    </div>
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
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
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

// Stats strip, the admin dashboard's: icon, number, label.
export function Stats({ items, label }) {
  return (
    <ul className="rt-tps__keyfacts rt-acc__stats" aria-label={label}>
      {items.map((s) => (
        <li key={s.label} className="rt-tps__keyfact">
          <span className="rt-benefit__icon" aria-hidden="true"><i className={`${s.icon} text-16`}></i></span>
          <span className="rt-tps__keyfact-text"><strong>{s.value}</strong><span className="rt-sr">, </span><span>{s.label}</span></span>
        </li>
      ))}
    </ul>
  );
}

// "Tue 20 Oct" from an ISO day, and a range from a date-time in ms
const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
export const shortDay = (iso) => dayFmt.format(new Date(`${iso}T00:00:00Z`));
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
export const formatDay = (ms) => dateFmt.format(new Date(ms));
