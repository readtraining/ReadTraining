"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { cancelCohort, saveCohort, todayIso, useProvider } from "@/lib/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { COHORT_TONE, Choice, Empty, Loading, Pill, Search, Tabs, ToolSelect, getQuery, setQuery, shortDay } from "./providerParts";

// Cohorts: every run of a course (its dates, venue, tutor, places, price and status), filtered by delivery, course, status, venue,
// tutor and when, with a search. Rows can be picked for bulk actions (email joining instructions, cancel upcoming runs). Used on
// /provider/cohorts (filters kept in the address) and inside the course editor's Cohorts tab (`courseId`, filters not kept).
// CohortForm (named export) is the create and edit panel: dates picked on a two-month calendar become session slots.

const MODES = [
  { key: "all", label: "All" },
  { key: "classroom", label: "Classroom" },
  { key: "live-online", label: "Live online" },
];
const WHEN = [
  { value: "upcoming", label: "Upcoming and in progress" },
  { value: "past", label: "Past" },
  { value: "all", label: "Any date" },
];
const ONLINE = "Online";

// ---- dates (ISO days, worked out in UTC so they never shift with the clock) ---------------------------------------------------

const toDate = (iso) => new Date(`${iso}T00:00:00Z`);
const toIso = (d) => d.toISOString().slice(0, 10);
export const addDays = (iso, n) => {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
};
const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
const monthStart = (iso) => `${iso.slice(0, 7)}-01`;
const addMonths = (iso, n) => {
  const d = toDate(monthStart(iso));
  d.setUTCMonth(d.getUTCMonth() + n);
  return toIso(d);
};
const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const monthLabel = (iso) => monthFmt.format(toDate(iso));
export const longDay = (iso) => longFmt.format(toDate(iso));
// Monday = 0
export const weekday = (iso) => (toDate(iso).getUTCDay() + 6) % 7;

// "Tue 20 Oct" or "Tue 20 Oct to Sun 25 Oct"
export const dayRange = (first, last) => (first === last ? shortDay(first) : `${shortDay(first)} to ${shortDay(last)}`);

// times in 15-minute steps, 06:00 to 22:00
const TIMES = [];
for (let m = 6 * 60; m <= 22 * 60; m += 15) TIMES.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
const DEFAULT_SLOT = { from: "10:00", to: "18:30" };

// ---- the list --------------------------------------------------------------------------------------------------------------

