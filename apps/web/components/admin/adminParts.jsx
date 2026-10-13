"use client";

import React from "react";
import { dueState } from "@/lib/admin";

// Shared bits of the admin pages, all from the site's design system: the account's status pills (.rt-pill .rt-acc__status), the
// filter chips with counts (.rt-tr__filter), the account card (.rt-acc__card) and the business account's table (.rt-biz__table).

// A status as the account's pill. Tones: info (purple), ok (green), warn (orange), muted (grey), late (red outline).
const TONE = { info: "confirmed", ok: "completed", warn: "requested", muted: "cancelled", late: "late" };
export const Pill = ({ tone = "info", children }) => <span className={`rt-pill rt-acc__status -${TONE[tone]}`}>{children}</span>;

// A deadline: "Due in 2 days" / "Due today" / "Overdue by 1 day", coloured by how close it is.
export function Due({ due, now }) {
  const d = dueState(due, now);
  return <span className={`rt-adm-due -${d.tone}`}>{d.text}</span>;
}

// Tabs as the account's filter chips, each with its count; the chosen tab is pressed.
export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="rt-acc__tabs" role="group" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.key} type="button" className={`rt-tr__filter${value === t.key ? " is-on" : ""}`} aria-pressed={value === t.key} onClick={() => onChange(t.key)}>
          {t.label}
          {t.count !== undefined && <span className="rt-tr__filter-n">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// A search box in the site's field style, with a label for screen readers.
export function Search({ value, onChange, label }) {
  return (
    <div className="rt-adm-search">
      <i className="icon-search text-14" aria-hidden="true"></i>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} aria-label={label} />
    </div>
  );
}

// Keeps a page's tab in the address (?tab=) so a view can be shared and the back button returns to it.
export const setQuery = (key, value) => {
  try {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", url);
  } catch {}
};
export const getQuery = (key) => {
  try {
    return new URLSearchParams(window.location.search).get(key);
  } catch {
    return null;
  }
};

// A short date and time, en-GB: "12 Oct, 14:05"
const dt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
export const formatWhen = (ms) => dt.format(new Date(ms));
