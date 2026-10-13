"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isoDay, replyReview, setLeadStatus, useProvider } from "@/lib/providerWorkspace";
import { formatPrice } from "@/lib/format";
import { focusFirstError } from "@/lib/focusFirstError";
import Toast from "@/components/courses/Toast";
import { Empty, Loading, Pill, Stats, Tabs, ToolSelect, getQuery, setQuery, shortDay } from "./providerParts";
import { RANGE_OPTIONS, Stars, isRange, rangeStart } from "./insightParts";

const VIEWS = [
  { key: "overview", label: "Overview" },
  { key: "reviews", label: "Reviews" },
  { key: "leads", label: "Enquiries" },
];
const REVIEW_FILTERS = { all: "All", open: "Not answered", comment: "Has a comment" };
const RATING_OPTIONS = [{ value: "", label: "All ratings" }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? "star" : "stars"}` }))];
const LEAD_STATUSES = { new: "New", replied: "Replied", closed: "Closed" };
const LEAD_TONE = { new: "warn", replied: "info", closed: "muted" };

// Performance: how sales are going over a period (with revenue by course), what learners say (filter, the star breakdown, reply to
// each review) and the enquiries sent from course pages (reply by email, then mark replied or closed). The view, period and
// filters are kept in the address.
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
        {view !== "reviews" && <ToolSelect id="rt-pws-perf-range" label="Date range" value={range} onChange={(v) => { setRange(v); setQuery("range", v === "30" ? "" : v); }} options={RANGE_OPTIONS} />}
      </div>
      {view === "overview" && <Overview data={data} start={start} now={now} />}
      {view === "reviews" && <Reviews data={data} onSaved={(m) => setToast({ message: m })} />}
      {view === "leads" && <Leads data={data} start={start} now={now} onSaved={(m) => setToast({ message: m })} />}
      <Toast toast={toast} onDone={done} />
    </div>
  );
}

function Overview({ data, start, now }) {
  const orders = data.orders.filter((o) => o.at >= start && o.at <= now);
  const sold = orders.filter((o) => o.money.gross > 0);
  const refs = new Set(sold.map((o) => o.ref));
  const enrolments = data.enrolments.filter((e) => refs.has(e.orderRef)).length;
  const leads = data.leads.filter((l) => l.at >= start && l.at <= now).length;
  const revenue = sold.reduce((t, o) => t + o.money.gross, 0);
  const stats = [
    { icon: "icon-save-money", value: formatPrice(revenue), label: "Revenue" },
    { icon: "icon-person-2", value: String(enrolments), label: "Enrolments" },
    { icon: "icon-message", value: String(leads), label: "Enquiries" },
    { icon: "icon-basket", value: sold.length ? formatPrice(revenue / sold.length) : formatPrice(0), label: "Average order" },
  ];
  const byCourse = data.courses.map((c) => {
    const mine = sold.filter((o) => o.lines.some((l) => l.courseId === c.id));
    return {
      c,
      orders: mine.length,
      places: mine.reduce((t, o) => t + o.lines.filter((l) => l.courseId === c.id).reduce((n, l) => n + l.qty, 0), 0),
      gross: mine.reduce((t, o) => t + o.money.gross, 0),
      refunded: mine.reduce((t, o) => t + o.refunded, 0),
      net: mine.reduce((t, o) => t + o.money.net, 0),
    };
  }).filter((r) => r.orders).sort((a, b) => b.gross - a.gross);

  return (
    <>
      <Stats items={stats} label="This period" />
      {byCourse.length ? (
        <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-pws-perf-bc-h">
          <h2 className="rt-acc__h2 rt-adm-tabletitle" id="rt-pws-perf-bc-h">Revenue by course</h2>
          <table className="rt-biz__table rt-adm-table">
            <thead><tr><th scope="col">Course</th><th scope="col">Orders</th><th scope="col">Places</th><th scope="col">Revenue</th><th scope="col">Refunded</th><th scope="col">You earn</th></tr></thead>
            <tbody>
              {byCourse.map((r) => (
                <tr key={r.c.id}>
                  <td data-label="Course"><Link href={`/provider/courses/${r.c.id}`} className="rt-adm-strong">{r.c.title || "Untitled course"}</Link></td>
                  <td data-label="Orders">{r.orders}</td>
                  <td data-label="Places">{r.places}</td>
                  <td data-label="Revenue">{formatPrice(r.gross)}</td>
                  <td data-label="Refunded">{formatPrice(r.refunded)}</td>
                  <td data-label="You earn">{formatPrice(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="rt-acc__note rt-adm-tablenote">"You earn" is after refunds, the card fee and commission on ReadTraining sales.</p>
        </section>
      ) : (
        <Empty title="No sales in this period" text="Try a longer date range." />
      )}
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

  if (!data.leads.length) return <Empty title="No enquiries yet" text="Questions sent from your course pages appear here." />;

  return (
    <>
      <p className="rt-acc__note rt-adm-help"><i className="icon-message text-12" aria-hidden="true"></i> {inRange.length} {inRange.length === 1 ? "enquiry" : "enquiries"} in this period. Reply by email, then mark each one replied or closed.</p>
      <Tabs tabs={tabs} value={status} onChange={(v) => { setStatus(v); setQuery("status", v === "all" ? "" : v); }} label="Show enquiries" />
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "enquiry" : "enquiries"}`}</p>
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
        <p className="rt-acc__card rt-acc__empty">No enquiries match.</p>
      )}
    </>
  );
}
