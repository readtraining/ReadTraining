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

const PinIcon = () => <Icon name="location" />;
const CloseIcon = () => <Icon name="close" />;
const Chevron = () => <Icon name="chevron-down" />;

// Self-paced has no date: it starts whenever the learner likes.
const whenLabel = (s) => (s.mode === "ondemand" ? s.time : formatDateRange(s.date, s.endDate));
const norm = (v) => String(v || "").toLowerCase().replace(/\s+/g, "");
const storeKey = (course, mode) => `rt-dates:${course.id}:${mode}`;
const readStore = (key) => {
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};

const tile = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  const f = (o) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(d);
  return { month: f({ month: "short" }), day: f({ day: "numeric" }), weekday: f({ weekday: "short" }) };
};

// One date: the whole row picks it (a calendar tile, the dates, how long and when, the price, and a tick once chosen).
function DateRow({ s, selected, onSelect, classroom }) {
  const t = s.mode === "ondemand" ? null : tile(s.date);
  const was = s.wasPrice > s.price ? s.wasPrice : null;
  const meta = [s.days ? `${s.days} ${s.days === 1 ? "day" : "days"}` : "", s.mode === "ondemand" ? "Online" : s.time, !classroom && s.mode === "online" ? "Live online" : ""].filter(Boolean).join(" · ");
  return (
    <li>
      <button type="button" className={`rt-dd__slot${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={() => onSelect(s.id)}>
        {t && (
          <span className="rt-dd__tile" aria-hidden="true">
            <span className="rt-dd__tile-m">{t.month}</span>
            <span className="rt-dd__tile-d">{t.day}</span>
            <span className="rt-dd__tile-w">{t.weekday}</span>
          </span>
        )}
        <span className="rt-dd__slot-main">
          <strong>{whenLabel(s)}</strong>
          {meta && <span>{meta}</span>}
        </span>
        <span className="rt-dd__slot-price">
          <strong>{formatPrice(s.price)}</strong>
          {was && <s><span className="rt-cd__sr">was </span>{formatPrice(was)}</s>}
        </span>
        <span className="rt-dd__tick" aria-hidden="true">{selected && <Icon name="check" />}</span>
        <span className="rt-cd__sr">{selected ? ", selected" : ""}{classroom ? `, ${s.address}` : ""}</span>
      </button>
    </li>
  );
}

// A venue: its name, address and map link, its lowest price, and a "Show dates" button that opens its dates below (a click
// anywhere on the venue's header does the same; the map link only opens the map).
function VenueCard({ v, current, onSelect, open, onToggle }) {
  const has = v.sessions.some((s) => s.id === current);
  const id = `rt-dd-v-${v.key.replace(/\W+/g, "-")}`;
  const onHead = (e) => {
    if (!e.target.closest("a, button")) onToggle();
  };
  return (
    <section className={`rt-dd__vcard${has ? " is-selected" : ""}${open ? " is-open" : ""}`} aria-labelledby={id}>
      <div className="rt-dd__vhead" onClick={onHead}>
        <span className="rt-dd__vpin" aria-hidden="true"><PinIcon /></span>
        <div className="rt-dd__vinfo">
          <h3 id={id}>{v.venue || v.city}</h3>
          <p className="rt-dd__addr">
            {[v.street, v.city, v.postcode].filter(Boolean).join(", ")} ·{" "}
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([v.name, v.postcode].filter(Boolean).join(", "))}`} target="_blank" rel="noopener">Map<span className="rt-cd__sr"> (opens in a new tab)</span></a>
          </p>
        </div>
        <div className="rt-dd__vside">
          {v.sessions.length > 1 && (
            <p className="rt-dd__vfrom">
              <span>{v.sessions.length} dates from</span>
              <strong>{formatPrice(v.from)}</strong>
            </p>
          )}
          <button type="button" className="rt-dd__vtoggle" aria-expanded={open} aria-controls={`${id}-dates`} onClick={onToggle}>
            {open ? "Hide dates" : `Show dates (${v.sessions.length})`} <Chevron />
          </button>
        </div>
      </div>
      <ul className="rt-dd__slots" id={`${id}-dates`} hidden={!open} aria-label={`Dates at ${v.venue || v.city}`}>
        {v.sessions.map((s) => <DateRow key={s.id} s={s} selected={current === s.id} onSelect={onSelect} classroom />)}
      </ul>
    </section>
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
      if (!map.has(k)) map.set(k, { key: k, name: s.address, venue: s.venue, street: s.venue && s.address.startsWith(`${s.venue}, `) ? s.address.slice(s.venue.length + 2) : s.address === s.venue ? "" : s.address, city: s.city, postcode: s.postcode, sessions: [] });
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
  // venues showing their dates: the one holding the chosen date starts open, the rest open on "Show dates"
  const [open, setOpen] = useState(() => {
    const s = course.sessions.find((x) => x.id === selectedId && x.mode === mode);
    return s ? [`${s.address}|${s.postcode}`] : [];
  });

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

  const dates = classroom ? list.reduce((n, v) => n + v.sessions.length, 0) : list.length;
  const count = [classroom ? `${list.length} ${list.length === 1 ? "venue" : "venues"}` : "", `${dates} ${dates === 1 ? "date" : "dates"}`].filter(Boolean).join(" · ");

  return (
    <>
      <div className="rt-dd__head">
        <div className="rt-dd__heading">
          <h2 id="rt-dd-title" className="rt-dd__title" tabIndex={-1} data-initial={isDesktop ? undefined : ""}>Choose a date</h2>
          <p className="rt-dd__sub">{modes ? course.title : `${course.title} · ${modeLabel(mode)}`}</p>
        </div>
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
          <div className="rt-dd__venues">
            {list.map((v) => <VenueCard key={v.key} v={v} current={current} onSelect={pick} open={open.includes(v.key)} onToggle={() => toggle(v.key)} />)}
          </div>
        ) : (
          <ul className="rt-dd__slots rt-dd__slots--flat">
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
// When the course runs both, the pop-up's own tabs switch between their dates; the page follows only once a date is chosen.
export default function DatesDialog() {
  const { course, mode, session, selectSession, datesOpen, closeDates } = useBooking();
  const dated = useMemo(() => ["classroom", "online"].filter((m) => course.sessions.some((s) => s.mode === m)), [course]);
  const [view, setView] = useState(mode);
  useEffect(() => {
    if (datesOpen) setView(mode); // every opening starts on the page's study method
  }, [datesOpen, mode]);
  const pick = useCallback(
    (id) => {
      selectSession(id);
      setTimeout(() => closeDates({ afterSelect: true }), 150);
    },
    [selectSession, closeDates],
  );
  if (mode === "ondemand" || mode === "inhouse") return null;
  if (!session) return null;
  const shown = dated.includes(view) ? view : mode;
  return <DatesPicker open={datesOpen} onClose={closeDates} course={course} mode={shown} modes={dated.length > 1 ? dated : undefined} onMode={setView} selectedId={session.id} onPick={pick} />;
}
