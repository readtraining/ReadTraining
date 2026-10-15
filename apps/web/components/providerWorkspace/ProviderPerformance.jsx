"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { isoDay, replyReview, setLeadStatus, useProvider } from "@/lib/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import Toast from "@/components/courses/Toast";
import { Empty, Loading, Pill, RowMenu, Tabs, ToolSelect, getQuery, setQuery, shortDay } from "./providerParts";
import { Stars, buckets, isRange, rangeStart } from "./insightParts";
import { AreaChart, BarList, Delta, Sparkline, money } from "./charts";
import { downloadCsv } from "./moneyParts";

const VIEWS = [
  { key: "overview", label: "Overview" },
  { key: "reviews", label: "Reviews" },
  { key: "leads", label: "Leads" },
];
const REVIEW_FILTERS = { all: "All", open: "Not answered", comment: "Has a comment" };
const RATING_OPTIONS = [{ value: "", label: "All ratings" }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? "star" : "stars"}` }))];
const LEAD_STATUSES = { new: "New", replied: "Replied", closed: "Closed" };
const LEAD_TONE = { new: "warn", replied: "info", closed: "muted" };

// Performance: Hurak's three tabs (Overview, Reviews, Leads) and date ranges, in our design. Overview: the three KPI cards
// (total revenue, leads, enrolments, each with this month's figure) switch one interactive chart; each card also shows the change
// on the previous period and a sparkline, and the chart draws the previous period dashed. Below it, revenue by course and by sales
// channel. The tab, range and filters are kept in the address.
export default function ProviderPerformance() {
  const data = useProvider();
  const [view, setView] = useState("overview");
  const [range, setRange] = useState("30");
  const [toast, setToast] = useState(null);
  const done = useCallback(() => setToast(null), []);
  useEffect(() => {
    const t = getQuery("tab");
    if (VIEWS.some((v) => v.key === t)) setView(t);
    const r = getQuery("range");
    if (isRange(r)) setRange(r);
  }, []);
  if (!data) return <Loading stats rows={2} />;

  const now = Date.now();
  const earliest = Math.min(now, ...data.orders.map((o) => o.at), ...data.leads.map((l) => l.at), ...data.reviews.map((r) => r.at));
  const start = rangeStart(range, now, earliest);
  const tabs = VIEWS.map((v) => ({ ...v, count: v.key === "reviews" ? data.counts.reviews || undefined : v.key === "leads" ? data.counts.leads || undefined : undefined }));

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={view} onChange={(v) => { setView(v); setQuery("tab", v === "overview" ? "" : v); }} label="Performance views" />
        {view !== "reviews" && <RangeTabs value={range} onChange={(v) => { setRange(v); setQuery("range", v === "30" ? "" : v); }} />}
      </div>
      {view === "overview" && <Overview data={data} start={start} now={now} range={range} />}
      {view === "reviews" && <Reviews data={data} onSaved={(m) => setToast({ message: m })} />}
      {view === "leads" && <Leads data={data} start={start} now={now} onSaved={(m) => setToast({ message: m })} />}
      <Toast toast={toast} onDone={done} />
    </div>
  );
}

// Hurak's four date ranges as one segmented control (a radio group: arrow keys move between them)
function RangeTabs({ value, onChange }) {
  return (
    <div className="rt-seg" role="radiogroup" aria-label="Date range">
      {pw.ranges.map((r) => (
        <label key={r.key} className={`rt-seg__opt${value === r.key ? " is-on" : ""}`}>
          <input type="radio" name="rt-perf-range" className="rt-sr" value={r.key} checked={value === r.key} onChange={() => onChange(r.key)} />
          <span>{r.label}</span>
        </label>
      ))}
    </div>
  );
}

const KPIS = [
  { key: "revenue", label: "Total revenue", isMoney: true, icon: "icon-save-money" },
  { key: "leads", label: "Total leads", icon: "icon-message" },
  { key: "enrolments", label: "Total enrollments", icon: "icon-person-2" },
];

function Overview({ data, start, now, range }) {
  const [kpi, setKpi] = useState("revenue");
  const sold = data.orders.filter((o) => o.money.gross > 0);
  const places = (o) => o.lines.reduce((n, l) => n + l.qty, 0);
  const valueIn = (key, from, to) => {
    if (key === "revenue") return sold.filter((o) => o.at >= from && o.at < to).reduce((t, o) => t + o.money.gross, 0);
    if (key === "leads") return data.leads.filter((l) => l.at >= from && l.at < to).length;
    return sold.filter((o) => o.at >= from && o.at < to).reduce((t, o) => t + places(o), 0);
  };
  const end = now + 1;
  const span = end - start;
  const compare = range !== "all";
  const d = new Date(now);
  const monthFrom = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const show = (k, v) => (KPIS.find((x) => x.key === k).isMoney ? money(v) : String(v));
  const periods = buckets(start, now);
  // the chart is a running total across the range (sparse daily figures read as spikes otherwise), with the previous period's
  // running total dashed beside it; the tooltip also gives each period's own figure
  const seriesOf = (k) => {
    let run = 0;
    let runBefore = 0;
    return periods.map((b) => {
      const from = Math.max(b.from, start); // the first slot starts at the range's start, not at midnight before it
      const day = valueIn(k, from, Math.min(b.to, end));
      run += day;
      if (compare) runBefore += valueIn(k, from - span, Math.min(b.to, end) - span);
      return { label: b.label, day, value: run, ...(compare ? { before: runBefore } : {}) };
    });
  };
  // the cards' sparklines: weekly figures over the range (at least 8 weeks), so they show a trend rather than single days
  const weeks = Math.max(8, Math.ceil(span / (7 * 86400000)));
  const nWeeks = Math.min(weeks, 26);
  const sparkOf = (k) => Array.from({ length: nWeeks }, (_, i) => valueIn(k, end - (nWeeks - i) * 7 * 86400000, end - (nWeeks - i - 1) * 7 * 86400000));
  const current = KPIS.find((x) => x.key === kpi);
  const series = seriesOf(kpi);
  const perLabel = periods.length && periods[0].to - periods[0].from <= 86400000 ? "that day" : "that month";
  const total = valueIn(kpi, start, end);
  const rangeLabel = pw.ranges.find((r) => r.key === range)?.label.toLowerCase();

  const inRange = sold.filter((o) => o.at >= start && o.at < end);
  const byCourse = data.courses
    .map((c) => ({ key: c.id, label: c.title || "Untitled course", href: `/provider/courses/${c.id}`, value: inRange.filter((o) => o.lines.some((l) => l.courseId === c.id)).reduce((t, o) => t + o.money.gross, 0) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const byChannel = Object.entries(pw.channels)
    .map(([key, label]) => ({ key, label, value: inRange.filter((o) => o.channel === key).reduce((t, o) => t + o.money.gross, 0) }))
    .sort((a, b) => b.value - a.value);
  const exportCsv = () => downloadCsv(`${current.label.toLowerCase().replace(/\s+/g, "-")}.csv`, [["Period", current.label, "Running total", ...(compare ? ["Previous period running total"] : [])], ...series.map((p) => [p.label, current.isMoney ? p.day.toFixed(2) : p.day, current.isMoney ? p.value.toFixed(2) : p.value, ...(compare ? [current.isMoney ? p.before.toFixed(2) : p.before] : [])])]);

  return (
    <>
      <div className="rt-perf-kpis" role="tablist" aria-label="Measures">
        {KPIS.map((x) => {
          const v = valueIn(x.key, start, end);
          return (
            <button key={x.key} type="button" role="tab" id={`rt-perf-kpi-${x.key}`} aria-selected={kpi === x.key} aria-controls="rt-perf-chart" className={`rt-perf-kpi${kpi === x.key ? " is-on" : ""}`} onClick={() => setKpi(x.key)}>
              <span className="rt-perf-kpi__top">
                <span className="rt-perf-kpi__icon" aria-hidden="true"><i className={`${x.icon} text-16`}></i></span>
                <span className="rt-perf-kpi__label">{x.label}</span>
                {compare && <Delta now={v} before={valueIn(x.key, start - span, start)} />}
              </span>
              <strong className="rt-perf-kpi__value">{show(x.key, v)}</strong>
              <span className="rt-perf-kpi__foot">
                <span className="rt-perf-kpi__month"><b>{show(x.key, valueIn(x.key, monthFrom, end))}</b> this month</span>
                <Sparkline values={sparkOf(x.key)} label={`${x.label}, week by week`} />
              </span>
            </button>
          );
        })}
      </div>

      <section className="rt-acc__card rt-perf-chart" id="rt-perf-chart" role="tabpanel" aria-labelledby={`rt-perf-kpi-${kpi}`}>
        <div className="rt-perf-chart__head">
          <div>
            <h2 className="rt-perf-chart__title">{current.label}</h2>
            <p className="rt-perf-chart__sum"><b>{show(kpi, total)}</b> in the {rangeLabel}</p>
          </div>
          <RowMenu label="Chart menu" items={[{ label: "Download CSV", onClick: exportCsv }]} />
        </div>
        <AreaChart points={series} isMoney={current.isMoney} label={`${current.label} (running total)`} compareLabel="Previous period" dayLabel={perLabel} />
      </section>

      <div className="rt-perf-split">
        <section className="rt-acc__card" aria-labelledby="rt-perf-bc">
          <h2 className="rt-perf-chart__title" id="rt-perf-bc">Revenue by course</h2>
          <p className="rt-acc__note rt-perf-split__note">Top courses in the {rangeLabel}.</p>
          <BarList rows={byCourse} isMoney empty="No sales in this period." />
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-perf-ch">
          <h2 className="rt-perf-chart__title" id="rt-perf-ch">Revenue by sales channel</h2>
          <p className="rt-acc__note rt-perf-split__note">ReadTraining, your website and the orders you create.</p>
          <BarList rows={byChannel} isMoney />
        </section>
      </div>
    </>
  );
}

function Reviews({ data, onSaved }) {
  const [filter, setFilter] = useState("all");
  const [rating, setRating] = useState("");
  useEffect(() => {
    const f = getQuery("show");
    if (REVIEW_FILTERS[f]) setFilter(f);
    const r = getQuery("rating");
    if (["1", "2", "3", "4", "5"].includes(r)) setRating(r);
  }, []);

  const all = data.reviews;
  if (!all.length) return <Empty title="No reviews yet" text="Learners can review a course after they finish it. Their reviews appear here." />;

  const avg = all.reduce((t, r) => t + r.rating, 0) / all.length;
  const tests = { all: () => true, open: (r) => !r.reply, comment: (r) => Boolean(r.text) };
  const list = all.filter((r) => tests[filter](r) && (!rating || r.rating === Number(rating))).sort((a, b) => b.at - a.at);
  const tabs = Object.entries(REVIEW_FILTERS).map(([key, label]) => ({ key, label, count: all.filter(tests[key]).length }));

  return (
    <>
      <section className="rt-acc__card rt-pws-perf__summary" aria-labelledby="rt-pws-perf-sum-h">
        <h2 className="rt-sr" id="rt-pws-perf-sum-h">Rating summary</h2>
        <div className="rt-pws-perf__avg">
          <strong>{avg.toFixed(1)}</strong>
          <Stars rating={Number(avg.toFixed(1))} large />
          <span className="rt-adm-muted">{all.length} {all.length === 1 ? "review" : "reviews"}</span>
        </div>
        <ul className="rt-pws-perf__breakdown">
          {[5, 4, 3, 2, 1].map((n) => {
            const c = all.filter((r) => r.rating === n).length;
            return (
              <li key={n}>
                <span>{n} {n === 1 ? "star" : "stars"}</span>
                <span className="rt-adm-bar" aria-hidden="true"><span style={{ width: `${(c / all.length) * 100}%` }}></span></span>
                <b>{c}</b>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={filter} onChange={(v) => { setFilter(v); setQuery("show", v === "all" ? "" : v); }} label="Show reviews" />
        <ToolSelect id="rt-pws-perf-rating" label="Rating" value={rating} onChange={(v) => { setRating(v); setQuery("rating", v); }} options={RATING_OPTIONS} />
      </div>
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "review" : "reviews"}`}</p>

      {list.length ? (
        <ul className="rt-adm-items">
          {list.map((r) => <ReviewCard key={r.id} r={r} course={data.byId.course[r.courseId]} onSaved={onSaved} />)}
        </ul>
      ) : (
        <p className="rt-acc__card rt-acc__empty">No reviews match.</p>
      )}
    </>
  );
}

