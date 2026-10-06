"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MODE_LABEL, useBooking } from "./BookingProvider";
import { formatDateRange, formatPrice } from "@/lib/courses";

const SORTS = { classroom: [["cheapest", "Cheapest"], ["soonest", "Soonest"], ["name", "Name (A to Z)"]], online: [["cheapest", "Cheapest"], ["soonest", "Soonest"]] };
const DEFAULT_SORT = "cheapest";

const svg = (children, size = 20) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const CalendarIcon = ({ size }) => svg(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>, size);
const PinIcon = ({ size }) => svg(<><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>, size);
const CloseIcon = () => svg(<path d="M6 6l12 12M18 6L6 18" />, 20);
const Chevron = () => svg(<path d="M6 9l6 6 6-6" />, 16);

const dayLabel = (iso) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const norm = (v) => String(v || "").toLowerCase().replace(/\s+/g, "");
const storeKey = (course, mode) => `rt-dates:${course.id}:${mode}`;
const readStore = (key) => {
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};

function DateRow({ s, selected, onSelect, classroom }) {
  return (
    <li className={`rt-dd__date${selected ? " is-selected" : ""}`}>
      <div className="rt-dd__date-main">
        <strong>{formatDateRange(s.date, s.endDate)}</strong>
        <span>{s.time}, provided by {s.provider}</span>
      </div>
      <div className="rt-dd__date-price">{formatPrice(s.price)}</div>
      <button type="button" className={`rt-dd__select${selected ? " is-on" : ""}`} aria-pressed={selected} onClick={() => onSelect(s.id)}>
        {selected ? "Selected" : "Select"}
        <span className="rt-cd__sr">{` ${formatDateRange(s.date, s.endDate)}${classroom ? `, ${s.address}` : ""}`}</span>
      </button>
    </li>
  );
}

