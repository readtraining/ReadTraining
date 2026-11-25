"use client";

import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import Link from "next/link";
import { useProviderAccess } from "@/lib/providerAccess";
import { Loading, Tabs, ToolSelect, getQuery, setQuery } from "./providerParts";
import { NavIcon } from "@/components/header/navIcons";
import { addDays, colourOf, isPicked, longDay, monthLabel, todayIso, useSchedule, weekday, whyNotOnSale } from "./ProviderCohorts";
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
const MONTH_LANES = 3; // sessions shown on a month day at most (fewer when the window is too short for three), then "+N more"
// A week row's parts, in px (the grid template WeekRow builds): the date line, one session bar (18px) with the gap above it, the
// "+N more" line and the row's bottom space. The month and week views fit the window: their rows share the height from the top of
// the rows to the window's bottom, so the page doesn't scroll, and each day shows as many sessions as fit (the rest "+N more").
// A month row too short for one session and "+N more" (a laptop showing six weeks) shows each day's date with "N sessions" beside
// it instead (it opens the day); it never goes below that line (COMPACT_ROW).
const ROW = { date: 26, bar: 20, more: 18, foot: 4, tallTop: 9 };
const minRow = (tall) => (tall ? ROW.tallTop : ROW.date) + ROW.bar + ROW.more + ROW.foot;
const COMPACT_ROW = 42;
// how many sessions a row of height `h` shows when `needed` rows of them overlap: all of them when they fit (and are no more than
// `cap`), otherwise as many as fit beside the "+N more" line, at least one and at most `cap`
const lanesFor = (h, needed, tall, cap = Infinity) => {
  const room = h - (tall ? ROW.tallTop : ROW.date) - ROW.foot;
  if (needed <= cap && needed * ROW.bar <= room) return needed;
  return Math.max(1, Math.min(cap, Math.floor((room - ROW.more) / ROW.bar)));
};
// the height each of `count` rows gets so the grid ends at the bottom of the window (null on phones, where the views are lists),
// measured from the rows' top less the page's bottom space, again when the window changes size
function useRowHeight(ref, count, tall) {
  const [height, setHeight] = useState(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el || window.matchMedia("(max-width: 767px)").matches) return setHeight(null);
      const main = el.closest(".rt-adm__main");
      const bottom = (main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0) + 2; // the page's bottom space and the card's border
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(tall ? minRow(true) : COMPACT_ROW, Math.floor((window.innerHeight - top - bottom) / count)));
    };
    measure();
    window.addEventListener("resize", measure);
    // and when the calendar's bar or filters change height (a filter's words wrapping onto a second line)
    const ro = new ResizeObserver(measure);
    const head = ref.current?.closest(".rt-pws-cal");
    if (head) [...head.children].filter((c) => c.matches(".rt-pws-cal__head, .rt-pws-cal__filters")).forEach((c) => ro.observe(c));
    return () => { window.removeEventListener("resize", measure); ro.disconnect(); };
  }, [ref, count, tall]);
  return height;
}
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
    colour: colourOf(k), title: k.courseTitle, where: k.venue ? k.venue.name : "Online", place: k.venue ? k.venue.city || k.venue.name : "Online", cancelled: Boolean(k.cancelledAt),
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
const tone = (b) => `${isPicked(b.colour) ? "" : `-c-${b.colour}`}${b.cancelled ? " -cancelled" : b.end < todayIso() ? " -past" : ""}`;
// a picked colour (#rrggbb) is set on the entry itself; a past or cancelled one keeps its grey
const toneStyle = (b) => (isPicked(b.colour) && !b.cancelled && b.end >= todayIso() ? { "--rt-coh": b.colour } : {});
const describe = (b) => `${b.title}, ${when(b)}, ${b.from} to ${b.to}, ${b.where}${b.cancelled ? ", cancelled" : ""}`;

// clicking a session shows its details: (bar, the element clicked)
const OpenEntry = createContext(() => {});