function ReviewCard({ r, course, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(r.reply || "");
  const [error, setError] = useState("");
  const formRef = useRef(null);
  const id = `rt-pws-reply-${r.id}`;
  const save = (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Write your reply first.");
      return focusFirstError(formRef.current);
    }
    replyReview(r.id, text.trim());
    setError("");
    setEditing(false);
    onSaved(r.reply ? "Reply updated" : "Reply posted");
  };
  const showForm = editing || !r.reply;

  return (
    <li className="rt-acc__card rt-pws-perf__review">
      <div className="rt-adm-item__top">
        <Stars rating={r.rating} />
        <span className="rt-adm-item__when">{r.name} · {shortDay(isoDay(r.at))}</span>
        {!r.reply && <Pill tone="warn">Not answered</Pill>}
      </div>
      <p className="rt-adm-muted rt-pws-perf__course">{course ? <Link href={`/provider/courses/${course.id}`} className="rt-adm-strong">{course.title}</Link> : "Course removed"}</p>
      {r.text ? <p className="rt-pws-perf__text">{r.text}</p> : <p className="rt-adm-muted">No comment, rating only.</p>}

      {r.reply && !editing && (
        <div className="rt-adm-item__reason rt-pws-perf__reply">
          <b>Your reply</b>
          <p>{r.reply}</p>
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setText(r.reply); setEditing(true); }}>Edit reply<span className="rt-sr"> to {r.name}</span></button>
        </div>
      )}
      {showForm && (
        <form className="rt-adm-noteform rt-pws-perf__replyform" onSubmit={save} noValidate ref={formRef}>
          <div className="rt-field">
            <label htmlFor={id}>{r.reply ? "Edit your reply" : "Reply publicly"}</label>
            {error && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{error}</p>}
            <textarea id={id} rows={3} maxLength={1000} autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} />
          </div>
          <div className="rt-adm-cellrow">
            <button type="submit" className="button -sm -outline-purple-1 text-purple-1">{r.reply ? "Save reply" : "Post reply"}</button>
            {editing && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setEditing(false); setError(""); }}>Cancel</button>}
          </div>
        </form>
      )}
    </li>
  );
}

