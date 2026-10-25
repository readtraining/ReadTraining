"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBooking } from "./BookingProvider";
import { formatDateRange, formatPrice } from "@/lib/format";
import { Icon } from "./Icon";
import CatalogueDropdown from "@/components/courses/CatalogueDropdown";
import FilterScrollPill from "@/components/courses/FilterScrollPill";
import { modeLabel } from "@/lib/courseModes";
import { EmptyState } from "@/components/states/States";

const SORTS = { classroom: [["cheapest", "Cheapest"], ["soonest", "Soonest"], ["name", "Name (A to Z)"]], online: [["cheapest", "Cheapest"], ["soonest", "Soonest"]] };
const DEFAULT_SORT = "cheapest";

const CalendarIcon = () => <Icon name="calendar" />;
const PinIcon = () => <Icon name="location" />;
const CloseIcon = () => <Icon name="close" />;
const Chevron = () => <Icon name="chevron-down" />;

// Self-paced has no date: it starts whenever the learner likes.
const whenLabel = (s) => (s.mode === "ondemand" ? s.time : formatDateRange(s.date, s.endDate));
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
        <strong>{whenLabel(s)}</strong>
        <span>{s.mode === "ondemand" ? `Online, provided by ${s.provider}` : `${s.time}, provided by ${s.provider}`}</span>
      </div>
      <div className="rt-dd__date-price">{formatPrice(s.price)}</div>
      <button type="button" className={selected ? "button -sm -purple-1 text-white" : "button -sm -outline-purple-1 text-purple-1"} aria-pressed={selected} onClick={() => onSelect(s.id)}>
        {selected ? "Selected" : "Select"}
        <span className="rt-cd__sr">{` ${whenLabel(s)}${classroom ? `, ${s.address}` : ""}`}</span>
      </button>
    </li>
  );
}

// The pop-up body. It is mounted only while the pop-up is open (and again for each study method), so its state starts from what
// was remembered (sessionStorage). Without `confirm` a choice is applied at once (course page, basket); with it a choice is only
// marked, and the footer shows it with the confirm button (the catalogue card's "Add to basket").
function Panel({ course, mode, modes, onMode, selectedId, onPick, confirm, onClose, isDesktop }) {
  const listRef = useRef(null);
  const [chosen, setChosen] = useState(null); // nothing chosen until the visitor picks a date (no default date in the footer)
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
  const [open, setOpen] = useState([]); // every venue starts closed: no preselected date is shown when the pop-up opens

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
  const pick = useCallback((id) => (confirm ? setChosen(id) : onPick(id)), [confirm, onPick]);
  const current = confirm ? chosen : selectedId;
  const chosenSession = course.sessions.find((s) => s.id === chosen);

  const count = classroom ? `${list.length} ${list.length === 1 ? "venue" : "venues"}` : `${list.length} ${list.length === 1 ? "date" : "dates"}`;

  return (
    <>
      <div className="rt-dd__head">
        <span className="rt-dd__mode">{classroom ? <PinIcon /> : <CalendarIcon />}</span>
        <h2 id="rt-dd-title" className="rt-dd__title" tabIndex={-1} data-initial={isDesktop ? undefined : ""}>{modes ? course.title : modeLabel(mode)}</h2>
        <button type="button" className="rt-icon-btn rt-dd__close" aria-label="Close" onClick={onClose}><CloseIcon /></button>
      </div>

      {modes && modes.length > 1 && (
        <div className="rt-dd__modes" role="group" aria-label="How you want to study">
          {modes.map((m) => (
            <button key={m} type="button" className={`rt-tr__filter${m === mode ? " is-on" : ""}`} aria-pressed={m === mode} onClick={() => onMode(m)}>{modeLabel(m)}</button>
          ))}
        </div>
      )}

      <div className="rt-dd__filters">
        <div className="rt-dd__controls">
          {classroom && (
            <label className="rt-field rt-dd__search">
              <PinIcon />
              <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Address or postcode" aria-label="Address or postcode" data-initial={isDesktop ? "" : undefined} autoComplete="off" />
            </label>
          )}
          {/* the catalogue's own dropdown (as its "Sort by"), not the browser's native list */}
          <div className="rt-dd__sort">
            <CatalogueDropdown label="Sort by" options={sorts.map(([v, l]) => ({ value: v, label: l }))} value={sort} onChange={setSort} clearable={false} />
          </div>
        </div>
        <div className="rt-dd__meta">
          <span aria-live="polite">{count}</span>
          {filtered && <button type="button" className="rt-cd__link" onClick={clear}>Clear filter</button>}
        </div>
      </div>

      <div className="rt-dd__list rt-pill-scroll" ref={listRef}>
        {list.length === 0 ? (
          <EmptyState inCard title="No venues match." text="Try another town or postcode." />
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
                <button type="button" className="button -sm -outline-purple-1 text-purple-1 rt-dd__show" aria-expanded={on} aria-controls={id} onClick={() => toggle(v.key)}>
                  Show dates ({v.sessions.length}) <Chevron />
                </button>
                <ul className="rt-dd__dates" id={id} hidden={!on}>
                  {v.sessions.map((s) => <DateRow key={s.id} s={s} selected={current === s.id} onSelect={pick} classroom />)}
                </ul>
              </section>
            );
          })
        ) : (
          <ul className="rt-dd__dates rt-dd__dates--flat">
            {list.map((s) => <DateRow key={s.id} s={s} selected={current === s.id} onSelect={pick} />)}
          </ul>
        )}
      </div>
      <FilterScrollPill scrollRef={listRef} />

      {confirm && (
        <div className="rt-dd__foot">
          <p className="rt-dd__chosen" aria-live="polite">
            {chosenSession ? (
              <>
                <strong>{whenLabel(chosenSession)}</strong>
                <span>{[chosenSession.location, formatPrice(chosenSession.price)].join(" · ")}</span>
              </>
            ) : (
              <span>Choose a date</span>
            )}
          </p>
          <button type="button" className="button -md -purple-1 text-white" disabled={!chosenSession} onClick={() => confirm.onConfirm(chosen)}>{confirm.label}</button>
        </div>
      )}
    </>
  );
}