export default function ProviderCohorts({ courseId = "" }) {
  const data = useProvider();
  const embedded = Boolean(courseId);
  const [mode, setMode] = useState("all");
  const [course, setCourse] = useState("");
  const [status, setStatus] = useState("");
  const [venue, setVenue] = useState("");
  const [tutor, setTutor] = useState("");
  const [when, setWhen] = useState("upcoming");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (embedded) return;
    const m = getQuery("mode");
    if (MODES.some((x) => x.key === m)) setMode(m);
    const c = getQuery("course");
    if (c) setCourse(c);
    const s = getQuery("status");
    if (s && pw.cohortStatuses[s]) {
      setStatus(s);
      setWhen("all");
    }
    const w = getQuery("when");
    if (WHEN.some((x) => x.value === w)) setWhen(w);
    const v = getQuery("venue");
    if (v) setVenue(v);
    const t = getQuery("tutor");
    if (t) setTutor(t);
    const s2 = getQuery("q");
    if (s2) setQ(s2);
  }, [embedded]);

  const keep = (key, value, fallback = "") => !embedded && setQuery(key, value === fallback ? "" : value);

  if (!data) return <Loading rows={2} />;
  const { byId, today } = data;
  const scoped = data.cohorts.filter((k) => !embedded || k.courseId === courseId);
  const datedCourses = data.courses.filter((c) => c.format !== "on-demand");
  const thisCourse = embedded ? byId.course[courseId] : null;

  if (embedded && thisCourse?.format === "on-demand") {
    return <p className="rt-acc__card rt-acc__empty">On-demand courses have no dates. Learners start as soon as they book.</p>;
  }

  const needle = q.trim().toLowerCase();
  const list = scoped
    .filter((k) => mode === "all" || k.course?.format === mode)
    .filter((k) => embedded || !course || k.courseId === course)
    .filter((k) => !status || k.status === status)
    .filter((k) => !venue || (venue === "online" ? !k.venueId : k.venueId === venue))
    .filter((k) => !tutor || (tutor === "none" ? !k.tutorId : k.tutorId === tutor))
    .filter((k) => when === "all" || (when === "upcoming" ? k.last >= today : k.last < today))
    .filter((k) => !needle || `${k.course?.title} ${k.venue?.name || ONLINE} ${k.venue?.city || ""} ${k.tutor?.name || ""}`.toLowerCase().includes(needle))
    .sort((a, b) => (when === "past" ? b.first.localeCompare(a.first) : a.first.localeCompare(b.first)));

  const visibleIds = list.map((k) => k.id);
  const pickedHere = picked.filter((id) => visibleIds.includes(id));
  const allPicked = list.length > 0 && pickedHere.length === list.length;
  const pickedRows = pickedHere.map((id) => byId.cohort[id]);
  const cancellable = pickedRows.filter((k) => k.status === "upcoming");
  const learnersIn = (rows) => rows.filter((k) => !k.cancelled).reduce((n, k) => n + k.booked, 0);
  const filtered = Boolean(status || venue || tutor || needle || (!embedded && course) || mode !== "all" || when !== "upcoming");

  const clear = () => {
    setMode("all");
    setCourse("");
    setStatus("");
    setVenue("");
    setTutor("");
    setWhen("upcoming");
    setQ("");
    ["mode", "course", "status", "venue", "tutor", "when", "q"].forEach((k) => keep(k, ""));
  };
  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const sendJoining = () => {
    const n = learnersIn(pickedRows);
    setToast({ message: n ? `Joining instructions sent to ${n} ${n === 1 ? "learner" : "learners"}` : "No learners booked on the cohorts you picked" });
    setPicked([]);
  };
  const doCancel = () => {
    cancellable.forEach((k) => cancelCohort(k.id));
    setConfirm(false);
    setPicked([]);
    setToast({ message: `${cancellable.length} ${cancellable.length === 1 ? "cohort" : "cohorts"} cancelled. Learners were told.` });
  };

  const tutors = data.team.filter((t) => t.status === "active");
  const create = <button type="button" className="button -md -purple-1 text-white" onClick={() => setFormOpen(true)} disabled={!datedCourses.length}>Create cohort</button>;

  return (
    <div className="rt-acc__stack">
      {scoped.length === 0 ? (
        <Empty
          title="No cohorts yet"
          text={embedded ? "Add the first run of this course: pick its dates, venue and number of places." : "A cohort is one run of a course on set dates. Add one to start taking bookings."}
          action={datedCourses.length ? { label: "Create cohort", onClick: () => setFormOpen(true) } : { label: "Create a course first", href: "/provider/courses/new" }}
        />
      ) : (
        <>
          <div className="rt-adm-toolbar">
            {!embedded ? <Tabs tabs={MODES.map((m) => ({ ...m, count: scoped.filter((k) => m.key === "all" || k.course?.format === m.key).length }))} value={mode} onChange={(v) => { setMode(v); keep("mode", v, "all"); }} label="Delivery" /> : <span />}
            {create}
          </div>
          <div className="rt-adm-toolbar rt-pws-coh__filters">
            <div className="rt-adm-toolbar__end">
              {!embedded && <ToolSelect id="rt-coh-course" label="Course" value={course} onChange={(v) => { setCourse(v); keep("course", v); }} options={[{ value: "", label: "All courses" }, ...datedCourses.map((c) => ({ value: c.id, label: c.title || "Untitled course" }))]} />}
              <ToolSelect id="rt-coh-when" label="When" value={when} onChange={(v) => { setWhen(v); keep("when", v, "upcoming"); }} options={WHEN} />
              <ToolSelect id="rt-coh-status" label="Status" value={status} onChange={(v) => { setStatus(v); keep("status", v); if (v) { setWhen("all"); keep("when", "all", "upcoming"); } }} options={[{ value: "", label: "All statuses" }, ...Object.entries(pw.cohortStatuses).map(([value, label]) => ({ value, label }))]} />
              <ToolSelect id="rt-coh-venue" label="Venue" value={venue} onChange={(v) => { setVenue(v); keep("venue", v); }} options={[{ value: "", label: "All venues" }, ...data.venues.map((v) => ({ value: v.id, label: v.name })), { value: "online", label: ONLINE }]} />
              <ToolSelect id="rt-coh-tutor" label="Tutor" value={tutor} onChange={(v) => { setTutor(v); keep("tutor", v); }} options={[{ value: "", label: "All tutors" }, ...tutors.map((t) => ({ value: t.id, label: t.name || t.email })), { value: "none", label: "Not assigned" }]} />
            </div>
            <Search value={q} onChange={(v) => { setQ(v); keep("q", v.trim()); }} label="Search course, venue or tutor" />
          </div>

          {pickedHere.length > 0 && (
            <div className="rt-acc__card rt-pws-coh__bulk" role="region" aria-label="Picked cohorts">
              <span className="rt-pws-coh__bulkn">{pickedHere.length} picked</span>
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={sendJoining}>Email joining instructions</button>
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setConfirm(true)} disabled={!cancellable.length}>Cancel cohorts</button>
              <button type="button" className="rt-pws-coh__clear" onClick={() => setPicked([])}>Clear</button>
            </div>
          )}

          <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "cohort" : "cohorts"}`}</p>
          {list.length ? (
            <div className="rt-acc__card rt-biz__tablecard">
              <table className="rt-biz__table rt-adm-table rt-pws-coh__table">
                <thead>
                  <tr>
                    <th scope="col" className="rt-pws-coh__pick">
                      <label className="rt-pws-coh__check">
                        <input type="checkbox" className="rt-fp__check" checked={allPicked} onChange={() => setPicked(allPicked ? picked.filter((id) => !visibleIds.includes(id)) : [...new Set([...picked, ...visibleIds])])} />
                        <span className="rt-sr">Pick all cohorts shown</span>
                      </label>
                    </th>
                    <th scope="col">Course</th>
                    <th scope="col">Dates</th>
                    <th scope="col">Where</th>
                    <th scope="col">Tutor</th>
                    <th scope="col">Places</th>
                    <th scope="col">Price</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((k) => {
                    const s0 = k.sessions[0];
                    const pack = k.packageId ? byId.pack[k.packageId] : null;
                    return (
                      <tr key={k.id} className={picked.includes(k.id) ? "is-picked" : undefined}>
                        <td data-label="Pick" className="rt-pws-coh__pick">
                          <label className="rt-pws-coh__check">
                            <input type="checkbox" className="rt-fp__check" checked={picked.includes(k.id)} onChange={() => togglePick(k.id)} />
                            <span className="rt-sr">Pick {k.course?.title}, {dayRange(k.first, k.last)}</span>
                          </label>
                        </td>
                        <td data-label="Course"><Link href={`/provider/cohorts/${k.id}`} className="rt-adm-strong">{k.course?.title || "Untitled course"}</Link><small>{pw.formats.find((f) => f.key === k.course?.format)?.short}</small></td>
                        <td data-label="Dates">{dayRange(k.first, k.last)}<small>{s0 ? `${s0.from} to ${s0.to}` : ""}{k.sessions.length > 1 ? ` · ${k.sessions.length} sessions` : ""}</small></td>
                        <td data-label="Where">{k.venue ? k.venue.name : ONLINE}{k.venue && <small>{k.venue.city}</small>}</td>
                        <td data-label="Tutor">{k.tutor ? k.tutor.name || k.tutor.email : <span className="rt-adm-muted">Not assigned</span>}</td>
                        <td data-label="Places"><Seats booked={k.booked} max={k.max} /></td>
                        <td data-label="Price">{pack ? <>From {formatPrice(pack.tiers.saver.price)}<small>{pack.name}</small></> : formatPrice(k.price)}</td>
                        <td data-label="Status"><Pill tone={COHORT_TONE[k.status]}>{pw.cohortStatuses[k.status]}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rt-acc__card rt-acc__empty rt-pws-coh__none">
              <p>No cohorts match these filters.</p>
              {filtered && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={clear}>Clear filters</button>}
            </div>
          )}
        </>
      )}

      <CohortForm open={formOpen} onClose={() => setFormOpen(false)} courseId={courseId} suggestCourseId={embedded ? "" : course} onSaved={(id) => { setFormOpen(false); setToast({ message: "Cohort saved", href: `/provider/cohorts/${id}`, label: "Open" }); }} />

      <Sheet open={confirm} onClose={() => setConfirm(false)} title={`Cancel ${cancellable.length} ${cancellable.length === 1 ? "cohort" : "cohorts"}?`} closeLabel="Close">
        <div className="rt-q__form">
          <p className="rt-acc__note">Booked learners are told straight away and offered another date or a full refund. Only upcoming cohorts can be cancelled{pickedRows.length > cancellable.length ? `, so ${pickedRows.length - cancellable.length} of the cohorts you picked stay as they are` : ""}.</p>
          <ul className="rt-adm-list">
            {cancellable.map((k) => <li key={k.id}><div><b>{k.course?.title}</b><small>{dayRange(k.first, k.last)} · {k.booked} booked</small></div></li>)}
          </ul>
          <div className="rt-pws-coh__actions">
            <button type="button" className="button -md -purple-1 text-white" onClick={doCancel}>Cancel {cancellable.length === 1 ? "cohort" : "cohorts"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setConfirm(false)}>Keep them</button>
          </div>
        </div>
      </Sheet>
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

// booked out of max, as the admin's seat bar
export function Seats({ booked, max }) {
  const pct = max ? Math.min(100, Math.round((booked / max) * 100)) : 0;
  return (
    <div className="rt-adm-seats" role="img" aria-label={`${booked} of ${max} places booked`}>
      <span className="rt-adm-seats__n">{booked}/{max}</span>
      <span className="rt-adm-seats__bar"><span className={pct >= 90 ? "-full" : undefined} style={{ width: `${pct}%` }}></span></span>
    </div>
  );
}

// ---- create and edit -------------------------------------------------------------------------------------------------------

// The panel for one cohort. `cohort` (a derived cohort) edits it; otherwise it creates one for `courseId`, or asks which course.
export function CohortForm({ open, onClose, courseId = "", suggestCourseId = "", cohort = null, onSaved }) {
  const data = useProvider();
  const formRef = useRef(null);
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  const [view, setView] = useState(() => monthStart(todayIso()));

  // fill the form each time the panel opens
  useEffect(() => {
    if (!open || !data) return;
    const cid = cohort?.courseId || courseId || suggestCourseId || "";
    const c = data.byId.course[cid];
    if (cohort) {
      setF({ courseId: cid, sessions: cohort.sessions.map((s) => ({ ...s })), tutorId: cohort.tutorId || "", venueId: cohort.venueId || "", pricing: cohort.packageId ? "package" : "flat", price: String(cohort.price ?? ""), packageId: cohort.packageId || "", max: String(cohort.max), details: cohort.details || "" });
      setView(monthStart(cohort.first || todayIso()));
    } else {
      setF(blankFor(c));
      setView(monthStart(todayIso()));
    }
    setErrors({});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- fill once per opening

  const blankFor = (c) => ({
    courseId: c?.id || "",
    sessions: [],
    tutorId: "",
    venueId: c?.format === "classroom" ? (c.venues.find((v) => data.byId.venue[v]?.active) || "") : "",
    pricing: c?.pricing.type === "tiered" ? "package" : "flat",
    price: c?.pricing.type === "flat" && c.pricing.price ? String(c.pricing.price) : "",
    packageId: c?.pricing.type === "tiered" ? c.pricing.packageId : "",
    max: "12",
    details: "",
  });

  const ready = Boolean(open && data && f);
  const course = ready ? data.byId.course[f.courseId] : null;
  const booked = cohort?.booked || 0;
  const today = todayIso();
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  // a day on the calendar: add a slot (copying the latest slot's times and length) or take it away
  const toggleDay = (iso) => {
    setF((x) => {
      const has = x.sessions.find((s) => s.date === iso);
      if (has) return { ...x, sessions: x.sessions.filter((s) => s !== has) };
      const latest = x.sessions[x.sessions.length - 1];
      const span = latest ? Math.max(0, daysBetween(latest.date, latest.end || latest.date)) : 0;
      const slot = { date: iso, end: addDays(iso, span), from: latest?.from || DEFAULT_SLOT.from, to: latest?.to || DEFAULT_SLOT.to };
      return { ...x, sessions: [...x.sessions, slot] };
    });
    setErrors((e) => ({ ...e, sessions: undefined }));
  };
  const setSlot = (i, patch) => setF((x) => ({ ...x, sessions: x.sessions.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const save = (e) => {
    e.preventDefault();
    const err = {};
    if (!f.courseId) err.courseId = "Choose the course this cohort is for.";
    if (!f.sessions.length) err.sessions = "Pick at least one date on the calendar.";
    f.sessions.forEach((s, i) => {
      if (!s.date) err[`d${i}`] = "Enter the start date.";
      else if (!cohort && s.date < today) err[`d${i}`] = "The start date can't be in the past.";
      else if ((s.end || s.date) < s.date) err[`d${i}`] = "The end date can't be before the start date.";
      else if ((s.end || s.date) === s.date && s.to <= s.from) err[`d${i}`] = "The end time must be after the start time.";
    });
    if (course?.format === "classroom" && !f.venueId) err.venueId = "Choose the venue.";
    if (f.pricing === "flat") {
      const p = Number(f.price);
      if (f.price === "" || !Number.isFinite(p) || p < 1) err.price = "Enter the price per learner in pounds, like 95.";
    } else if (!f.packageId) err.packageId = "Choose a price package.";
    const m = Number(f.max);
    if (!Number.isInteger(m) || m < 1 || m > 200) err.max = "Enter a whole number from 1 to 200.";
    else if (m < booked) err.max = `${booked} learners are already booked, so the most you can set is no lower than ${booked}.`;
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(formRef.current);
    const sessions = [...f.sessions].map((s) => ({ ...s, end: s.end || s.date })).sort((a, b) => a.date.localeCompare(b.date));
    const pack = f.pricing === "package" ? data.byId.pack[f.packageId] : null;
    const id = saveCohort({
      ...(cohort ? { id: cohort.id } : {}),
      courseId: f.courseId,
      sessions,
      tutorId: f.tutorId,
      venueId: course?.format === "classroom" ? f.venueId : "",
      price: pack ? pack.tiers.saver.price : Number(f.price),
      packageId: pack ? pack.id : "",
      max: m,
      details: f.details.trim(),
    });
    onSaved?.(id);
  };

  const err = (key) => errors[key] && <p className="rt-q__err" id={`rt-cf-${key}-e`}><span className="rt-sr">Error: </span>{errors[key]}</p>;
  const aria = (key) => ({ "aria-invalid": errors[key] ? true : undefined, "aria-describedby": errors[key] ? `rt-cf-${key}-e` : undefined });

  const datedCourses = data ? data.courses.filter((c) => c.format !== "on-demand") : [];
  const packages = data ? data.packages.filter((p) => p.active || p.id === f?.packageId) : [];
  const canPackage = course?.pricing.type === "tiered" || packages.length > 0;
  const tutors = data ? data.team.filter((t) => t.status === "active") : [];
  const venues = data ? data.venues.filter((v) => v.active || v.id === f?.venueId) : [];
  const ordered = ready ? f.sessions.map((s, i) => ({ s, i })).sort((a, b) => a.s.date.localeCompare(b.s.date)) : [];

  return (
    <Sheet open={open} onClose={onClose} title={cohort ? "Edit cohort" : "Create cohort"} closeLabel="Close" className="rt-pws-coh__sheet">
      {ready && (
        <form className="rt-q__form rt-pws-coh__form" onSubmit={save} noValidate ref={formRef}>
          {!courseId && !cohort ? (
            <div className="rt-field">
              <label htmlFor="rt-cf-course">Course</label>
              {err("courseId")}
              <select id="rt-cf-course" value={f.courseId} onChange={(e) => { const c = data.byId.course[e.target.value]; setF((x) => ({ ...blankFor(c), sessions: x.sessions })); }} autoComplete="off" {...aria("courseId")}>
                <option value="">Choose a course</option>
                {datedCourses.map((c) => <option key={c.id} value={c.id}>{c.title || "Untitled course"} ({pw.formats.find((x) => x.key === c.format)?.short})</option>)}
              </select>
            </div>
          ) : (
            <p className="rt-acc__note rt-pws-coh__for">For <b>{course?.title || "Untitled course"}</b> · {pw.formats.find((x) => x.key === course?.format)?.short}</p>
          )}

          <div className="rt-pws-coh__dates">
            <section className="rt-pws-coh__slots" aria-labelledby="rt-cf-slots-h">
              <h3 className="rt-pws-coh__h3" id="rt-cf-slots-h">Selected dates</h3>
              <p className="rt-acc__note">Pick days on the calendar. Times are copied from the latest date.</p>
              {err("sessions")}
              {ordered.length === 0 ? (
                <p className="rt-pws-coh__noslot">No dates picked yet.</p>
              ) : (
                <ol className="rt-pws-coh__slotlist">
                  {ordered.map(({ s, i }, n) => (
                    <li key={`${s.date}-${i}`} className="rt-pws-coh__slot">
                      <div className="rt-pws-coh__slothead">
                        <b>Session {n + 1}</b>
                        <button type="button" className="rt-pws-coh__remove" onClick={() => setF((x) => ({ ...x, sessions: x.sessions.filter((_, j) => j !== i) }))}>Remove<span className="rt-sr"> session {n + 1}</span></button>
                      </div>
                      {err(`d${i}`)}
                      <div className="rt-pws-coh__slotgrid">
                        <div className="rt-field">
                          <label htmlFor={`rt-cf-s${i}`}>Starts</label>
                          <input id={`rt-cf-s${i}`} type="date" value={s.date} min={cohort ? undefined : today} onChange={(e) => setSlot(i, { date: e.target.value, end: !s.end || s.end < e.target.value ? e.target.value : s.end })} autoComplete="off" {...aria(`d${i}`)} />
                        </div>
                        <div className="rt-field">
                          <label htmlFor={`rt-cf-e${i}`}>Ends</label>
                          <input id={`rt-cf-e${i}`} type="date" value={s.end || s.date} min={s.date} onChange={(e) => setSlot(i, { end: e.target.value })} autoComplete="off" />
                        </div>
                        <div className="rt-field">
                          <label htmlFor={`rt-cf-f${i}`}>From</label>
                          <select id={`rt-cf-f${i}`} value={s.from} onChange={(e) => setSlot(i, { from: e.target.value })} autoComplete="off">{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                        </div>
                        <div className="rt-field">
                          <label htmlFor={`rt-cf-t${i}`}>To</label>
                          <select id={`rt-cf-t${i}`} value={s.to} onChange={(e) => setSlot(i, { to: e.target.value })} autoComplete="off">{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <DatePicker view={view} setView={setView} picked={f.sessions.map((s) => s.date)} onPick={toggleDay} min={cohort ? "" : today} />
          </div>

          <section className="rt-pws-coh__settings" aria-labelledby="rt-cf-set-h">
            <h3 className="rt-pws-coh__h3" id="rt-cf-set-h">Cohort settings</h3>
            <div className="rt-pws-coh__setgrid">
              <div className="rt-field">
                <label htmlFor="rt-cf-tutor">Tutor</label>
                <select id="rt-cf-tutor" value={f.tutorId} onChange={(e) => set({ tutorId: e.target.value })} autoComplete="off">
                  <option value="">Not assigned</option>
                  {tutors.map((t) => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
                </select>
              </div>
              {course?.format === "classroom" && (
                <div className="rt-field">
                  <label htmlFor="rt-cf-venueId">Venue</label>
                  {err("venueId")}
                  <select id="rt-cf-venueId" value={f.venueId} onChange={(e) => set({ venueId: e.target.value })} autoComplete="off" {...aria("venueId")}>
                    <option value="">Choose a venue</option>
                    {venues.map((v) => <option key={v.id} value={v.id}>{v.name}, {v.city}</option>)}
                  </select>
                  <Link href="/provider/settings?tab=venues" className="rt-pws-coh__hintlink">Add a venue</Link>
                </div>
              )}
            </div>
            {canPackage && (
              <Choice name="rt-cf-pricing" legend="Pricing" value={f.pricing} onChange={(v) => set({ pricing: v })} options={[{ value: "flat", label: "One price" }, { value: "package", label: "Price package (Saver, Flexi, Premium)" }]} />
            )}
            <div className="rt-pws-coh__setgrid">
              {f.pricing === "flat" || !canPackage ? (
                <div className="rt-field">
                  <label htmlFor="rt-cf-price">Price per learner (£)</label>
                  {err("price")}
                  <input id="rt-cf-price" type="number" inputMode="decimal" min="1" step="1" value={f.price} onChange={(e) => set({ price: e.target.value })} autoComplete="off" {...aria("price")} />
                </div>
              ) : (
                <div className="rt-field">
                  <label htmlFor="rt-cf-packageId">Price package</label>
                  {err("packageId")}
                  <select id="rt-cf-packageId" value={f.packageId} onChange={(e) => set({ packageId: e.target.value })} autoComplete="off" {...aria("packageId")}>
                    <option value="">Choose a package</option>
                    {packages.map((p) => <option key={p.id} value={p.id}>{p.name || "Untitled package"} (from {formatPrice(p.tiers.saver.price)})</option>)}
                  </select>
                </div>
              )}
              <div className="rt-field">
                <label htmlFor="rt-cf-max">Most learners</label>
                {err("max")}
                <input id="rt-cf-max" type="number" inputMode="numeric" min={Math.max(1, booked)} max="200" step="1" value={f.max} onChange={(e) => set({ max: e.target.value })} autoComplete="off" {...aria("max")} />
                {booked > 0 && <p className="rt-acc__note">{booked} already booked.</p>}
              </div>
            </div>
            <div className="rt-field">
              <label htmlFor="rt-cf-details">Additional details (optional)</label>
              <p className="rt-acc__note" id="rt-cf-details-h">Shown to learners under the course dates, for example what to bring or where to park.</p>
              <textarea id="rt-cf-details" rows={3} maxLength={500} value={f.details} onChange={(e) => set({ details: e.target.value })} aria-describedby="rt-cf-details-h" autoComplete="off" />
            </div>
          </section>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{cohort ? "Save changes" : "Save cohort"}</button>
        </form>
      )}
    </Sheet>
  );
}

// Two months of days. Arrow keys move between days (one tab stop for the whole calendar); Enter or Space picks.
function DatePicker({ view, setView, picked, onPick, min }) {
  const today = todayIso();
  const [focusDay, setFocusDay] = useState(null);
  const gridRef = useRef(null);
  const months = [view, addMonths(view, 1)];
  const active = focusDay || (picked.length ? [...picked].sort()[0] : today);
  const shown = (iso) => iso >= view && iso < addMonths(view, 2);
  const tabDay = shown(active) ? active : view;

  useEffect(() => {
    if (!focusDay) return;
    gridRef.current?.querySelector(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, view]);

  const move = (e, iso) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = addDays(iso, step);
    if (next < view) setView(addMonths(view, -1));
    else if (next >= addMonths(view, 2)) setView(addMonths(view, 1));
    setFocusDay(next);
  };

  return (
    <div className="rt-pws-coh__picker" ref={gridRef}>
      <div className="rt-pws-coh__pickhead">
        <button type="button" className="rt-pws-cal__nav" onClick={() => setView(addMonths(view, -1))} disabled={Boolean(min) && view <= monthStart(min)} aria-label="Previous month"><i className="icon-chevron-left text-12" aria-hidden="true"></i></button>
        <p className="rt-pws-coh__pickhint">Select dates to add them to the cohort</p>
        <button type="button" className="rt-pws-cal__nav" onClick={() => setView(addMonths(view, 1))} aria-label="Next month"><i className="icon-chevron-right text-12" aria-hidden="true"></i></button>
      </div>
      <div className="rt-pws-coh__months">
        {months.map((m) => {
          const lead = weekday(m);
          const len = daysBetween(m, addMonths(m, 1));
          const cells = [...Array(lead).fill(null), ...Array.from({ length: len }, (_, i) => addDays(m, i))];
          const weeks = [];
          for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
          return (
            <table key={m} className="rt-pws-coh__month">
              <caption>{monthLabel(m)}</caption>
              <thead><tr>{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <th key={d} scope="col"><abbr title={d}>{d}</abbr></th>)}</tr></thead>
              <tbody>
                {weeks.map((w, wi) => (
                  <tr key={wi}>
                    {Array.from({ length: 7 }, (_, di) => {
                      const iso = w[di];
                      if (!iso) return <td key={di}></td>;
                      const on = picked.includes(iso);
                      const past = Boolean(min) && iso < min;
                      return (
                        <td key={di}>
                          <button
                            type="button"
                            data-day={iso}
                            className={`rt-pws-coh__day${on ? " is-on" : ""}${iso === today ? " is-today" : ""}`}
                            aria-pressed={on}
                            aria-label={`${longDay(iso)}${iso === today ? ", today" : ""}`}
                            disabled={past}
                            tabIndex={iso === tabDay ? 0 : -1}
                            onClick={() => { setFocusDay(iso); onPick(iso); }}
                            onKeyDown={(e) => move(e, iso)}
                          >
                            {Number(iso.slice(8))}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
    </div>
  );
}