function Leads({ data, start, now, onSaved }) {
  const [status, setStatus] = useState("all");
  useEffect(() => {
    const s = getQuery("status");
    if (LEAD_STATUSES[s]) setStatus(s);
  }, []);
  const inRange = data.leads.filter((l) => l.at >= start && l.at <= now);
  const list = inRange.filter((l) => status === "all" || l.status === status).sort((a, b) => b.at - a.at);
  const tabs = [{ key: "all", label: "All", count: inRange.length }, ...Object.entries(LEAD_STATUSES).map(([key, label]) => ({ key, label, count: inRange.filter((l) => l.status === key).length }))];

  if (!data.leads.length) return <Empty title="No leads yet" text="Enquiries from your Enquiries courses appear here." />;

  return (
    <>
      <div className="rt-perf-kpis -two">
        <div className="rt-perf-kpi -static"><span className="rt-perf-kpi__label">Total leads</span><strong className="rt-perf-kpi__value">{inRange.length}</strong></div>
        <div className="rt-perf-kpi -static"><span className="rt-perf-kpi__label">This month</span><strong className="rt-perf-kpi__value">{data.leads.filter((l) => l.at >= Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1)).length}</strong></div>
      </div>
      <p className="rt-acc__note">Leads come from your Enquiries courses. Reply by email, then mark each one replied or closed.</p>
      <Tabs tabs={tabs} value={status} onChange={(v) => { setStatus(v); setQuery("status", v === "all" ? "" : v); }} label="Show leads" />
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "lead" : "leads"}`}</p>
      {list.length ? (
        <ul className="rt-adm-items">
          {list.map((l) => {
            const course = data.byId.course[l.courseId];
            return (
              <li key={l.id} className="rt-acc__card rt-adm-item">
                <div className="rt-adm-item__body">
                  <div className="rt-adm-item__top">
                    <Pill tone={LEAD_TONE[l.status]}>{LEAD_STATUSES[l.status]}</Pill>
                    <span className="rt-adm-item__when">{shortDay(isoDay(l.at))}</span>
                  </div>
                  <b className="rt-pws-perf__leadname">{l.name}</b>
                  <p className="rt-adm-muted">{course ? course.title : "General enquiry"} · <a href={`mailto:${l.email}`}>{l.email}</a></p>
                  <p className="rt-adm-item__reason">{l.text}</p>
                </div>
                <div className="rt-adm-item__actions">
                  <a href={`mailto:${l.email}?subject=${encodeURIComponent(`Your enquiry${course ? `: ${course.title}` : ""}`)}`} className="button -sm -outline-purple-1 text-purple-1">Reply by email<span className="rt-sr"> to {l.name}</span></a>
                  <ToolSelect id={`rt-pws-lead-${l.id}`} label={`Status of the enquiry from ${l.name}`} value={l.status} onChange={(v) => { setLeadStatus(l.id, v); onSaved(`Marked ${LEAD_STATUSES[v].toLowerCase()}`); }} options={Object.entries(LEAD_STATUSES).map(([value, label]) => ({ value, label }))} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rt-acc__card rt-acc__empty">No leads match.</p>
      )}
    </>
  );
}
