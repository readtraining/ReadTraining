"use client";

import React from "react";
import Link from "next/link";
import Toast from "@/components/courses/Toast";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";

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

// An action's confirmation ("Credit saved", "Approved: …"): read out by screen readers and shown as the site's toast for a few
// seconds, so a change made from a menu or a sheet is never silent.
export function Said({ text }) {
  const [toast, setToast] = React.useState(null);
  const done = React.useCallback(() => setToast(null), []);
  React.useEffect(() => {
    if (text) setToast({ message: text });
  }, [text]);
  return (
    <>
      <p className="rt-sr" aria-live="polite">{text}</p>
      <Toast toast={toast} onDone={done} quiet />
    </>
  );
}

// Sortable tables: `useSort(first)` keeps which column sorts a table and which way (call it with the page's other hooks);
// `sorter.apply(rows, columns)` sorts the rows, where `columns` maps a column key to the value to sort by (a number, a date in
// ms, or text). <SortTh> is that column's header: a button that sorts by it, a second click turns it round, and aria-sort tells
// screen readers. Only for tables that hold every row; paged lists keep the server's order (newest first).
const collator = new Intl.Collator("en-GB", { sensitivity: "base", numeric: true });
export function useSort(first = null) {
  const [sort, setSort] = React.useState(first); // { key, dir: 1 | -1 } or null for the list's own order
  const apply = (rows, columns) => {
    if (!sort || !columns[sort.key]) return rows;
    const value = columns[sort.key];
    return [...rows].sort((a, b) => {
      const x = value(a), y = value(b);
      if (x == null || x === "") return 1;
      if (y == null || y === "") return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y))) * sort.dir;
    });
  };
  // a number column starts biggest first, a text column A to Z
  const by = (key, numeric = false) => setSort((s) => (s?.key === key ? { key, dir: -s.dir } : { key, dir: numeric ? -1 : 1 }));
  return { sort, by, apply };
}
export function SortTh({ label, col, sorter, numeric = false }) {
  const on = sorter.sort?.key === col;
  return (
    <th scope="col" aria-sort={on ? (sorter.sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className={`rt-adm-sort${on ? " is-on" : ""}`} onClick={() => sorter.by(col, numeric)}>
        {label}
        <span className="rt-adm-sort__arrow" aria-hidden="true">{on ? (sorter.sort.dir === 1 ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );
}

// Numbered pages for the long lists the server pages and sorts (orders, learners, providers, the activity log). `usePaging(sort)`
// keeps the page, rows a page and the sort (whose `sorter` drives <SortTh>, like useSort's) and mirrors them in the address
// (?page=&size=&sort=&dir=), so a view can be shared and the back button returns to it; `input` is what the list query takes.
// A new sort or page size starts again at page 1; a list whose filters change calls `restart()`.
const SIZES = [25, 50, 100];
export function usePaging(first) {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(50);
  const [sort, setSort] = React.useState(first); // { key, dir: 1 | -1 }
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const n = Number(getQuery("page"));
    const size = Number(getQuery("size"));
    const key = getQuery("sort");
    if (n > 1) setPage(Math.floor(n));
    if (SIZES.includes(size)) setLimit(size);
    if (key) setSort({ key, dir: getQuery("dir") === "asc" ? 1 : -1 });
    setReady(true);
  }, []);
  React.useEffect(() => {
    if (!ready) return;
    setQuery("page", page > 1 ? String(page) : "");
    setQuery("size", limit !== 50 ? String(limit) : "");
    const changed = sort.key !== first.key || sort.dir !== first.dir;
    setQuery("sort", changed ? sort.key : "");
    setQuery("dir", changed ? (sort.dir === 1 ? "asc" : "desc") : "");
  }, [ready, page, limit, sort]); // eslint-disable-line react-hooks/exhaustive-deps -- `first` is a constant
  const by = (key, numeric = false) => {
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: numeric ? -1 : 1 }));
    setPage(1);
  };
  return {
    ready,
    page,
    limit,
    setPage,
    setLimit: (n) => { setLimit(n); setPage(1); },
    restart: () => setPage(1),
    sorter: { sort, by },
    input: { page, limit, sort: sort.key, dir: sort.dir === 1 ? "asc" : "desc" },
  };
}
const count = new Intl.NumberFormat("en-GB");
export function Pager({ paging, total, label = "results" }) {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / paging.limit));
  const from = (paging.page - 1) * paging.limit + 1;
  const to = Math.min(total, paging.page * paging.limit);
  return (
    <nav className="rt-adm-pager" aria-label={`Pages of ${label}`}>
      <p className="rt-adm-pager__count" aria-live="polite">{from > total ? `Page ${paging.page} is empty` : `${count.format(from)} to ${count.format(to)} of ${count.format(total)}`}</p>
      <div className="rt-adm-pager__size">
        <label htmlFor={`rt-pg-${label}`}>Rows</label>
        <FieldSelect id={`rt-pg-${label}`} label="Rows a page" value={String(paging.limit)} onChange={(v) => paging.setLimit(Number(v))} options={SIZES.map((n) => ({ value: String(n), label: String(n) }))} compact />
      </div>
      <div className="rt-adm-pager__nav">
        <button type="button" onClick={() => paging.setPage(1)} disabled={paging.page <= 1} aria-label="First page">«</button>
        <button type="button" onClick={() => paging.setPage(paging.page - 1)} disabled={paging.page <= 1}>Previous</button>
        <span className="rt-adm-pager__where">Page {count.format(Math.min(paging.page, pages))} of {count.format(pages)}</span>
        <button type="button" onClick={() => paging.setPage(paging.page + 1)} disabled={paging.page >= pages}>Next</button>
        <button type="button" onClick={() => paging.setPage(pages)} disabled={paging.page >= pages} aria-label="Last page">»</button>
      </div>
    </nav>
  );
}

