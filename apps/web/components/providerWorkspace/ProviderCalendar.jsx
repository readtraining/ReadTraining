"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { todayIso, useProvider } from "@/lib/providerWorkspace";
import { Empty, Loading, Tabs, getQuery, setQuery, shortDay } from "./providerParts";
import { addDays, longDay, monthLabel, weekday } from "./ProviderCohorts";

// The calendar: every session of every cohort by month, week, day or as a list (view and date kept in the address, ?view= and
// ?date=). Each session is a link to its cohort; cancelled cohorts stay visible, struck through. On phones the month becomes a
// list of the days that have sessions.

const VIEWS = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
  { key: "list", label: "List" },
];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MAX_CHIPS = 3;
const LIST_DAYS = 60;
const isIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !Number.isNaN(Date.parse(s));
const monthStart = (iso) => `${iso.slice(0, 7)}-01`;
const shiftMonth = (iso, n) => {
  const d = new Date(`${monthStart(iso)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};
const monthLen = (iso) => Math.round((Date.parse(`${shiftMonth(iso, 1)}T00:00:00Z`) - Date.parse(`${monthStart(iso)}T00:00:00Z`)) / 86400000);
const rangeFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmt = (iso) => rangeFmt.format(new Date(`${iso}T00:00:00Z`));

// every session as one entry per day it runs
function sessionsByDay(cohorts) {
  const map = {};
  cohorts.forEach((k) => k.sessions.forEach((s) => {
    for (let d = s.date; d <= (s.end || s.date); d = addDays(d, 1)) {
      (map[d] ||= []).push({ key: `${k.id}-${s.date}-${d}`, cohort: k, from: s.from, to: s.to, title: k.course?.title || "Untitled course", where: k.venue ? k.venue.name : "Online", cancelled: k.cancelled });
    }
  }));
  Object.values(map).forEach((l) => l.sort((a, b) => a.from.localeCompare(b.from)));
  return map;
}

export default function ProviderCalendar() {
  const data = useProvider();
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

  if (!data) return <Loading rows={1} />;
  if (!data.cohorts.length) return <Empty title="Nothing on the calendar yet" text="Sessions appear here once you add a cohort with dates." action={{ label: "Add a cohort", href: "/provider/cohorts" }} />;

  const byDay = sessionsByDay(data.cohorts);
  const today = data.today;
  const weekStart = addDays(date, -weekday(date));
  const step = { month: (n) => shiftMonth(date, n), week: (n) => addDays(date, 7 * n), day: (n) => addDays(date, n), list: (n) => addDays(date, LIST_DAYS * n) }[view];
  const title = {
    month: monthLabel(date),
    week: `${fmt(weekStart)} to ${fmt(addDays(weekStart, 6))}`,
    day: longDay(date),
    list: `From ${fmt(date)}`,
  }[view];
  const unit = { month: "month", week: "week", day: "day", list: `${LIST_DAYS} days` }[view];

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar rt-pws-cal__bar">
        <div className="rt-pws-cal__nav-group">
          <button type="button" className="rt-pws-cal__nav" onClick={() => go(step(-1))} aria-label={`Previous ${unit}`}><i className="icon-chevron-left text-12" aria-hidden="true"></i></button>
          <button type="button" className="rt-pws-cal__nav" onClick={() => go(step(1))} aria-label={`Next ${unit}`}><i className="icon-chevron-right text-12" aria-hidden="true"></i></button>
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => go(todayIso())}>Today</button>
          <h2 className="rt-pws-cal__title" aria-live="polite">{title}</h2>
        </div>
        <Tabs tabs={VIEWS} value={view} onChange={pickView} label="Calendar view" />
      </div>

      {view === "month" && <MonthView date={date} today={today} byDay={byDay} onDay={(d) => { go(d); pickView("day"); }} />}
      {view === "week" && <WeekView start={weekStart} today={today} byDay={byDay} />}
      {view === "day" && <DayList days={[date]} today={today} byDay={byDay} showEmpty />}
      {view === "list" && <DayList days={Array.from({ length: LIST_DAYS }, (_, i) => addDays(date, i))} today={today} byDay={byDay} emptyText={`No sessions in the ${LIST_DAYS} days from ${fmt(date)}.`} />}
    </div>
  );
}

function Chip({ e, short = false }) {
  const label = `${e.title}, ${e.from} to ${e.to}, ${e.where}${e.cancelled ? ", cancelled" : ""}`;
  return (
    <Link href={`/provider/cohorts/${e.cohort.id}`} className={`rt-pws-cal__chip${e.cancelled ? " -cancelled" : ""}`} title={label}>
      <span aria-hidden="true"><b>{e.from}</b> {e.title}</span>
      {!short && <span className="rt-pws-cal__chipwhere" aria-hidden="true">{e.where}{e.cancelled ? " · Cancelled" : ""}</span>}
      <span className="rt-sr">{label}</span>
    </Link>
  );
}

function MonthView({ date, today, byDay, onDay }) {
  const first = monthStart(date);
  const len = monthLen(date);
  const lead = weekday(first);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: len }, (_, i) => addDays(first, i))];
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const busy = cells.filter((d) => d && byDay[d]);

  return (
    <>
      <div className="rt-acc__card rt-pws-cal__monthcard">
        <table className="rt-pws-cal__month">
          <caption className="rt-sr">{monthLabel(date)} sessions</caption>
          <thead><tr>{WEEKDAYS.map((d) => <th key={d} scope="col"><abbr title={d}>{d.slice(0, 3)}</abbr></th>)}</tr></thead>
          <tbody>
            {weeks.map((w, wi) => (
              <tr key={wi}>
                {w.map((d, di) => {
                  if (!d) return <td key={di} className="rt-pws-cal__cell -out"></td>;
                  const list = byDay[d] || [];
                  return (
                    <td key={di} className={`rt-pws-cal__cell${d === today ? " is-today" : ""}`}>
                      <button type="button" className="rt-pws-cal__daynum" onClick={() => onDay(d)} aria-label={`${longDay(d)}${d === today ? ", today" : ""}, ${list.length ? `${list.length} ${list.length === 1 ? "session" : "sessions"}` : "no sessions"}. Open the day`}>{Number(d.slice(8))}</button>
                      {list.length > 0 && (
                        <ul className="rt-pws-cal__chips">
                          {list.slice(0, MAX_CHIPS).map((e) => <li key={e.key}><Chip e={e} short /></li>)}
                        </ul>
                      )}
                      {list.length > MAX_CHIPS && <button type="button" className="rt-pws-cal__more" onClick={() => onDay(d)}>+{list.length - MAX_CHIPS} more<span className="rt-sr"> on {longDay(d)}</span></button>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rt-pws-cal__phonemonth">
        <DayList days={busy} today={today} byDay={byDay} emptyText={`No sessions in ${monthLabel(date)}.`} />
      </div>
    </>
  );
}

function WeekView({ start, today, byDay }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="rt-pws-cal__week">
      {days.map((d) => {
        const list = byDay[d] || [];
        return (
          <section key={d} className={`rt-acc__card rt-pws-cal__wday${d === today ? " is-today" : ""}`} aria-label={longDay(d)}>
            <h3 className="rt-pws-cal__wdayh"><span>{shortDay(d).split(" ")[0]}</span> {Number(d.slice(8))}{d === today && <span className="rt-sr">, today</span>}</h3>
            {list.length ? <ul className="rt-pws-cal__chips">{list.map((e) => <li key={e.key}><Chip e={e} /></li>)}</ul> : <p className="rt-pws-cal__none">No sessions</p>}
          </section>
        );
      })}
    </div>
  );
}

function DayList({ days, today, byDay, showEmpty = false, emptyText = "" }) {
  const withSessions = days.filter((d) => byDay[d]);
  if (!withSessions.length && !showEmpty) return <p className="rt-acc__card rt-acc__empty">{emptyText}</p>;
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
                {list.map((e) => (
                  <li key={e.key} className={e.cancelled ? "-cancelled" : undefined}>
                    <span className="rt-pws-cal__time">{e.from} to {e.to}</span>
                    <span className="rt-pws-cal__what">
                      <Link href={`/provider/cohorts/${e.cohort.id}`} className="rt-adm-strong">{e.title}</Link>
                      <small>{e.where} · {e.cohort.booked}/{e.cohort.max} booked{e.cancelled ? " · Cancelled" : ""}</small>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rt-pws-cal__none">No sessions on this day.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
