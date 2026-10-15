"use client";

import React from "react";
import Link from "next/link";
import { dueState } from "@/lib/admin";

// Shared bits of the admin pages, all from the site's design system: the account's status pills (.rt-pill .rt-acc__status), the
// filter chips with counts (.rt-tr__filter), the stats strip, the account card (.rt-acc__card) and the business account's table
// (.rt-biz__table). The account, business, admin and provider pages all use these.

// Stats strip, the account and admin dashboards': icon, number, label. `items` is [{ icon, value, label }]; `iconSize` is the
// icon's text size (16, or 18 on the learner and business dashboards).
export function Stats({ items, label, iconSize = 16 }) {
  return (
    <ul className="rt-tps__keyfacts rt-acc__stats" aria-label={label}>
      {items.map((s) => (
        <li key={s.label} className="rt-tps__keyfact">
          <span className="rt-benefit__icon" aria-hidden="true"><i className={`${s.icon} text-${iconSize}`}></i></span>
          <span className="rt-tps__keyfact-text"><strong>{s.value}</strong><span className="rt-sr">, </span><span>{s.label}</span></span>
        </li>
      ))}
    </ul>
  );
}

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

// A row's "…" menu (Hurak's row actions: View / Move / Edit / Trash, Edit Details / Reschedule / Resit / Notes / Timeline).
// `items`: [{ label, onClick } | { label, href }], `danger` for a destructive item. A real menu: arrow keys move between items,
// Esc closes it and puts focus back on the button, a click outside closes it. Looks like the site's dropdown panel.
// The provider's account menu uses it too: `trigger` replaces the dots, `head` goes above the items, and { group } items label
// the ones after them.
export function RowMenu({ label, items, trigger = null, triggerClass = "", head = null }) {
  const [open, setOpen] = React.useState(false);
  const wrap = React.useRef(null);
  const btn = React.useRef(null);
  const id = React.useId();
  React.useEffect(() => {
    if (!open) return;
    const first = wrap.current?.querySelector('[role="menuitem"]');
    first?.focus();
    const out = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, [open]);
  const onKey = (e) => {
    const all = [...wrap.current.querySelectorAll('[role="menuitem"]')];
    const i = all.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); btn.current?.focus(); }
    if (e.key === "ArrowDown") { e.preventDefault(); all[(i + 1) % all.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); all[(i - 1 + all.length) % all.length]?.focus(); }
    if (e.key === "Home") { e.preventDefault(); all[0]?.focus(); }
    if (e.key === "End") { e.preventDefault(); all[all.length - 1]?.focus(); }
    if (e.key === "Tab") setOpen(false);
  };
  const pick = (item) => {
    setOpen(false);
    item.onClick?.();
  };
  return (
    <div className={`rt-rowmenu${open ? " is-open" : ""}`} ref={wrap} onKeyDown={open ? onKey : undefined}>
      <button type="button" ref={btn} className={trigger ? triggerClass : "rt-rowmenu__btn"} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {trigger || <span aria-hidden="true">•••</span>}<span className="rt-sr">{label}</span>
      </button>
      {open && (
        <ul className="rt-rowmenu__list" role="menu" id={id} aria-label={label}>
          {head && <li role="none" className="rt-rowmenu__head">{head}</li>}
          {items.map((item) => (
            <li key={item.group || item.label} role="none" className={item.group ? "rt-rowmenu__group" : undefined}>
              {item.group ? item.group : item.href
                ? <Link role="menuitem" href={item.href} className={item.danger ? "-danger" : undefined} tabIndex={-1} onClick={() => setOpen(false)}>{item.label}</Link>
                : <button type="button" role="menuitem" className={item.danger ? "-danger" : undefined} tabIndex={-1} onClick={() => pick(item)}>{item.label}</button>}
            </li>
          ))}
        </ul>
      )}
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