// Loading placeholders in the shape of what is coming (never a spinner): a table card's rows, or a record's page (its head card
// and two cards). Hidden from screen readers; the page is marked busy instead.
const bar = (w, h = 14) => <span className="rt-skel rt-skel--line" style={{ width: w, height: h }}></span>;
export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="rt-acc__card rt-adm-skel" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rt-adm-skel__row">{bar("22%")}{bar("30%")}{bar("16%")}{bar("12%", 22)}</div>
      ))}
    </div>
  );
}
export function DetailSkeleton() {
  return (
    <div className="rt-acc__stack" aria-hidden="true">
      <div className="rt-acc__card rt-adm-skel">{bar(90, 22)}{bar("40%", 28)}{bar("55%")}</div>
      <div className="rt-adm-grid2">
        {[0, 1].map((i) => <div key={i} className="rt-acc__card rt-adm-skel">{bar("35%", 20)}{bar("90%")}{bar("80%")}{bar("70%")}</div>)}
      </div>
    </div>
  );
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
// the ones after them. `phone` items show only below 576px (for actions that have their own buttons on wider screens).
export function RowMenu({ label, items, trigger = null, triggerClass = "", head = null }) {
  const [open, setOpen] = React.useState(false);
  const wrap = React.useRef(null);
  const btn = React.useRef(null);
  const id = React.useId();
  // the items on show (a `phone` item is hidden on wider screens)
  const shownItems = () => [...(wrap.current?.querySelectorAll('[role="menuitem"]') ?? [])].filter((el) => el.offsetParent !== null);
  React.useEffect(() => {
    if (!open) return;
    shownItems()[0]?.focus();
    const out = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, [open]);
  const onKey = (e) => {
    const all = shownItems();
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
            <li key={item.group || item.label} role="none" className={item.group ? "rt-rowmenu__group" : item.phone ? "rt-rowmenu__phone" : undefined}>
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
