"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { canDeleteCohort, cancelCohort, deleteCohort, moveCohort, saveCohort, setCohortEnabled, setCohortStatus, setCohortTutor, todayIso, toggleFavourite, useProvider } from "@/lib/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { COHORT_TONE, CardChoice, Choice, Loading, Pill, RowMenu, Search, Tabs, ToolSelect, getQuery, setQuery, shortDay } from "./providerParts";
import CataloguePagination from "@/components/courses/CataloguePagination";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { METHOD_ALIASES, methodName } from "@/lib/taxonomy";
import { EmptyState } from "@/components/states/States";

// Cohorts: every run of a course, as Hurak's cohort list: the cohort (date, course, venue, dates and times), its status (set here by
// hand), its instructor (assigned here), students (booked of places, with enrolled / rescheduled / cancelled), whether it takes
// bookings (Enabled / Disabled), a favourite star and a row menu (View, Move to another course, Edit, Delete). Filtered by delivery,
// course, date, status, venue, tutor and when, with a search; 10 a page. Rows can be picked for bulk actions (email joining
// instructions, cancel upcoming runs). Filters are kept in the address. The Self-paced tab lists the self-paced courses (they have
// no dates: learners start when they book). CohortForm (named export) is the create and edit panel: dates picked on a two-month
// calendar become session slots.

const MODES = [
  { key: "all", label: "All" },
  { key: "classroom", label: "Classroom" },
  { key: "live-online", label: "Live online" },
  { key: "self-paced", label: "Self-paced" },
];
const WHEN = [
  { value: "upcoming", label: "Upcoming and in progress" },
  { value: "past", label: "Past" },
  { value: "all", label: "Any date" },
];
const ONLINE = "Online";
const PER_PAGE = 10;
const monthShortFmt = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const monthShort = (iso) => monthShortFmt.format(new Date(`${iso}T00:00:00Z`));

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