// The "choose a date" pop-up. Desktop: centred dialog. 575px and under: full-screen sheet. `modes` + `onMode` add the study methods
// as chips (catalogue card, basket); `confirm` { label, onConfirm(sessionId) } adds the footer. Focus goes back to the opener.
export function DatesPicker({ open: datesOpen, onClose: closeDates, course, mode, modes, onMode, selectedId, onPick, confirm }) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 576px)").matches;
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // mount, then fade/slide in on the next frame; fade out, then unmount
  useEffect(() => {
    if (datesOpen) {
      openerRef.current = document.activeElement;
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    if (openerRef.current?.isConnected) setTimeout(() => openerRef.current?.isConnected && openerRef.current.focus?.({ preventScroll: true }), 0);
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

  if (!mounted || !course) return null;
  return createPortal(
    <div className={`rt-dd${shown ? " is-in" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && isDesktop && closeDates()}>
      <div className="rt-dd__panel" role="dialog" aria-modal="true" aria-labelledby="rt-dd-title" ref={panelRef}>
        <Panel key={mode} course={course} mode={mode} modes={modes} onMode={onMode} selectedId={selectedId} onPick={onPick} confirm={confirm} onClose={() => closeDates()} isDesktop={isDesktop} />
      </div>
    </div>,
    document.body,
  );
}

// The course page's pop-up for Classroom and Live online, on the page's booking state (choosing applies the date and closes).
export default function DatesDialog() {
  const { course, mode, session, selectSession, datesOpen, closeDates } = useBooking();
  const pick = useCallback(
    (id) => {
      selectSession(id);
      setTimeout(() => closeDates({ afterSelect: true }), 150);
    },
    [selectSession, closeDates],
  );
  if (mode === "ondemand" || mode === "inhouse") return null;
  if (!session) return null;
  return <DatesPicker open={datesOpen} onClose={closeDates} course={course} mode={mode} selectedId={session.id} onPick={pick} />;
}
