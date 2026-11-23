"use client";

import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import Link from "next/link";
import { useProviderAccess } from "@/lib/providerAccess";
import { Loading, Tabs, getQuery, setQuery } from "./providerParts";
import { addDays, colourOf, longDay, monthLabel, offSale, todayIso, useSchedule, weekday } from "./ProviderCohorts";
import { EmptyState, ErrorState } from "@/components/states/States";

// The calendar: every session of every cohort by month, week or day (view and date kept in the address, ?view= and ?date=); the
// List / Calendar switch above it goes back to the cohort list. A session running several days is one bar from its first day to its
// last (split where a week ends), in its date's calendar colour (chosen on the date; by default classroom purple, live online blue);
// several at once stack, and a month day with more than fit says "+N more" (opens that day). Past sessions are grey, cancelled ones
// struck through. Clicking a session shows its date, time, places taken, venue and tutor, with Open cohort (its page): a card
// beside it on a computer, a pop-up on a phone. On phones the month and week become a list of the days that have sessions.

const VIEWS = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_LANES = 3; // sessions shown on a month day before "+N more"
const isIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !Number.isNaN(Date.parse(s));
const monthStart = (iso) => `${iso.slice(0, 7)}-01`;
const shiftMonth = (iso, n) => {
  const d = new Date(`${monthStart(iso)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};
const monthEnd = (iso) => addDays(shiftMonth(iso, 1), -1);
const rangeFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmt = (iso) => rangeFmt.format(new Date(`${iso}T00:00:00Z`));
const span = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const when = (b) => (b.start === b.end ? longDay(b.start) : `${longDay(b.start)} to ${longDay(b.end)}`);
// the details card's date, short and on one line: "Sat 21 Nov 2026"; a range says the month and year once:
// "Sat 21 – Sun 29 Nov 2026", "Mon 30 Nov – Wed 2 Dec 2026", "Thu 31 Dec 2026 – Sat 2 Jan 2027"
const partsFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const parts = (iso) => Object.fromEntries(partsFmt.formatToParts(new Date(`${iso}T00:00:00Z`)).map((x) => [x.type, x.value]));
const shortWhen = (b) => {
  const a = parts(b.start);
  const z = parts(b.end);
  const end = `${z.weekday} ${z.day} ${z.month} ${z.year}`;
  if (b.start === b.end) return end;
  if (a.year !== z.year) return `${a.weekday} ${a.day} ${a.month} ${a.year} – ${end}`;
  if (a.month !== z.month) return `${a.weekday} ${a.day} ${a.month} – ${end}`;
  return `${a.weekday} ${a.day} – ${end}`;
};

// every session as one bar, from its first day to its last
function sessionBars(cohorts) {
  return cohorts.flatMap((k) => k.sessions.map((s, i) => ({
    key: `${k.id}-${i}`, cohort: k, start: s.date, end: s.end && s.end > s.date ? s.end : s.date, from: s.from, to: s.to,
    colour: colourOf(k), title: k.courseTitle, where: k.venue ? k.venue.name : "Online", cancelled: Boolean(k.cancelledAt),
  })));
}
// the bars on each day (the day list and the phone views)
function barsByDay(bars) {
  const map = {};
  bars.forEach((b) => {
    for (let d = b.start; d <= b.end; d = addDays(d, 1)) (map[d] ||= []).push(b);
  });
  // cancelled sessions last, so the ones that run come first in a busy day
  Object.values(map).forEach((l) => l.sort((a, b) => a.cancelled - b.cancelled || a.from.localeCompare(b.from) || a.title.localeCompare(b.title)));
  return map;
}
const tone = (b) => `-c-${b.colour}${b.cancelled ? " -cancelled" : b.end < todayIso() ? " -past" : ""}`;
const describe = (b) => `${b.title}, ${when(b)}, ${b.from} to ${b.to}, ${b.where}${b.cancelled ? ", cancelled" : ""}`;

// clicking a session shows its details: (bar, the element clicked)
const OpenEntry = createContext(() => {});

export default function ProviderCalendar() {
  const { can } = useProviderAccess();
  const [entry, setEntry] = useState(null); // { bar, el }
  const { cohorts } = useSchedule("all", null, { near: true });
  const [view, setView] = useState("month");
  const [date, setDate] = useState(() => todayIso());

  useEffect(() => {
    const v = getQuery("view");
    if (VIEWS.some((x) => x.key === v)) setView(v);
    const d = getQuery("date");
    if (isIso(d)) setDate(d);
  }, []);

  const go = (d) => {
    setDate(d);
    setQuery("date", d === todayIso() ? "" : d);
  };
  const pickView = (v) => {
    setView(v);
    setQuery("view", v === "month" ? "" : v);
  };
  const openDay = (d) => { setEntry(null); go(d); pickView("day"); };

  if (cohorts.isError) return <ErrorState title="We couldn't load your dates." text="Check your connection, then try again." onRetry={() => cohorts.refetch()} />;
  if (!cohorts.data) return <Loading rows={1} />;
  if (!cohorts.data.length) return <EmptyState title="Nothing on the calendar yet" text="Sessions appear here once you add a cohort with dates." action={can("provider.cohorts.edit") && can("provider.pricing.edit") ? { label: "Create cohort", href: "/provider/cohorts?new=1" } : null} />;

  const bars = sessionBars(cohorts.data);
  const byDay = barsByDay(bars);
  const today = todayIso();
  const weekStart = addDays(date, -weekday(date));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  // whether the month, week or day on screen already has today in it
  const showsToday = { month: date.slice(0, 7) === today.slice(0, 7), week: weekStart <= today && today <= addDays(weekStart, 6), day: date === today }[view];
  const step = { month: (n) => shiftMonth(date, n), week: (n) => addDays(date, 7 * n), day: (n) => addDays(date, n) }[view];
  const title = {
    month: monthLabel(date),
    week: `${fmt(weekStart)} to ${fmt(addDays(weekStart, 6))}`,
    day: longDay(date),
  }[view];
  const unit = { month: "month", week: "week", day: "day" }[view];

  return (
    <OpenEntry.Provider value={(bar, el, x) => setEntry({ bar, el, x })}>
      <div className="rt-acc__stack">
        <div className="rt-adm-toolbar rt-pws-cal__bar">
          <div className="rt-pws-cal__nav-group">
            {/* back to today, first (as calendars put it); inactive while today is already shown */}
            <button type="button" className="rt-pws-cal__nav -text" onClick={() => go(today)} disabled={showsToday}>Today</button>
            <button type="button" className="rt-pws-cal__nav" onClick={() => go(step(-1))} aria-label={`Previous ${unit}`}><i className="icon-chevron-left text-12" aria-hidden="true"></i></button>
            <button type="button" className="rt-pws-cal__nav" onClick={() => go(step(1))} aria-label={`Next ${unit}`}><i className="icon-chevron-right text-12" aria-hidden="true"></i></button>
            <h2 className="rt-pws-cal__title" aria-live="polite">{title}</h2>
          </div>
          <Tabs tabs={VIEWS} value={view} onChange={pickView} label="Calendar view" />
        </div>

        {view === "month" && <MonthView date={date} today={today} bars={bars} byDay={byDay} onDay={openDay} />}
        {view === "week" && (
          <>
            <div className="rt-acc__card rt-pws-cal__grid">
              <Weekdays days={weekDays} today={today} />
              <WeekRow days={weekDays} today={today} bars={bars} lanes={Infinity} onDay={openDay} tall />
            </div>
            <div className="rt-pws-cal__phone">
              <DayList days={weekDays} today={today} byDay={byDay} emptyText="No sessions this week." />
            </div>
          </>
        )}
        {view === "day" && <DayList days={[date]} today={today} byDay={byDay} showEmpty />}
        <EntryDetails entry={entry} onClose={() => setEntry(null)} />
      </div>
    </OpenEntry.Provider>
  );
}

// the week view's day headings: "Mon 24" (today marked as in the month)
function Weekdays({ days, today }) {
  return (
    <div className="rt-pws-cal__wdays" aria-hidden="true">
      {days.map((d, i) => <span key={d} className={d === today ? "is-today" : undefined}>{WEEKDAYS[i].slice(0, 3)} <b>{Number(d.slice(8))}</b></span>)}
    </div>
  );
}

function MonthView({ date, today, bars, byDay, onDay }) {
  const first = monthStart(date);
  const last = monthEnd(date);
  const weeks = [];
  for (let d = addDays(first, -weekday(first)); d <= last; d = addDays(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  const busy = Object.keys(byDay).filter((d) => d >= first && d <= last).sort();
  return (
    <>
      <div className="rt-acc__card rt-pws-cal__grid">
        <div className="rt-pws-cal__wdays" aria-hidden="true">{WEEKDAYS.map((d) => <span key={d}>{d.slice(0, 3)}</span>)}</div>
        <div role="group" aria-label={`${monthLabel(date)} sessions`}>
          {weeks.map((w) => <WeekRow key={w[0]} days={w} today={today} bars={bars} lanes={MONTH_LANES} onDay={onDay} month={[first, last]} />)}
        </div>
      </div>
      <div className="rt-pws-cal__phone">
        <DayList days={busy} today={today} byDay={byDay} emptyText={`No sessions in ${monthLabel(date)}.`} />
      </div>
    </>
  );
}

// One week as a grid: the days (their number opens the day), and each session overlapping it as a bar across its days, stacked
// in rows (a session takes the first row free on all its days). Up to `lanes` rows show; the sessions past them are counted on
// each day they cover as "+N more".
function WeekRow({ days, today, bars, lanes, onDay, month, tall = false }) {
  const open = useContext(OpenEntry);
  const [lo, hi] = [days[0], days[6]];
  const segs = bars
    .filter((b) => b.start <= hi && b.end >= lo)
    .map((b) => {
      const s = b.start < lo ? lo : b.start;
      const e = b.end > hi ? hi : b.end;
      return { b, col: span(lo, s), len: span(s, e) + 1, before: b.start < lo, after: b.end > hi };
    })
    // cancelled sessions take the lowest rows (behind "+N more" on a full day), the ones that run the top
    .sort((x, y) => x.b.cancelled - y.b.cancelled || x.col - y.col || y.len - x.len || x.b.from.localeCompare(y.b.from) || x.b.title.localeCompare(y.b.title));
  // each session takes the first row that is free on every one of its days (whatever order they come in)
  const taken = []; // per row: the day columns it holds
  segs.forEach((g) => {
    let r = taken.findIndex((cols) => !cols.some((c) => c >= g.col && c < g.col + g.len));
    if (r === -1) r = taken.push([]) - 1;
    for (let c = g.col; c < g.col + g.len; c++) taken[r].push(c);
    g.row = r;
  });
  const shownRows = Math.min(taken.length, lanes);
  const hidden = days.map((_, i) => segs.filter((g) => g.row >= lanes && g.col <= i && g.col + g.len - 1 >= i).length);
  const anyHidden = hidden.some(Boolean);
  const rows = `${tall ? "0px" : "36px"}${shownRows ? ` repeat(${shownRows}, 26px)` : ""}${anyHidden ? " 24px" : ""} 1fr`;
  return (
    <div className={`rt-pws-cal__wk${tall ? " -tall" : ""}`} style={{ gridTemplateRows: rows }}>
      {days.map((d, i) => {
        const out = month && (d < month[0] || d > month[1]);
        const count = (segs.filter((g) => g.col <= i && g.col + g.len - 1 >= i)).length;
        return (
          <div key={d} className={`rt-pws-cal__day${out ? " -out" : ""}${d === today ? " is-today" : ""}`} style={{ gridColumn: i + 1 }}>
            {!tall && (
              <button type="button" className="rt-pws-cal__daynum" onClick={() => onDay(d)} aria-label={`${longDay(d)}${d === today ? ", today" : ""}, ${count ? `${count} ${count === 1 ? "session" : "sessions"}` : "no sessions"}. Open the day`}>{Number(d.slice(8))}</button>
            )}
            {tall && d === today && <span className="rt-sr">Today</span>}
          </div>
        );
      })}
      {segs.filter((g) => g.row < lanes).map((g) => (
        <button key={`${g.b.key}-${lo}`} type="button" aria-haspopup="dialog" onClick={(e) => open(g.b, e.currentTarget, e.clientX || null)} title={describe(g.b)}
          className={`rt-pws-cal__seg ${tone(g.b)}${g.before ? " -before" : ""}${g.after ? " -after" : ""}`}
          style={{ gridColumn: `${g.col + 1} / span ${g.len}`, gridRow: g.row + 2 }}>
          <span aria-hidden="true"><b>{g.b.from}</b> {g.b.title} · {g.b.where}{g.b.cancelled ? " · Cancelled" : ""}</span>
          <span className="rt-sr">{describe(g.b)}</span>
        </button>
      ))}
      {anyHidden && hidden.map((n, i) => n > 0 && (
        <button key={`more-${days[i]}`} type="button" className="rt-pws-cal__more" style={{ gridColumn: i + 1, gridRow: shownRows + 2 }} onClick={() => onDay(days[i])}>
          +{n} more<span className="rt-sr"> on {longDay(days[i])}</span>
        </button>
      ))}
    </div>
  );
}

// one session's details: the date, time, places taken, venue and tutor, and Open cohort (its page). A card beside the session on
// a computer (it closes on a click outside, Esc, scrolling or resizing, and focus goes back to the session); a pop-up on a phone.
function EntryDetails({ entry, onClose }) {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    if (entry) setPhone(window.matchMedia("(max-width: 767px)").matches);
  }, [entry]);
  if (!entry) return null;
  const b = entry.bar;
  const k = b.cohort;
  const facts = (
    <>
      <dl className="rt-pws-cal__facts">
        <div><dt>Date</dt><dd>{shortWhen(b)}{b.cancelled ? " · Cancelled" : offSale(k) ? ` · ${offSale(k)}` : ""}</dd></div>
        <div><dt>Time</dt><dd>{b.from} to {b.to}</dd></div>
        <div><dt>Places taken</dt><dd>{k.taken} of {k.capacity}</dd></div>
        <div><dt>Venue</dt><dd>{k.venue ? [k.venue.name, k.venue.city].filter(Boolean).join(", ") : "Live online"}</dd></div>
        <div><dt>Tutor</dt><dd>{k.tutorName || "Not assigned"}</dd></div>
      </dl>
      <Link href={`/provider/cohorts/${k.id}`} className="button -md -purple-1 text-white rt-btn-block">Open cohort</Link>
    </>
  );
  if (phone) return <Sheet open onClose={onClose} title={b.title} closeLabel="Close"><div className="rt-acc__stack">{facts}</div></Sheet>;
  return <EntryCard entry={entry} onClose={onClose}>{facts}</EntryCard>;
}

function EntryCard({ entry, onClose, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const id = `rt-cal-pop-${entry.bar.key}`;
  // placed beside the session (right, else left), kept on screen; measured before it is painted. A long bar (several days)
  // places it by where it was clicked, so it opens next to the pointer rather than at the bar's far end.
  useLayoutEffect(() => {
    const box = entry.el.getBoundingClientRect();
    const r = entry.x && box.width > 240 ? { left: entry.x, right: entry.x, top: box.top } : box;
    const w = ref.current.offsetWidth;
    const h = ref.current.offsetHeight;
    let left = r.right + 8;
    if (left + w > window.innerWidth - 12) left = r.left - w - 8;
    if (left < 12) left = Math.min(Math.max(12, r.left), window.innerWidth - w - 12);
    const top = Math.max(12, Math.min(r.top, window.innerHeight - h - 12));
    setPos({ left, top });
  }, [entry]);
  useEffect(() => {
    ref.current?.focus();
    const back = () => entry.el?.isConnected && entry.el.focus();
    const out = (e) => { if (ref.current && !ref.current.contains(e.target) && !entry.el.contains(e.target)) onClose(); };
    const key = (e) => { if (e.key === "Escape") { e.preventDefault(); onClose(); back(); } };
    const away = () => onClose();
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", away);
    window.addEventListener("scroll", away, true);
    return () => {
      document.removeEventListener("pointerdown", out);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", away);
      window.removeEventListener("scroll", away, true);
    };
  }, [entry, onClose]);
  return (
    <div ref={ref} className="rt-pws-cal__pop" role="dialog" aria-labelledby={id} tabIndex={-1} style={pos ? { left: pos.left, top: pos.top } : { visibility: "hidden" }}>
      <div className="rt-pws-cal__pophead">
        <h3 id={id}>{entry.bar.title}</h3>
        <button type="button" className="rt-pws-cal__popclose" onClick={() => { onClose(); entry.el?.focus(); }} aria-label="Close"><i className="icon-close text-12" aria-hidden="true"></i></button>
      </div>
      {children}
    </div>
  );
}

function DayList({ days, today, byDay, showEmpty = false, emptyText = "" }) {
  const open = useContext(OpenEntry);
  const withSessions = days.filter((d) => byDay[d]);
  if (!withSessions.length && !showEmpty) return <EmptyState title={emptyText} />;
  const shown = showEmpty ? days : withSessions;
  return (
    <div className="rt-acc__stack rt-pws-cal__list">
      {shown.map((d) => {
        const list = byDay[d] || [];
        return (
          <section key={d} className="rt-acc__card rt-pws-cal__listday" aria-labelledby={`rt-cal-${d}`}>
            <h3 className="rt-pws-cal__listh" id={`rt-cal-${d}`}>{longDay(d)}{d === today && <span className="rt-pws-cal__today">Today</span>}</h3>
            {list.length ? (
              <ul className="rt-pws-cal__rows">
                {list.map((b) => (
                  <li key={b.key} className={b.cancelled ? "-cancelled" : undefined}>
                    <span className="rt-pws-cal__time">{b.from} to {b.to}</span>
                    <span className="rt-pws-cal__what">
                      <button type="button" className="rt-pws-cal__rowbtn rt-adm-strong" aria-haspopup="dialog" onClick={(e) => open(b, e.currentTarget)}>{b.title}</button>
                      <small>{b.where} · {b.cohort.taken} of {b.cohort.capacity} places taken{b.cancelled ? " · Cancelled" : ""}</small>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState inCard title="No sessions on this day." />
            )}
          </section>
        );
      })}
    </div>
  );
}