export default function ProviderCohorts() {
  const data = useProvider();
  const [mode, setMode] = useState("all");
  const [course, setCourse] = useState("");
  const [status, setStatus] = useState("");
  const [venue, setVenue] = useState("");
  const [tutor, setTutor] = useState("");
  const [when, setWhen] = useState("upcoming");
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [moving, setMoving] = useState(null);
  const [moveTo, setMoveTo] = useState("");
  const [editingK, setEditingK] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [cancelOne, setCancelOne] = useState(null);
  const [picked, setPicked] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const m = METHOD_ALIASES[getQuery("mode")] || getQuery("mode"); // old ?mode=on-demand links
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
    if (getQuery("new") === "1") setFormOpen(true); // "Create cohort" from the dashboard
    const d = getQuery("date");
    if (/^\d{4}-\d{2}-\d{2}$/.test(d || "")) { setDate(d); setWhen("all"); }
  }, []);

  // any filter change starts again at page 1
  useEffect(() => setPage(1), [mode, course, status, venue, tutor, when, q, date]);

  const keep = (key, value, fallback = "") => setQuery(key, value === fallback ? "" : value);

  if (!data) return <Loading rows={2} />;
  const { byId, today } = data;
  const scoped = data.cohorts;
  const datedCourses = data.courses.filter((c) => c.format !== "self-paced");
  const onDemand = data.courses.filter((c) => c.format === "self-paced");

  const needle = q.trim().toLowerCase();
  const list = scoped
    .filter((k) => mode === "all" || mode === "self-paced" || k.course?.format === mode)
    .filter((k) => !course || k.courseId === course)
    .filter((k) => !status || k.status === status)
    .filter((k) => !venue || (venue === "online" ? !k.venueId : k.venueId === venue))
    .filter((k) => !tutor || (tutor === "none" ? !k.tutorId : k.tutorId === tutor))
    .filter((k) => when === "all" || (when === "upcoming" ? k.last >= today : k.last < today))
    .filter((k) => !date || (k.first <= date && k.last >= date))
    .filter((k) => !needle || `${k.course?.title} ${k.venue?.name || ONLINE} ${k.venue?.city || ""} ${k.tutor?.name || ""}`.toLowerCase().includes(needle))
    .sort((a, b) => (when === "past" ? b.first.localeCompare(a.first) : a.first.localeCompare(b.first)));

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const at = Math.min(page, pages);
  const pageRows = list.slice((at - 1) * PER_PAGE, at * PER_PAGE);
  const visibleIds = pageRows.map((k) => k.id);
  const pickedHere = picked.filter((id) => visibleIds.includes(id));
  const allPicked = list.length > 0 && pickedHere.length === list.length;
  const pickedRows = pickedHere.map((id) => byId.cohort[id]);
  const cancellable = pickedRows.filter((k) => k.status === "upcoming");
  const learnersIn = (rows) => rows.filter((k) => !k.cancelled).reduce((n, k) => n + k.booked, 0);
  const filtered = Boolean(status || venue || tutor || needle || date || course || mode !== "all" || when !== "upcoming");

  const clear = () => {
    setMode("all");
    setCourse("");
    setStatus("");
    setVenue("");
    setTutor("");
    setWhen("upcoming");
    setQ("");
    setDate("");
    setPage(1);
    ["mode", "course", "status", "venue", "tutor", "when", "q", "date"].forEach((k) => keep(k, ""));
  };
  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const sendJoining = () => {
    const n = learnersIn(pickedRows);
    setToast({ message: n ? `Joining instructions sent to ${n} ${n === 1 ? "learner" : "learners"}` : "No learners booked on the cohorts you picked" });
    setPicked([]);
  };
  // the cohort status set by hand; Cancelled asks first (learners are told)
  const changeStatus = (k, v) => {
    if (v === k.status) return;
    if (v === "cancelled") return setCancelOne(k);
    setCohortStatus(k.id, v);
    setToast({ message: `Cohort status changed to ${pw.cohortStatuses[v]}` });
  };
  const sameFormat = (k) => data.courses.filter((c) => c.id !== k.courseId && c.format === k.course?.format);
  const doMove = () => {
    moveCohort(moving.id, moveTo);
    setToast({ message: `Cohort moved to ${byId.course[moveTo]?.title || "the other course"}` });
    setMoving(null);
  };
  const doDelete = () => {
    deleteCohort(deleting.id);
    setDeleting(null);
    setToast({ message: "Cohort deleted" });
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
        <EmptyState
          title="No cohorts yet"
          text="A cohort is one run of a course on set dates. Add one to start taking bookings."
          action={datedCourses.length ? { label: "Create cohort", onClick: () => setFormOpen(true) } : { label: "Create a course first", href: "/provider/courses/new" }}
        />
      ) : (
        <>
          <div className="rt-adm-toolbar">
            <Tabs tabs={MODES.map((m) => ({ ...m, count: m.key === "self-paced" ? onDemand.length : scoped.filter((k) => m.key === "all" || k.course?.format === m.key).length }))} value={mode} onChange={(v) => { setMode(v); keep("mode", v, "all"); }} label="Delivery" />
            {create}
          </div>
          {mode !== "self-paced" && (
            <div className="rt-adm-toolbar rt-pws-coh__filters">
              <div className="rt-adm-toolbar__end">
                <ToolSelect id="rt-coh-course" label="Course" value={course} onChange={(v) => { setCourse(v); keep("course", v); }} options={[{ value: "", label: "All courses" }, ...datedCourses.map((c) => ({ value: c.id, label: c.title || "Untitled course" }))]} />
                <ToolSelect id="rt-coh-when" label="When" value={when} onChange={(v) => { setWhen(v); keep("when", v, "upcoming"); setPage(1); }} options={WHEN} />
                <div className="rt-field rt-adm-select -inline rt-pws-coh__datefilter">
                  <label htmlFor="rt-coh-date" className="rt-sr">Cohorts running on this date</label>
                  <input id="rt-coh-date" type="date" value={date} onChange={(e) => { const v = e.target.value; setDate(v); keep("date", v); if (v) { setWhen("all"); keep("when", "all", "upcoming"); } setPage(1); }} aria-label="Cohorts running on this date" />
                </div>
                <ToolSelect id="rt-coh-status" label="Status" value={status} onChange={(v) => { setStatus(v); keep("status", v); if (v) { setWhen("all"); keep("when", "all", "upcoming"); } }} options={[{ value: "", label: "All statuses" }, ...Object.entries(pw.cohortStatuses).map(([value, label]) => ({ value, label }))]} />
                <ToolSelect id="rt-coh-venue" label="Venue" value={venue} onChange={(v) => { setVenue(v); keep("venue", v); }} options={[{ value: "", label: "All venues" }, ...data.venues.map((v) => ({ value: v.id, label: v.name })), { value: "online", label: ONLINE }]} />
                <ToolSelect id="rt-coh-tutor" label="Tutor" value={tutor} onChange={(v) => { setTutor(v); keep("tutor", v); }} options={[{ value: "", label: "All tutors" }, ...tutors.map((t) => ({ value: t.id, label: t.name || t.email })), { value: "none", label: "Not assigned" }]} />
              </div>
              <Search value={q} onChange={(v) => { setQ(v); keep("q", v.trim()); }} label="Search course, venue or tutor" />
            </div>
          )}

          {pickedHere.length > 0 && (
            <div className="rt-acc__card rt-pws-coh__bulk" role="region" aria-label="Picked cohorts">
              <span className="rt-pws-coh__bulkn">{pickedHere.length} picked</span>
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={sendJoining}>Email joining instructions</button>
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setConfirm(true)} disabled={!cancellable.length}>Cancel cohorts</button>
              <button type="button" className="rt-pws-coh__clear" onClick={() => setPicked([])}>Clear</button>
            </div>
          )}

          <p className="rt-sr" aria-live="polite">{mode === "self-paced" ? `${onDemand.length} self-paced ${onDemand.length === 1 ? "course" : "courses"}` : `${list.length} ${list.length === 1 ? "cohort" : "cohorts"}`}</p>
          {mode === "self-paced" ? (
            onDemand.length ? (
              <div className="rt-acc__card rt-biz__tablecard">
                <p className="rt-acc__note">On-demand courses have no dates: learners start as soon as they book.</p>
                <table className="rt-biz__table rt-adm-table">
                  <thead><tr><th scope="col">Course</th><th scope="col">Students</th><th scope="col">Price</th><th scope="col">Course status</th><th scope="col"><span className="rt-sr">Actions</span></th></tr></thead>
                  <tbody>
                    {onDemand.map((c) => {
                      const students = new Set(data.enrolments.filter((e) => e.courseId === c.id && e.status !== "cancelled").map((e) => e.learnerId)).size;
                      return (
                        <tr key={c.id}>
                          <td data-label="Course"><Link href={`/provider/courses/${c.id}`} className="rt-adm-strong">{c.title || "Untitled course"}</Link></td>
                          <td data-label="Students">{students}</td>
                          <td data-label="Price">{c.pricing.type === "free" ? "Free" : c.pricing.type === "tiered" ? `From ${formatPrice(byId.pack[c.pricing.packageId]?.tiers.saver.price || 0)}` : formatPrice(c.pricing.price || 0)}</td>
                          <td data-label="Course status"><Pill tone={c.status === "approved" ? "ok" : c.status === "draft" ? "muted" : "warn"}>{pw.courseStatuses[c.status]}</Pill></td>
                          <td data-label="Actions"><RowMenu label={`Actions for ${c.title || "untitled course"}`} items={[{ label: "Course activities", href: `/provider/courses/${c.id}?tab=activities` }, { label: "Course pricing", href: `/provider/courses/${c.id}?tab=pricing` }]} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState title="No self-paced courses yet." />
          ) : list.length ? (
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
                    <th scope="col">Cohorts</th>
                    <th scope="col">Cohort status</th>
                    <th scope="col">Instructor</th>
                    <th scope="col">Students</th>
                    <th scope="col">Status</th>
                    <th scope="col"><span className="rt-sr">Favourite</span></th>
                    <th scope="col"><span className="rt-sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((k) => {
                    const s0 = k.sessions[0];
                    const title = k.course?.title || "Untitled course";
                    const name = `${title}, ${dayRange(k.first, k.last)}`;
                    return (
                      <tr key={k.id} className={picked.includes(k.id) ? "is-picked" : undefined}>
                        <td data-label="Pick" className="rt-pws-coh__pick">
                          <label className="rt-pws-coh__check">
                            <input type="checkbox" className="rt-fp__check" checked={picked.includes(k.id)} onChange={() => togglePick(k.id)} />
                            <span className="rt-sr">Pick {name}</span>
                          </label>
                        </td>
                        <td data-label="Cohort">
                          <div className="rt-pws-coh__cohort">
                            <span className="rt-pws-coh__date" aria-hidden="true"><small>{monthShort(k.first)}</small><b>{k.first.slice(8)}</b></span>
                            <div>
                              <Link href={`/provider/cohorts/${k.id}`} className="rt-adm-strong">{title}</Link>
                              <small>{k.venue ? k.venue.name : ONLINE}</small>
                              <small>{dayRange(k.first, k.last)}{s0 ? ` from ${s0.from} to ${s0.to}` : ""}{k.sessions.length > 1 ? ` · ${k.sessions.length} sessions` : ""}</small>
                            </div>
                          </div>
                        </td>
                        <td data-label="Cohort status">
                          {k.cancelled ? <Pill tone={COHORT_TONE.cancelled}>{pw.cohortStatuses.cancelled}</Pill> : (
                            <div className="rt-field rt-adm-select -inline">
                              <label htmlFor={`rt-coh-st-${k.id}`} className="rt-sr">Cohort status for {name}</label>
                              <FieldSelect id={`rt-coh-st-${k.id}`} label={`Cohort status for ${name}`} value={k.status} onChange={(v) => changeStatus(k, v)} options={Object.entries(pw.cohortStatuses).map(([value, label]) => ({ value, label }))} compact />
                            </div>
                          )}
                        </td>
                        <td data-label="Instructor">
                          <div className="rt-field rt-adm-select -inline">
                            <label htmlFor={`rt-coh-tu-${k.id}`} className="rt-sr">Instructor for {name}</label>
                            <FieldSelect id={`rt-coh-tu-${k.id}`} label={`Instructor for ${name}`} value={k.tutorId || ""} onChange={(v) => { setCohortTutor(k.id, v); setToast({ message: v ? `${byId.member[v]?.name || "Instructor"} assigned` : "Instructor removed" }); }} options={[{ value: "", label: "Unassigned" }, ...tutors.map((t) => ({ value: t.id, label: t.name || t.email }))]} disabled={k.cancelled} compact />
                          </div>
                        </td>
                        <td data-label="Students">
                          <Seats booked={k.booked} max={k.max} />
                          <small className="rt-pws-coh__places">{`${k.places.enrolled} enrolled · ${k.places.rescheduled} rescheduled · ${k.places.cancelled} cancelled`}</small>
                        </td>
                        <td data-label="Status"><Pill tone={k.disabled ? "muted" : "ok"}>{k.disabled ? "Disabled" : "Enabled"}</Pill></td>
                        <td data-label="Favourite">
                          <button type="button" className={`rt-pws-coh__fav${k.favourite ? " is-on" : ""}`} aria-pressed={Boolean(k.favourite)} onClick={() => toggleFavourite(k.id)}>
                            <i className="icon-star" aria-hidden="true"></i><span className="rt-sr">Favourite: {name}</span>
                          </button>
                        </td>
                        <td data-label="Actions">
                          <RowMenu label={`Actions for ${name}`} items={[
                            { label: "View", href: `/provider/cohorts/${k.id}` },
                            ...(k.cancelled ? [] : [{ label: "Move", onClick: () => setMoving(k) }, { label: "Edit", onClick: () => setEditingK(k) }, { label: k.disabled ? "Enable bookings" : "Disable bookings", onClick: () => { setCohortEnabled(k.id, k.disabled); setToast({ message: k.disabled ? "Bookings enabled" : "Bookings disabled" }); } }]),
                            { label: "Delete", onClick: () => setDeleting(k), danger: true },
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {pages > 1 && <div className="rt-pws-coh__pages"><CataloguePagination page={at} totalPages={pages} hrefFor={(p) => `?page=${p}`} onNavigate={setPage} /></div>}
            </div>
          ) : (
            <EmptyState title="No cohorts match these filters." action={filtered ? { label: "Clear filters", onClick: clear } : null} />
          )}
        </>
      )}

      <CohortForm open={formOpen} onClose={() => setFormOpen(false)} suggestCourseId={course} mode={mode} onSaved={(id) => { setFormOpen(false); setToast({ message: "Cohort saved", href: `/provider/cohorts/${id}`, label: "Open" }); }} onAnother={() => setToast({ message: "Cohort saved. Pick the dates for the next one." })} />
      <CohortForm open={Boolean(editingK)} onClose={() => setEditingK(null)} cohort={editingK} onSaved={() => { setEditingK(null); setToast({ message: "Cohort saved" }); }} />

      <Sheet open={Boolean(moving)} onClose={() => setMoving(null)} title="Move cohort" closeLabel="Close">
        {moving && (
          <div className="rt-q__form">
            <p className="rt-acc__note">Move {moving.course?.title || "this cohort"}, {dayRange(moving.first, moving.last)}, and the {moving.booked} {moving.booked === 1 ? "learner" : "learners"} booked on it to another {methodName(moving.course?.format).toLowerCase()} course.</p>
            {sameFormat(moving).length ? (
              <>
                <div className="rt-field">
                  <label htmlFor="rt-coh-moveto">Select course</label>
                  <FieldSelect id="rt-coh-moveto" label="Select course" placeholder="Select course" value={moveTo} onChange={setMoveTo} options={sameFormat(moving).map((c) => ({ value: c.id, label: c.title || "Untitled course" }))} />
                </div>
                <div className="rt-pws-coh__actions">
                  <button type="button" className="button -md -purple-1 text-white" onClick={doMove} disabled={!moveTo}>Save changes</button>
                  <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setMoving(null)}>Cancel</button>
                </div>
              </>
            ) : <p className="rt-acc__note">You have no other course of this type to move it to.</p>}
          </div>
        )}
      </Sheet>

      <Sheet open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete this cohort?" closeLabel="Close">
        {deleting && (
          <div className="rt-q__form">
            {canDeleteCohort(data, deleting.id) ? (
              <>
                <p className="rt-acc__note">{deleting.course?.title}, {dayRange(deleting.first, deleting.last)}, is removed for good. Nobody is booked on it.</p>
                <div className="rt-pws-coh__actions">
                  <button type="button" className="button -md -purple-1 text-white" onClick={doDelete}>Delete cohort</button>
                  <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setDeleting(null)}>Keep it</button>
                </div>
              </>
            ) : (
              <>
                <p className="rt-acc__note">{deleting.booked} {deleting.booked === 1 ? "learner is" : "learners are"} booked on this cohort, so it can't be deleted. Set its status to Cancelled instead: they are told and offered another date or a refund.</p>
                <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setDeleting(null)}>Close</button>
              </>
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={Boolean(cancelOne)} onClose={() => setCancelOne(null)} title="Cancel this cohort?" closeLabel="Close">
        {cancelOne && (
          <div className="rt-q__form">
            <p className="rt-acc__note">{cancelOne.booked ? `The ${cancelOne.booked} booked ${cancelOne.booked === 1 ? "learner is" : "learners are"} told straight away and offered another date or a full refund.` : "Nobody is booked yet, so nobody needs to be told."} This can't be undone.</p>
            <div className="rt-pws-coh__actions">
              <button type="button" className="button -md -purple-1 text-white" onClick={() => { cancelCohort(cancelOne.id); setCancelOne(null); setToast({ message: "Cohort cancelled" }); }}>Cancel cohort</button>
              <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setCancelOne(null)}>Keep it</button>
            </div>
          </div>
        )}
      </Sheet>

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

// The panel for one cohort. `cohort` (a derived cohort) edits it; otherwise it creates one, asking which course.
// `mode` (the list's Classroom / Live online tab) picks the mode of study the form starts on, as Hurak has a form for each.
export function CohortForm({ open, onClose, suggestCourseId = "", mode = "", cohort = null, onSaved, onAnother }) {
  const data = useProvider();
  const formRef = useRef(null);
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  const [view, setView] = useState(() => monthStart(todayIso()));
  const [studyMode, setStudyMode] = useState("classroom");

  // fill the form each time the panel opens
  useEffect(() => {
    if (!open || !data) return;
    const cid = cohort?.courseId || suggestCourseId || "";
    const c = data.byId.course[cid];
    if (cohort) {
      setF({ courseId: cid, sessions: cohort.sessions.map((s) => ({ ...s })), tutorId: cohort.tutorId || "", venueId: cohort.venueId || "", pricing: cohort.packageId ? "package" : "flat", price: String(cohort.price ?? ""), packageId: cohort.packageId || "", max: String(cohort.max), details: cohort.details || "", colour: cohort.colour || "purple", lmsFrom: cohort.lmsFrom || "course" });
      setView(monthStart(cohort.first || todayIso()));
    } else {
      setF(blankFor(c));
      setView(monthStart(todayIso()));
      setStudyMode(c?.format || (mode === "live-online" ? "live-online" : "classroom"));
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
    colour: "purple",
    lmsFrom: "course",
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

  // "Save and create another" (Hurak's "Create another cohort"): the form stays open for the same course and settings
  const save = (e, another = false) => {
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
      colour: f.colour,
      lmsFrom: f.lmsFrom,
    });
    if (another) {
      setF((x) => ({ ...x, sessions: [] }));
      setErrors({});
      onAnother?.(id);
      requestAnimationFrame(() => formRef.current?.querySelector("h3")?.scrollIntoView({ block: "start" }));
      return;
    }
    onSaved?.(id);
  };

  const err = (key) => errors[key] && <p className="rt-q__err" id={`rt-cf-${key}-e`}><span className="rt-sr">Error: </span>{errors[key]}</p>;
  const aria = (key) => ({ "aria-invalid": errors[key] ? true : undefined, "aria-describedby": errors[key] ? `rt-cf-${key}-e` : undefined });

  const datedCourses = data ? data.courses.filter((c) => c.format === studyMode) : [];
  const packages = data ? data.packages.filter((p) => p.active || p.id === f?.packageId) : [];
  const canPackage = course?.pricing.type === "tiered" || packages.length > 0;
  const tutors = data ? data.team.filter((t) => t.status === "active") : [];
  const venues = data ? data.venues.filter((v) => v.active || v.id === f?.venueId) : [];
  const ordered = ready ? f.sessions.map((s, i) => ({ s, i })).sort((a, b) => a.s.date.localeCompare(b.s.date)) : [];
  const lmsCohorts = ready ? data.cohorts.filter((k) => k.courseId === f.courseId && k.id !== cohort?.id && !k.cancelled) : [];

  return (
    <Sheet open={open} onClose={onClose} title={cohort ? "Edit cohort" : "Create cohort"} closeLabel="Close" className="rt-pws-coh__sheet">
      {ready && (
        <form className="rt-q__form rt-pws-coh__form" onSubmit={save} noValidate ref={formRef}>
          {!cohort && (
            <Choice name="rt-cf-mode" legend="Mode of study" value={studyMode} onChange={(v) => { setStudyMode(v); setF((x) => ({ ...blankFor(null), sessions: x.sessions })); }}
              options={pw.formats.filter((x) => x.key !== "self-paced").map((x) => ({ value: x.key, label: methodName(x.key) }))} />
          )}
          {!cohort ? (
            <div className="rt-field">
              <label htmlFor="rt-cf-course">Course</label>
              {err("courseId")}
              <FieldSelect id="rt-cf-course" label="Course" value={f.courseId} onChange={(value) => { const c = data.byId.course[value]; setF((x) => ({ ...blankFor(c), sessions: x.sessions })); }} options={datedCourses.map((c) => ({ value: c.id, label: c.title || "Untitled course" }))} placeholder={datedCourses.length ? "Choose a course" : `No ${methodName(studyMode).toLowerCase()} courses yet`} invalid={Boolean(errors.courseId)} describedBy={aria("courseId")["aria-describedby"]} />
            </div>
          ) : (
            <p className="rt-acc__note rt-pws-coh__for">For <b>{course?.title || "Untitled course"}</b> · {methodName(course?.format)}</p>
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
                          <FieldSelect id={`rt-cf-f${i}`} label="From" value={s.from} onChange={(value) => setSlot(i, { from: value })} options={TIMES} />
                        </div>
                        <div className="rt-field">
                          <label htmlFor={`rt-cf-t${i}`}>To</label>
                          <FieldSelect id={`rt-cf-t${i}`} label="To" value={s.to} onChange={(value) => setSlot(i, { to: value })} options={TIMES} />
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
                <FieldSelect id="rt-cf-tutor" label="Tutor" value={f.tutorId} onChange={(value) => set({ tutorId: value })} options={[{ value: "", label: "Not assigned" }, ...tutors.map((t) => ({ value: t.id, label: t.name || t.email }))]} />
              </div>
              {course?.format === "classroom" && (
                <div className="rt-field">
                  <label htmlFor="rt-cf-venueId">Venue</label>
                  {err("venueId")}
                  <FieldSelect id="rt-cf-venueId" label="Venue" placeholder="Choose a venue" value={f.venueId} onChange={(value) => set({ venueId: value })} options={venues.map((v) => ({ value: v.id, label: `${v.name}, ${v.city}` }))} invalid={Boolean(errors.venueId)} describedBy={aria("venueId")["aria-describedby"]} />
                  <Link href={`/provider/courses/${f.courseId}?tab=mode`} className="rt-pws-coh__hintlink">Add a venue to this course</Link>
                </div>
              )}
            </div>
            {canPackage && (
              <CardChoice name="rt-cf-pricing" legend="Pricing" value={f.pricing} onChange={(v) => set({ pricing: v })} options={[{ value: "flat", label: "One price", text: "Every learner pays the same price." }, { value: "package", label: "Price package", text: "Saver, Flexi and Premium options from one of your pricing plans." }]} />
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
                  <FieldSelect id="rt-cf-packageId" label="Price package" placeholder="Choose a package" value={f.packageId} onChange={(value) => set({ packageId: value })} options={packages.map((p) => ({ value: p.id, label: `${p.name || "Untitled package"} (from ${formatPrice(p.tiers.saver.price)})` }))} invalid={Boolean(errors.packageId)} describedBy={aria("packageId")["aria-describedby"]} />
                </div>
              )}
              <div className="rt-field">
                <label htmlFor="rt-cf-max">Most learners</label>
                {err("max")}
                <input id="rt-cf-max" type="number" inputMode="numeric" min={Math.max(1, booked)} max="200" step="1" value={f.max} onChange={(e) => set({ max: e.target.value })} autoComplete="off" {...aria("max")} />
                {booked > 0 && <p className="rt-acc__note">{booked} already booked.</p>}
              </div>
            </div>
            <div className="rt-pws-coh__setgrid">
              <div className="rt-field">
                <label htmlFor="rt-cf-lms">LMS clone</label>
                <p className="rt-acc__note" id="rt-cf-lms-h">Which course activities learners on this cohort get.</p>
                <FieldSelect id="rt-cf-lms" label="LMS clone" value={f.lmsFrom} onChange={(value) => set({ lmsFrom: value })} options={[{ value: "course", label: "The course's activities" }, ...lmsCohorts.map((k) => ({ value: k.id, label: `Copy from the cohort on ${dayRange(k.first, k.last)}` })), { value: "none", label: "No activities" }]} describedBy="rt-cf-lms-h" />
              </div>
              <fieldset className="rt-field rt-pws-coh__colours">
                <legend>Cohort colour</legend>
                <p className="rt-acc__note">How it shows on the calendar.</p>
                <div className="rt-pws-coh__swatches">
                  {pw.cohortColours.map((c) => (
                    <label key={c.key} className={`rt-pws-coh__swatch -c-${c.key}${f.colour === c.key ? " is-on" : ""}`}>
                      <input type="radio" name="rt-cf-colour" className="rt-sr" value={c.key} checked={f.colour === c.key} onChange={() => set({ colour: c.key })} />
                      <span aria-hidden="true"></span><span className="rt-sr">{c.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="rt-field">
              <label htmlFor="rt-cf-details">Cohort structure (optional)</label>
              <p className="rt-acc__note" id="rt-cf-details-h">For example weekends, day release or certain days. Learners see it under the dates.</p>
              <textarea id="rt-cf-details" rows={3} maxLength={500} value={f.details} onChange={(e) => set({ details: e.target.value })} aria-describedby="rt-cf-details-h" autoComplete="off" />
            </div>
          </section>
          <div className="rt-pws-coh__formfoot">
            <button type="submit" className="button -md -purple-1 text-white">{cohort ? "Save changes" : "Save cohort"}</button>
            {!cohort && <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={(e) => save(e, true)}>Save and create another</button>}
          </div>
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