// The pop-up body. It is mounted only while the pop-up is open, so its state starts from what was remembered (sessionStorage).
function Panel({ onClose, isDesktop }) {
  const { course, mode, session, selectSession, closeDates } = useBooking();
  const classroom = mode === "classroom";
  const key = storeKey(course, mode);
  const sorts = SORTS[classroom ? "classroom" : "online"];

  const all = useMemo(() => course.sessions.filter((s) => s.mode === mode), [course, mode]);
  const venues = useMemo(() => {
    if (!classroom) return [];
    const map = new Map();
    all.forEach((s) => {
      const k = `${s.address}|${s.postcode}`;
      if (!map.has(k)) map.set(k, { key: k, name: s.address, city: s.city, postcode: s.postcode, sessions: [] });
      map.get(k).sessions.push(s);
    });
    return [...map.values()].map((v) => {
      const sessions = [...v.sessions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      return { ...v, sessions, from: Math.min(...sessions.map((x) => x.price)), next: sessions[0].date };
    });
  }, [all, classroom]);

  const saved = useMemo(() => readStore(key), [key]);
  const [input, setInput] = useState(saved?.q || "");
  const [q, setQ] = useState(saved?.q || "");
  const [sort, setSort] = useState(sorts.some(([v]) => v === saved?.sort) ? saved.sort : DEFAULT_SORT);
  const [open, setOpen] = useState(() => saved?.open || venues.filter((v) => v.sessions.some((s) => s.id === session.id)).map((v) => v.key));

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 150);
    return () => clearTimeout(t);
  }, [input]);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify({ q, sort, open }));
    } catch {}
  }, [key, q, sort, open]);

  const list = useMemo(() => {
    if (!classroom) {
      const rows = [...all];
      rows.sort((a, b) => (sort === "soonest" ? (a.date < b.date ? -1 : 1) : a.price - b.price || (a.date < b.date ? -1 : 1)));
      return rows;
    }
    const needle = norm(q);
    const rows = venues.filter((v) => !needle || [v.name, v.city, v.name + v.city, v.postcode].some((f) => norm(f).includes(needle)));
    rows.sort((a, b) => (sort === "soonest" ? (a.next < b.next ? -1 : 1) : sort === "name" ? a.name.localeCompare(b.name) : a.from - b.from || (a.next < b.next ? -1 : 1)));
    return rows;
  }, [all, venues, classroom, q, sort]);

  const filtered = q !== "" || sort !== DEFAULT_SORT;
  const clear = () => {
    setInput("");
    setQ("");
    setSort(DEFAULT_SORT);
  };
  const toggle = (k) => setOpen((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));
  const pick = useCallback(
    (id) => {
      selectSession(id);
      setTimeout(() => closeDates({ afterSelect: true }), 150);
    },
    [selectSession, closeDates],
  );

  const count = classroom ? `${list.length} ${list.length === 1 ? "venue" : "venues"}` : `${list.length} ${list.length === 1 ? "date" : "dates"}`;

  return (
    <>
      <div className="rt-dd__head">
        <span className="rt-dd__mode">{classroom ? <PinIcon /> : <CalendarIcon />}</span>
        <h2 id="rt-dd-title" className="rt-dd__title" tabIndex={-1} data-initial={isDesktop ? undefined : ""}>{MODE_LABEL[mode]}</h2>
        <button type="button" className="rt-dd__close" aria-label="Close" onClick={onClose}><CloseIcon /></button>
      </div>

      <div className="rt-dd__filters">
        <div className="rt-dd__controls">
          {classroom && (
            <label className="rt-dd__search">
              <PinIcon size={16} />
              <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Address or postcode" aria-label="Address or postcode" data-initial={isDesktop ? "" : undefined} autoComplete="off" />
            </label>
          )}
          <label className="rt-dd__sort">
            <span className="rt-cd__sr">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} data-initial={!classroom && isDesktop ? "" : undefined}>
              {sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
        <div className="rt-dd__meta">
          <span aria-live="polite">{count}</span>
          {filtered && <button type="button" className="rt-cd__link" onClick={clear}>Clear filter</button>}
        </div>
      </div>

      <div className="rt-dd__list">
        {list.length === 0 ? (
          <p className="rt-dd__empty">No venues match. Try another town or postcode.</p>
        ) : classroom ? (
          list.map((v) => {
            const on = open.includes(v.key);
            const id = `rt-dd-v-${v.key.replace(/\W+/g, "-")}`;
            return (
              <section key={v.key} className="rt-dd__venue">
                <div className="rt-dd__venue-info">
                  <h3>{v.name}</h3>
                  <p className="rt-dd__addr">{v.city}, {v.postcode} · <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.postcode)}`} target="_blank" rel="noopener">View map</a></p>
                  <p className="rt-dd__next">Next course: <strong>{dayLabel(v.next)}</strong></p>
                  <p className="rt-dd__from"><strong>From {formatPrice(v.from)}</strong> <span>All inc</span></p>
                </div>
                <button type="button" className="rt-dd__show" aria-expanded={on} aria-controls={id} onClick={() => toggle(v.key)}>
                  Show dates ({v.sessions.length}) <Chevron />
                </button>
                <ul className="rt-dd__dates" id={id} hidden={!on}>
                  {v.sessions.map((s) => <DateRow key={s.id} s={s} selected={session.id === s.id} onSelect={pick} classroom />)}
                </ul>
              </section>
            );
          })
        ) : (
          <ul className="rt-dd__dates rt-dd__dates--flat">
            {list.map((s) => <DateRow key={s.id} s={s} selected={session.id === s.id} onSelect={pick} />)}
          </ul>
        )}
      </div>
    </>
  );
}

// The "choose a date" pop-up for Classroom and Live online. Desktop: centred dialog. 640px and under: full-screen sheet.
export default function DatesDialog() {
  const { datesOpen, closeDates, mode } = useBooking();
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const panelRef = useRef(null);
  const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 641px)").matches;
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // mount, then fade/slide in on the next frame; fade out, then unmount
  useEffect(() => {
    if (datesOpen) {
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), reduced() ? 0 : 260);
    return () => clearTimeout(t);
  }, [datesOpen]);

  // lock page scroll without moving the page (the scrollbar width is added back as padding)
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    const body = document.body;
    const sbw = window.innerWidth - html.clientWidth;
    const prev = { o: html.style.overflow, p: body.style.paddingRight };
    html.style.overflow = "hidden";
    if (sbw > 0) body.style.paddingRight = `${sbw}px`;
    html.style.setProperty("--rt-sbw", `${sbw}px`);
    return () => {
      html.style.overflow = prev.o;
      body.style.paddingRight = prev.p;
      html.style.removeProperty("--rt-sbw");
    };
  }, [mounted]);

  // initial focus, Esc, and a Tab trap
  useEffect(() => {
    if (!datesOpen || !mounted) return;
    const panel = panelRef.current;
    if (!panel) return;
    const t = setTimeout(() => (panel.querySelector("[data-initial]") || panel.querySelector("h2"))?.focus({ preventScroll: true }), 30);
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDates();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...panel.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [datesOpen, mounted, closeDates]);

  if (!mounted || mode === "ondemand" || mode === "inhouse") return null;
  return createPortal(
    <div className={`rt-dd${shown ? " is-in" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && isDesktop && closeDates()}>
      <div className="rt-dd__panel" role="dialog" aria-modal="true" aria-labelledby="rt-dd-title" ref={panelRef}>
        <Panel onClose={() => closeDates()} isDesktop={isDesktop} />
      </div>
    </div>,
    document.body,
  );
}