export default function ProviderCalendar() {
  const { can } = useProviderAccess();
  const [entry, setEntry] = useState(null); // { bar, el }
  const { cohorts, may } = useSchedule("all", null, { near: true });
  const [view, setView] = useState("month");
  const [date, setDate] = useState(() => todayIso());
  // the filters (a course, a venue or online, a tutor or none), kept in the address as on the cohort list
  const [filter, setFilter] = useState({ course: "", venue: "", tutor: "" });
  // nothing is drawn until the address has been read (the view, the day, the filters), so coming back to the page never shows
  // everything for a moment before its filters apply
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = getQuery("view");
    if (VIEWS.some((x) => x.key === v)) setView(v);
    const d = getQuery("date");
    if (isIso(d)) setDate(d);
    setFilter({ course: getQuery("course") || "", venue: getQuery("venue") || "", tutor: getQuery("tutor") || "" });
    setReady(true);
  }, []);
  const pickFilter = (key, value) => {
    setEntry(null);
    setFilter((f) => ({ ...f, [key]: value }));
    setQuery(key, value);
  };
  const clearFilters = () => {
    setEntry(null);
    setFilter({ course: "", venue: "", tutor: "" });
    ["course", "venue", "tutor"].forEach((k) => setQuery(k, ""));
  };

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
  if (!cohorts.data || !ready) return <Loading rows={1} />;
  if (!cohorts.data.length) return <EmptyState title="Nothing on the calendar yet" text="Sessions appear here once you add a cohort with dates." action={can("provider.cohorts.edit") && can("provider.pricing.edit") ? { label: "Create cohort", href: "/provider/cohorts?new=1" } : null} />;

  // each filter offers only what is on the calendar (so no choice ever shows an empty calendar by itself), A to Z
  const byName = (a, b) => a.label.localeCompare(b.label);
  const uniq = (list) => [...new Map(list.map((o) => [o.value, o])).values()].sort(byName);
  const courseOptions = uniq(cohorts.data.map((k) => ({ value: String(k.courseId), label: k.courseTitle })));
  const venueOptions = uniq(cohorts.data.filter((k) => k.venueId).map((k) => ({ value: k.venueId, label: k.venue ? `${k.venue.name}, ${k.venue.city}` : "Venue" })));
  const hasOnline = cohorts.data.some((k) => !k.venueId);
  const tutorOptions = uniq(cohorts.data.filter((k) => k.tutorUserId).map((k) => ({ value: k.tutorUserId, label: k.tutorName || "Team member" })));
  const hasNoTutor = cohorts.data.some((k) => !k.tutorUserId);
  // a tutor sees only their own dates, so the tutor filter is for those who see everyone's
  const tutorFilter = may.team;
  const shown = cohorts.data.filter(
    (k) =>
      (!filter.course || String(k.courseId) === filter.course) &&
      (!filter.venue || (filter.venue === "online" ? !k.venueId : k.venueId === filter.venue)) &&
      (!tutorFilter || !filter.tutor || (filter.tutor === "none" ? !k.tutorUserId : k.tutorUserId === filter.tutor)),
  );
  const filtered = Boolean(filter.course || filter.venue || (tutorFilter && filter.tutor));
  const bars = sessionBars(shown);
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
  const [from, to] = { month: [monthStart(date), monthEnd(date)], week: [weekStart, addDays(weekStart, 6)], day: [date, date] }[view];
  const inView = bars.filter((b) => b.start <= to && b.end >= from).length;

  return (
    <OpenEntry.Provider value={(bar, el, x) => setEntry({ bar, el, x })}>
      <div className="rt-pws-cal">
        <div className="rt-pws-cal__head">
          <div className="rt-pws-cal__nav-group">
            {/* back to today, first (as calendars put it); inactive while today is already shown */}
            <button type="button" className="rt-pws-cal__nav -text" onClick={() => go(today)} disabled={showsToday}>Today</button>
            <button type="button" className="rt-pws-cal__nav" onClick={() => go(step(-1))} aria-label={`Previous ${unit}`}><i className="icon-chevron-left text-12" aria-hidden="true"></i></button>
            <button type="button" className="rt-pws-cal__nav" onClick={() => go(step(1))} aria-label={`Next ${unit}`}><i className="icon-chevron-right text-12" aria-hidden="true"></i></button>
            <h2 className="rt-pws-cal__title" aria-live="polite">{title}</h2>
          </div>
          <Tabs tabs={VIEWS} value={view} onChange={pickView} label="Calendar view" />
        </div>
        <div className="rt-pws-cal__filters">
          <ToolSelect id="rt-cal-course" label="Course" value={filter.course} onChange={(v) => pickFilter("course", v)} options={[{ value: "", label: "All courses" }, ...courseOptions]} />
          <ToolSelect id="rt-cal-venue" label="Venue" value={filter.venue} onChange={(v) => pickFilter("venue", v)} options={[{ value: "", label: "All venues" }, ...venueOptions, ...(hasOnline ? [{ value: "online", label: "Online" }] : [])]} />
          {tutorFilter && <ToolSelect id="rt-cal-tutor" label="Tutor" value={filter.tutor} onChange={(v) => pickFilter("tutor", v)} options={[{ value: "", label: "All tutors" }, ...tutorOptions, ...(hasNoTutor ? [{ value: "none", label: "Not assigned" }] : [])]} />}
          {filtered && (
            <p className="rt-pws-cal__filtersum" aria-live="polite">
              {shown.length ? `${inView} ${inView === 1 ? "session" : "sessions"} ${{ month: `in ${monthLabel(date)}`, week: "this week", day: "on this day" }[view]}` : "No cohorts match these filters"}
              <button type="button" className="rt-cd__link" onClick={clearFilters}>Clear filters</button>
            </p>
          )}
        </div>

        {view === "month" && <MonthView date={date} today={today} bars={bars} byDay={byDay} onDay={openDay} />}
        {view === "week" && <WeekView days={weekDays} today={today} bars={bars} byDay={byDay} onDay={openDay} />}
        {view === "day" && <DayList days={[date]} today={today} byDay={byDay} showEmpty single />}
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

function WeekView({ days, today, bars, byDay, onDay }) {
  const rowsRef = useRef(null);
  const height = useRowHeight(rowsRef, 1, true);
  return (
    <>
      <div className="rt-pws-cal__grid">
        <Weekdays days={days} today={today} />
        <div ref={rowsRef}>
          <WeekRow days={days} today={today} bars={bars} lanes={Infinity} height={height} onDay={onDay} tall />
        </div>
      </div>
      <div className="rt-pws-cal__phone">
        <DayList days={days} today={today} byDay={byDay} emptyText="No sessions this week." />
      </div>
    </>
  );
}

function MonthView({ date, today, bars, byDay, onDay }) {
  const first = monthStart(date);
  const last = monthEnd(date);
  const weeks = [];
  for (let d = addDays(first, -weekday(first)); d <= last; d = addDays(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  const busy = Object.keys(byDay).filter((d) => d >= first && d <= last).sort();
  const rowsRef = useRef(null);
  const height = useRowHeight(rowsRef, weeks.length, false);
  return (
    <>
      <div className="rt-pws-cal__grid">
        <div className="rt-pws-cal__wdays" aria-hidden="true">{WEEKDAYS.map((d) => <span key={d}>{d.slice(0, 3)}</span>)}</div>
        <div role="group" aria-label={`${monthLabel(date)} sessions`} ref={rowsRef}>
          {weeks.map((w) => <WeekRow key={w[0]} days={w} today={today} bars={bars} lanes={MONTH_LANES} height={height} onDay={onDay} month={[first, last]} />)}
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
// each day they cover as "+N more". `height`: the row's height when the view fits the window (useRowHeight); then the rows shown
// are as many as fit in it (lanesFor) instead of `lanes`.
function WeekRow({ days, today, bars, lanes: fixedLanes, onDay, month, height = null, tall = false }) {
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
  // too short for a session bar: each day says how many sessions it has instead
  const compact = Boolean(height) && !tall && height < minRow(false);
  const lanes = compact ? 0 : height ? lanesFor(height, taken.length, tall, tall ? Infinity : MONTH_LANES) : fixedLanes;
  const shownRows = Math.min(taken.length, lanes);
  const hidden = compact ? days.map(() => 0) : days.map((_, i) => segs.filter((g) => g.row >= lanes && g.col <= i && g.col + g.len - 1 >= i).length);
  const anyHidden = hidden.some(Boolean);
  const rows = `${tall ? "0px" : "24px"}${shownRows ? ` repeat(${shownRows}, 18px)` : ""}${anyHidden ? " 16px" : ""} 1fr`;
  return (
    <div className={`rt-pws-cal__wk${tall ? " -tall" : ""}`} style={{ gridTemplateRows: rows, ...(height ? { height, minHeight: 0 } : null) }}>
      {days.map((d, i) => {
        const out = month && (d < month[0] || d > month[1]);
        const count = (segs.filter((g) => g.col <= i && g.col + g.len - 1 >= i)).length;
        return (
          <div key={d} className={`rt-pws-cal__day${out ? " -out" : ""}${d === today ? " is-today" : ""}${compact ? " -compact" : ""}`} style={{ gridColumn: i + 1 }}>
            {!tall && (
              <button type="button" className="rt-pws-cal__daynum" onClick={() => onDay(d)} aria-label={`${longDay(d)}${d === today ? ", today" : ""}, ${count ? `${count} ${count === 1 ? "session" : "sessions"}` : "no sessions"}. Open the day`}>{Number(d.slice(8))}</button>
            )}
            {compact && count > 0 && (
              <button type="button" className="rt-pws-cal__count" onClick={() => onDay(d)} tabIndex={-1} aria-hidden="true">{count} {count === 1 ? "session" : "sessions"}</button>
            )}
            {tall && d === today && <span className="rt-sr">Today</span>}
          </div>
        );
      })}
      {!compact && segs.filter((g) => g.row < lanes).map((g) => (
        <button key={`${g.b.key}-${lo}`} type="button" aria-haspopup="dialog" onClick={(e) => open(g.b, e.currentTarget, e.clientX || null)} title={describe(g.b)}
          className={`rt-pws-cal__seg ${tone(g.b)}${g.before ? " -before" : ""}${g.after ? " -after" : ""}`}
          style={{ gridColumn: `${g.col + 1} / span ${g.len}`, gridRow: g.row + 2, ...toneStyle(g.b) }}>
          {g.b.cohort.method === "live-online" && <NavIcon name="screen" size={12} className="rt-pws-cal__segicon" />}
          {/* the town before the course name, so two of one course on a day differ even when the name is cut short */}
          <span aria-hidden="true"><b>{g.b.from}</b> {g.b.place} · {g.b.title}{g.b.cancelled ? " · Cancelled" : ""}</span>
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
        <div><dt>Date</dt><dd>{shortWhen(b)}{b.cancelled ? " · Cancelled" : whyNotOnSale(k) ? ` · ${whyNotOnSale(k)}` : ""}</dd></div>
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
  // focus moves into the card once it is placed and shown (an element still hidden can't take it)
  useEffect(() => {
    if (pos) ref.current?.focus({ preventScroll: true });
  }, [pos]);
  useEffect(() => {
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

// `single`: the day view, whose bar already says the day, so its own heading is read by screen readers only
function DayList({ days, today, byDay, showEmpty = false, emptyText = "", single = false }) {
  const open = useContext(OpenEntry);
  const withSessions = days.filter((d) => byDay[d]);
  if (!withSessions.length && !showEmpty) return <EmptyState title={emptyText} />;
  const shown = showEmpty ? days : withSessions;
  return (
    <div className="rt-pws-cal__list">
      {shown.map((d) => {
        const list = byDay[d] || [];
        return (
          <section key={d} className="rt-pws-cal__listday" aria-labelledby={`rt-cal-${d}`}>
            <h3 className={single ? "rt-sr" : "rt-pws-cal__listh"} id={`rt-cal-${d}`}>{longDay(d)}{d === today && <span className="rt-pws-cal__today">Today</span>}</h3>
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
