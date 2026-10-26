"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { COHORT_TONE, Choice, Loading, Pill, RowMenu, Search, Tabs, ToolSelect, getQuery, setQuery, shortDay } from "./providerParts";
import CataloguePagination from "@/components/courses/CataloguePagination";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { METHOD_ALIASES, methodName } from "@/lib/taxonomy";
import { EmptyState, ErrorState } from "@/components/states/States";
import DateField from "@/components/admin/DateField";
import { VenueForm } from "./SettingsProfile";

// Cohorts: every run of a course on set dates, as Hurak's cohort list: the cohort (date, course, venue, dates and times), its status,
// its tutor (assigned here), places, whether it takes bookings, and a row menu (View, Edit, bookings on or off, Cancel, Delete).
// Filtered by delivery, course, date, venue, tutor and when, with a search; 10 a page; filters are kept in the address. The
// Self-paced tab lists the self-paced courses (they have no dates). CohortForm (named export) is the create and edit panel: dates
// picked on a two-month calendar become session slots. Everything comes from the API. Bookings arrive in a later milestone, so
// places booked are 0 for now.

const MODES = [
  { key: "all", label: "All" },
  { key: "classroom", label: "Classroom" },
  { key: "live-online", label: "Live online" },
  // self-paced courses have no dates, so this tab lists courses, not cohorts (its count is not part of All)
  { key: "self-paced", label: "Self-paced courses" },
];
const WHEN = [
  { value: "upcoming", label: "Upcoming and in progress" },
  { value: "past", label: "Past" },
  { value: "all", label: "Any date" },
];
const STATUSES = { upcoming: "Upcoming", progress: "In progress", completed: "Completed", cancelled: "Cancelled" };
const ONLINE = "Online";
const PER_PAGE = 10;
const monthShortFmt = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const monthShort = (iso) => monthShortFmt.format(new Date(`${iso}T00:00:00Z`));

// ---- dates (ISO days, worked out in UTC so they never shift with the clock) ---------------------------------------------------

const toDate = (iso) => new Date(`${iso}T00:00:00Z`);
const toIso = (d) => d.toISOString().slice(0, 10);
// today in the UK (UTC would still be yesterday for an hour after midnight in summer)
export const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
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
// a cohort's status from its dates (cancelled ones stay cancelled)
export const cohortState = (k, today = todayIso()) => (k.cancelledAt ? "cancelled" : k.endsOn < today ? "completed" : k.startsOn <= today ? "progress" : "upcoming");
// "09:30 to 16:30"
export const timeRange = (s) => `${s.from} to ${s.to}`;

// times in 15-minute steps, 06:00 to 22:00
const TIMES = [];
for (let m = 6 * 60; m <= 22 * 60; m += 15) TIMES.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
const DEFAULT_SLOT = { from: "09:30", to: "16:30" };

// The provider's dates, courses, venues and team, from the API (shared by the list, the form and the calendar).
export function useSchedule(when = "upcoming") {
  const { organisationId } = useProviderAccess();
  const on = { enabled: Boolean(organisationId) };
  return {
    cohorts: api.provider.cohorts.list.useQuery({ organisationId, when }, on),
    courses: api.provider.courses.list.useQuery({ organisationId }, on),
    venues: api.provider.venues.list.useQuery({ organisationId }, on),
    tutors: api.provider.cohorts.tutors.useQuery({ organisationId }, { ...on, retry: false }),
  };
}

// the full set of a cohort's values, as the API's update takes them (to change one thing, like the tutor, from the list)
export const cohortInput = (k) => ({
  sessions: k.sessions, venueId: k.venueId, joinUrl: k.joinUrl || "", capacity: k.capacity, pricePence: k.pricePence, wasPricePence: k.wasPricePence,
  details: k.details || "", tutorUserId: k.tutorUserId, bookable: k.bookable,
});

// ---- the list --------------------------------------------------------------------------------------------------------------

export default function ProviderCohorts() {
  const { organisationId, can } = useProviderAccess();
  const [mode, setMode] = useState("all");
  const [course, setCourse] = useState("");
  const [venue, setVenue] = useState("");
  const [tutor, setTutor] = useState("");
  const [when, setWhen] = useState("upcoming");
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  // said under the filters when a date set "When" to Any date, so the change is never silent
  const [whenNote, setWhenNote] = useState("");
  const [page, setPage] = useState(1);
  const [editingK, setEditingK] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [cancelOne, setCancelOne] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const s = useSchedule(when);
  const utils = api.useUtils();
  const update = api.provider.cohorts.update.useMutation();
  const bookable = api.provider.cohorts.setBookable.useMutation();
  const edit = can("provider.cohorts.edit");

  useEffect(() => {
    const m = METHOD_ALIASES[getQuery("mode")] || getQuery("mode"); // old ?mode=on-demand links
    if (MODES.some((x) => x.key === m)) setMode(m);
    const c = getQuery("course");
    if (/^\d+$/.test(c || "")) setCourse(c);
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
  useEffect(() => setPage(1), [mode, course, venue, tutor, when, q, date]);

  const keep = (key, value, fallback = "") => setQuery(key, value === fallback ? "" : value);
  const failed = [s.cohorts, s.courses, s.venues].find((x) => x.isError);
  if (failed) return <ErrorState title="We couldn't load your dates." text="Check your connection, then try again." onRetry={() => failed.refetch()} />;
  if (!s.cohorts.data || !s.courses.data || !s.venues.data) return <Loading rows={2} />;

  const today = todayIso();
  const courses = s.courses.data;
  const courseOf = Object.fromEntries(courses.map((c) => [c.id, c]));
  const tutors = s.tutors.data || [];
  const tutorName = (id) => tutors.find((t) => t.userId === id)?.name;
  const scoped = s.cohorts.data.map((k) => ({ ...k, status: cohortState(k, today), course: courseOf[k.courseId] }));
  const datedCourses = courses.filter((c) => c.method !== "self-paced");
  const onDemand = courses.filter((c) => c.method === "self-paced");

  const needle = q.trim().toLowerCase();
  const list = scoped
    .filter((k) => mode === "all" || mode === "self-paced" || k.method === mode)
    .filter((k) => !course || String(k.courseId) === course)
    .filter((k) => !venue || (venue === "online" ? !k.venueId : k.venueId === venue))
    .filter((k) => !tutor || (tutor === "none" ? !k.tutorUserId : k.tutorUserId === tutor))
    .filter((k) => !date || (k.startsOn <= date && k.endsOn >= date))
    .filter((k) => !needle || `${k.courseTitle} ${k.venue?.name || ONLINE} ${k.venue?.city || ""} ${tutorName(k.tutorUserId) || ""}`.toLowerCase().includes(needle));

  // any filter set (the tab aside), for "Clear filters" under the filters
  const filtersSet = Boolean(course || venue || tutor || date || needle || when !== "upcoming");
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const at = Math.min(page, pages);
  const pageRows = list.slice((at - 1) * PER_PAGE, at * PER_PAGE);
  const filtered = Boolean(venue || tutor || needle || date || course || mode !== "all" || when !== "upcoming");

  // back to the defaults; under the filters the tab stays (keepTab), from the empty state everything resets
  const clear = (keepTab = false) => {
    if (!keepTab) setMode("all");
    setCourse("");
    setVenue("");
    setTutor("");
    setWhen("upcoming");
    setQ("");
    setDate("");
    setPage(1);
    setWhenNote("");
    [...(keepTab ? [] : ["mode"]), "course", "venue", "tutor", "when", "q", "date"].forEach((k) => keep(k, ""));
  };
  const refresh = () => {
    utils.provider.cohorts.list.invalidate();
    utils.provider.courses.list.invalidate({ organisationId });
    utils.provider.courses.get.invalidate();
  };
  const fail = (e) => setToast({ message: errorsFrom(e).general || "We couldn't save that. Please try again." });
  const setTutorOf = (k, v) => update.mutate({ organisationId, cohortId: k.id, ...cohortInput(k), tutorUserId: v || null }, {
    onSuccess: () => { refresh(); setToast({ message: v ? `${tutorName(v) || "Tutor"} assigned` : "Tutor removed" }); },
    onError: fail,
  });
  const toggleBookings = (k) => bookable.mutate({ organisationId, cohortId: k.id, bookable: !k.bookable }, {
    onSuccess: () => { refresh(); setToast({ message: k.bookable ? "Bookings turned off" : "Bookings turned on" }); },
    onError: fail,
  });

  const create = edit && <button type="button" className="button -md -purple-1 text-white" onClick={() => setFormOpen(true)} disabled={!datedCourses.length}>Create cohort</button>;
  const nothingYet = !scoped.length && when === "upcoming" && !filtered;

  return (
    <div className="rt-acc__stack">
      {nothingYet && mode !== "self-paced" ? (
        <EmptyState
          title="No upcoming dates"
          text="A cohort is one run of a course on set dates. Add one so learners can book it once the course is live."
          action={edit ? (datedCourses.length ? { label: "Create cohort", onClick: () => setFormOpen(true) } : { label: "Create a course first", href: "/provider/courses/new" }) : null}
        />
      ) : null}
      {(!nothingYet || mode === "self-paced") && (
        <>
          <div className="rt-adm-toolbar">
            <Tabs tabs={MODES.map((m) => ({ ...m, count: m.key === "self-paced" ? onDemand.length : scoped.filter((k) => m.key === "all" || k.method === m.key).length }))} value={mode} onChange={(v) => { setMode(v); keep("mode", v, "all"); if (v === "live-online" && venue) { setVenue(""); keep("venue", ""); } }} label="Delivery" />
            {create}
          </div>
          {mode !== "self-paced" && (
            <div className="rt-pws-coh__filterbox">
              <div className="rt-pws-coh__filters">
                <Search value={q} onChange={(v) => { setQ(v); keep("q", v.trim()); }} label="Search course, venue or tutor" />
                <ToolSelect id="rt-coh-course" label="Course" value={course} onChange={(v) => { setCourse(v); keep("course", v); }} options={[{ value: "", label: "All courses" }, ...datedCourses.map((c) => ({ value: String(c.id), label: c.title }))]} />
                <ToolSelect id="rt-coh-when" label="When" value={when} onChange={(v) => { setWhen(v); keep("when", v, "upcoming"); setWhenNote(""); setPage(1); }} options={WHEN} />
                <div className="rt-field rt-adm-select -inline rt-pws-coh__datefilter">
                  <label htmlFor="rt-coh-date" className="rt-sr">Cohorts running on this date</label>
                  <DateField id="rt-coh-date" compact clearable placeholder="Any day" value={date} onChange={(v) => { setDate(v); keep("date", v); if (v && when !== "all") { setWhen("all"); keep("when", "all", "upcoming"); setWhenNote("When is set to Any date to show the cohorts running on the day you picked."); } setPage(1); }} />
                </div>
                {/* live online cohorts have no venue */}
                {mode !== "live-online" && <ToolSelect id="rt-coh-venue" label="Venue" value={venue} onChange={(v) => { setVenue(v); keep("venue", v); }} options={[{ value: "", label: "All venues" }, ...s.venues.data.map((v) => ({ value: v.id, label: v.name })), { value: "online", label: ONLINE }]} />}
                {tutors.length > 0 && <ToolSelect id="rt-coh-tutor" label="Tutor" value={tutor} onChange={(v) => { setTutor(v); keep("tutor", v); }} options={[{ value: "", label: "All tutors" }, ...tutors.map((t) => ({ value: t.userId, label: t.name })), { value: "none", label: "Not assigned" }]} />}
              </div>
              <div className="rt-pws-coh__filtersum">
                <b>{list.length} {list.length === 1 ? "cohort" : "cohorts"}</b>
                {whenNote && <span>{whenNote}</span>}
                {filtersSet && <button type="button" className="rt-cd__link" onClick={() => clear(true)}>Clear filters</button>}
              </div>
            </div>
          )}

          <p className="rt-sr" aria-live="polite">{mode === "self-paced" ? `${onDemand.length} self-paced ${onDemand.length === 1 ? "course" : "courses"}` : `${list.length} ${list.length === 1 ? "cohort" : "cohorts"}`}</p>
          {mode === "self-paced" ? (
            onDemand.length ? (
              <div className="rt-acc__card rt-biz__tablecard">
                <p className="rt-acc__note">Self-paced courses have no dates: learners start as soon as they book.</p>
                <table className="rt-biz__table rt-adm-table">
                  <thead><tr><th scope="col">Course</th><th scope="col">Course status</th><th scope="col"><span className="rt-sr">Actions</span></th></tr></thead>
                  <tbody>
                    {onDemand.map((c) => (
                      <tr key={c.id}>
                        <td data-label="Course"><Link href={`/provider/courses/${c.id}`} className="rt-adm-strong">{c.title}</Link></td>
                        <td data-label="Course status"><Pill tone={c.status === "live" ? "ok" : c.status === "changes" ? "warn" : "muted"}>{pw.courseStatuses[c.status]}</Pill></td>
                        <td data-label="Actions"><RowMenu label={`Actions for ${c.title}`} items={[{ label: "Edit course", href: `/provider/courses/${c.id}` }, { label: "Course pricing", href: `/provider/courses/${c.id}?tab=pricing` }]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState title="No self-paced courses yet." />
          ) : list.length ? (
            <div className="rt-acc__card rt-biz__tablecard">
              <table className="rt-biz__table rt-adm-table rt-pws-coh__table">
                <thead>
                  <tr>
                    <th scope="col">Cohorts</th>
                    <th scope="col">Status</th>
                    <th scope="col">Tutor</th>
                    <th scope="col">Places</th>
                    <th scope="col">Price</th>
                    <th scope="col"><span className="rt-sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((k) => {
                    const s0 = k.sessions[0];
                    const name = `${k.courseTitle}, ${dayRange(k.startsOn, k.endsOn)}`;
                    const cancelled = Boolean(k.cancelledAt);
                    return (
                      <tr key={k.id}>
                        <td data-label="Cohort">
                          <div className="rt-pws-coh__cohort">
                            <span className="rt-pws-coh__date" aria-hidden="true"><small>{monthShort(k.startsOn)}</small><b>{k.startsOn.slice(8)}</b></span>
                            <div>
                              <Link href={`/provider/cohorts/${k.id}`} className="rt-adm-strong">{k.courseTitle}</Link>
                              <small>{k.venue ? `${k.venue.name}, ${k.venue.city}` : ONLINE}</small>
                              <small>{dayRange(k.startsOn, k.endsOn)}{s0 ? ` from ${s0.from} to ${s0.to}` : ""}{k.sessions.length > 1 ? ` · ${k.sessions.length} sessions` : ""}</small>
                            </div>
                          </div>
                        </td>
                        <td data-label="Status">
                          <Pill tone={COHORT_TONE[k.status]}>{STATUSES[k.status]}</Pill>
                          {!k.bookable && !cancelled && <small>Bookings off</small>}
                        </td>
                        <td data-label="Tutor">
                          {edit && !cancelled && tutors.length ? (
                            <div className="rt-field rt-adm-select -inline">
                              <label htmlFor={`rt-coh-tu-${k.id}`} className="rt-sr">Tutor for {name}</label>
                              <FieldSelect id={`rt-coh-tu-${k.id}`} label={`Tutor for ${name}`} value={k.tutorUserId || ""} onChange={(v) => setTutorOf(k, v)} options={[{ value: "", label: "Not assigned" }, ...tutors.map((t) => ({ value: t.userId, label: t.name }))]} disabled={update.isPending} compact />
                            </div>
                          ) : (tutorName(k.tutorUserId) || <span className="rt-adm-muted">Not assigned</span>)}
                        </td>
                        <td data-label="Places"><Seats booked={0} max={k.capacity} /></td>
                        <td data-label="Price">{formatPrice(k.pricePence / 100)}{k.wasPricePence ? <small className="rt-adm-muted"> was {formatPrice(k.wasPricePence / 100)}</small> : null}</td>
                        <td data-label="Actions" className="rt-pws-coh__end">
                          <RowMenu label={`Actions for ${name}`} items={[
                            { label: "View", href: `/provider/cohorts/${k.id}` },
                            ...(edit && !cancelled ? [
                              { label: "Edit", onClick: () => setEditingK(k) },
                              { label: k.bookable ? "Turn bookings off" : "Turn bookings on", onClick: () => toggleBookings(k) },
                              ...(k.endsOn >= today ? [{ label: "Cancel", onClick: () => setCancelOne(k) }] : []),
                            ] : []),
                            ...(edit ? [{ label: "Delete", onClick: () => setDeleting(k), danger: true }] : []),
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
            <EmptyState title="No cohorts match these filters." action={filtered ? { label: "Clear filters", onClick: () => clear() } : null} />
          )}
        </>
      )}

      <CohortForm open={formOpen} onClose={() => setFormOpen(false)} suggestCourseId={course} mode={mode} onSaved={(id) => { setFormOpen(false); refresh(); setToast({ message: "Cohort saved", href: `/provider/cohorts/${id}`, label: "Open" }); }} onAnother={() => { refresh(); setToast({ message: "Cohort saved. Pick the dates for the next one." }); }} />
      <CohortForm open={Boolean(editingK)} onClose={() => setEditingK(null)} cohort={editingK} onSaved={() => { setEditingK(null); refresh(); setToast({ message: "Cohort saved" }); }} />
      <CancelSheet cohort={cancelOne} onClose={() => setCancelOne(null)} onDone={() => { setCancelOne(null); refresh(); setToast({ message: "Cohort cancelled" }); }} />
      <DeleteSheet cohort={deleting} onClose={() => setDeleting(null)} onDone={() => { setDeleting(null); refresh(); setToast({ message: "Cohort deleted" }); }} />
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

// Cancel dates that haven't finished, with the reason (learners are told once bookings exist).
export function CancelSheet({ cohort, onClose, onDone }) {
  const { organisationId } = useProviderAccess();
  const cancel = api.provider.cohorts.cancel.useMutation();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (cohort) {
      setReason("");
      setError("");
    }
  }, [cohort]);
  const submit = (e) => {
    e.preventDefault();
    if (reason.trim().length < 3) {
      setError("Say why the dates are cancelled.");
      return document.getElementById("rt-coh-cancel-why")?.focus();
    }
    cancel.mutate({ organisationId, cohortId: cohort.id, reason: reason.trim() }, { onSuccess: onDone, onError: (er) => setError(errorsFrom(er).general || Object.values(errorsFrom(er).fields)[0]) });
  };
  return (
    <Sheet open={Boolean(cohort)} onClose={onClose} title="Cancel this cohort?" closeLabel="Close">
      {cohort && (
        <form className="rt-q__form" onSubmit={submit} noValidate>
          <p className="rt-acc__note">{cohort.courseTitle}, {dayRange(cohort.startsOn, cohort.endsOn)}. Nobody can book it after this, and it can&apos;t be undone.</p>
          <div className="rt-field">
            <label htmlFor="rt-coh-cancel-why">Reason</label>
            {error && <p className="rt-q__err" id="rt-coh-cancel-why-e"><span className="rt-sr">Error: </span>{error}</p>}
            <textarea id="rt-coh-cancel-why" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "rt-coh-cancel-why-e" : undefined} autoComplete="off" />
          </div>
          <div className="rt-pws-coh__actions">
            <button type="submit" className="button -md -purple-1 text-white" disabled={cancel.isPending} aria-busy={cancel.isPending || undefined}>{cancel.isPending ? "Cancelling…" : "Cancel cohort"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onClose}>Keep it</button>
          </div>
        </form>
      )}
    </Sheet>
  );
}

export function DeleteSheet({ cohort, onClose, onDone }) {
  const { organisationId } = useProviderAccess();
  const remove = api.provider.cohorts.remove.useMutation();
  const [error, setError] = useState("");
  return (
    <Sheet open={Boolean(cohort)} onClose={() => { setError(""); onClose(); }} title="Delete this cohort?" closeLabel="Close">
      {cohort && (
        <div className="rt-q__form">
          <p className="rt-acc__note">{cohort.courseTitle}, {dayRange(cohort.startsOn, cohort.endsOn)}, is removed for good.</p>
          {error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
          <div className="rt-pws-coh__actions">
            <button type="button" className="button -md -purple-1 text-white" disabled={remove.isPending} onClick={() => remove.mutate({ organisationId, cohortId: cohort.id }, { onSuccess: onDone, onError: (e) => setError(errorsFrom(e).general) })}>{remove.isPending ? "Deleting…" : "Delete cohort"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onClose}>Keep it</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ---- create and edit -------------------------------------------------------------------------------------------------------

const money = (pence) => (pence == null ? "" : (pence / 100).toFixed(2).replace(/\.00$/, ""));
const PRICE_RE = /^\d+(\.\d{1,2})?$/;

// The panel for one cohort. `cohort` (from the list) edits it; otherwise it creates one, asking which course (or for
// `suggestCourseId`). `mode` (the list's Classroom / Live online tab) picks the mode of study the form starts on.
export function CohortForm({ open, onClose, suggestCourseId = "", mode = "", cohort = null, onSaved, onAnother }) {
  const { organisationId } = useProviderAccess();
  const formRef = useRef(null);
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  // a venue being added from here (it saves as a normal venue, and the date picks it)
  const [addingVenue, setAddingVenue] = useState(false);
  const [venueAdded, setVenueAdded] = useState("");
  const [view, setView] = useState(() => monthStart(todayIso()));
  const [studyMode, setStudyMode] = useState("classroom");
  const on = { enabled: open && Boolean(organisationId) };
  const coursesQ = api.provider.courses.list.useQuery({ organisationId }, on);
  const venuesQ = api.provider.venues.list.useQuery({ organisationId }, on);
  const tutorsQ = api.provider.cohorts.tutors.useQuery({ organisationId }, { ...on, retry: false });
  const create = api.provider.cohorts.create.useMutation();
  const update = api.provider.cohorts.update.useMutation();
  const courses = coursesQ.data || [];
  const courseOf = (id) => courses.find((c) => String(c.id) === String(id));

  const blankFor = (c) => ({ courseId: c ? String(c.id) : "", sessions: [], tutorUserId: "", venueId: "", joinUrl: "", price: "", wasPrice: "", capacity: "12", details: "" });

  // fill the form each time the panel opens (once the courses are in)
  useEffect(() => {
    if (!open || !coursesQ.data) return;
    if (cohort) {
      setF({ courseId: String(cohort.courseId), sessions: cohort.sessions.map((s) => ({ ...s })), tutorUserId: cohort.tutorUserId || "", venueId: cohort.venueId || "", joinUrl: cohort.joinUrl || "", price: money(cohort.pricePence), wasPrice: money(cohort.wasPricePence), capacity: String(cohort.capacity), details: cohort.details || "" });
      setView(monthStart(cohort.startsOn || todayIso()));
    } else {
      const c = courseOf(suggestCourseId);
      setF(blankFor(c && c.method !== "self-paced" ? c : null));
      setView(monthStart(todayIso()));
      setStudyMode(c?.method === "live-online" || (!c && mode === "live-online") ? "live-online" : "classroom");
    }
    setErrors({});
    setAddingVenue(false);
    setVenueAdded("");
  }, [open, Boolean(coursesQ.data)]); // eslint-disable-line react-hooks/exhaustive-deps -- fill once per opening

  const ready = Boolean(open && f && venuesQ.data);
  const course = ready ? courseOf(f.courseId) : null;
  const method = cohort ? cohort.method : course?.method || studyMode;
  const today = todayIso();
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const venueSaved = async (r) => {
    await venuesQ.refetch();
    set({ venueId: r.id });
    setAddingVenue(false);
    setVenueAdded(r.located ? "Venue added and chosen for these dates." : "Venue added and chosen. We couldn't find its postcode on the map, so check it in Settings › Venues.");
    setErrors((e) => ({ ...e, venueId: undefined }));
  };
  const venueForm = <VenueForm inline idPrefix="rt-cf-v" onSaved={venueSaved} onCancel={() => setAddingVenue(false)} />;

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
  const save = async (e, another = false) => {
    e.preventDefault();
    const err = {};
    if (!f.courseId) err.courseId = "Choose the course this cohort is for.";
    if (!f.sessions.length) err.sessions = "Pick at least one date on the calendar.";
    const firstNow = cohort?.startsOn;
    f.sessions.forEach((s, i) => {
      if (!s.date) err[`d${i}`] = "Enter the start date.";
      else if (s.date < today && s.date !== firstNow && (!cohort || s.date < firstNow)) err[`d${i}`] = "The start date can't be in the past.";
      else if ((s.end || s.date) < s.date) err[`d${i}`] = "The end date can't be before the start date.";
      else if ((s.end || s.date) === s.date && s.to <= s.from) err[`d${i}`] = "The end time must be after the start time.";
    });
    if (method === "classroom" && !f.venueId) err.venueId = "Choose the venue.";
    if (method === "live-online" && f.joinUrl.trim() && !/^https:\/\/\S+$/.test(f.joinUrl.trim())) err.joinUrl = "Use the full https link, or leave it empty for now.";
    if (!PRICE_RE.test(f.price) || Number(f.price) < 1) err.price = "Enter the price per learner in pounds, like 95.";
    if (f.wasPrice && (!PRICE_RE.test(f.wasPrice) || Number(f.wasPrice) <= Number(f.price))) err.wasPrice = "Enter a “was” price higher than the price, or leave it empty.";
    const m = Number(f.capacity);
    if (!Number.isInteger(m) || m < 1 || m > 200) err.capacity = "Enter a whole number from 1 to 200.";
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(formRef.current);
    const values = {
      organisationId,
      sessions: [...f.sessions].map((s) => ({ ...s, end: s.end || s.date })).sort((a, b) => a.date.localeCompare(b.date)),
      venueId: method === "classroom" ? f.venueId : null,
      joinUrl: method === "live-online" ? f.joinUrl.trim() : null,
      capacity: m,
      pricePence: Math.round(Number(f.price) * 100),
      wasPricePence: f.wasPrice ? Math.round(Number(f.wasPrice) * 100) : null,
      details: f.details.trim() || null,
      tutorUserId: f.tutorUserId || null,
      bookable: cohort ? cohort.bookable : true,
    };
    try {
      const id = cohort ? (await update.mutateAsync({ ...values, cohortId: cohort.id }), cohort.id) : (await create.mutateAsync({ ...values, courseId: Number(f.courseId) })).id;
      if (another) {
        setF((x) => ({ ...x, sessions: [] }));
        setErrors({});
        onAnother?.(id);
        requestAnimationFrame(() => formRef.current?.querySelector("h3")?.scrollIntoView({ block: "start" }));
        return;
      }
      onSaved?.(id);
    } catch (error) {
      const { fields, general } = errorsFrom(error);
      setErrors({ ...fields, form: general });
      requestAnimationFrame(() => focusFirstError(formRef.current));
    }
  };
  const busy = create.isPending || update.isPending;

  const err = (key) => errors[key] && <p className="rt-q__err" id={`rt-cf-${key}-e`}><span className="rt-sr">Error: </span>{errors[key]}</p>;
  const aria = (key) => ({ "aria-invalid": errors[key] ? true : undefined, "aria-describedby": errors[key] ? `rt-cf-${key}-e` : undefined });

  const datedCourses = courses.filter((c) => c.method === studyMode);
  const tutors = tutorsQ.data || [];
  const venues = ready ? venuesQ.data.filter((v) => v.active || v.id === f.venueId) : [];
  const ordered = ready ? f.sessions.map((s, i) => ({ s, i })).sort((a, b) => a.s.date.localeCompare(b.s.date)) : [];

  return (
    <Sheet open={open} onClose={onClose} title={cohort ? "Edit cohort" : "Create cohort"} closeLabel="Close" className="rt-pws-coh__sheet">
      {open && !ready && <Loading rows={2} />}
      {ready && (
        <form className="rt-q__form rt-pws-coh__form" onSubmit={save} noValidate ref={formRef}>
          {!cohort && !suggestCourseId && (
            <Choice name="rt-cf-mode" legend="Mode of study" value={studyMode} onChange={(v) => { setStudyMode(v); setF((x) => ({ ...blankFor(null), sessions: x.sessions })); }}
              options={pw.formats.filter((x) => x.key !== "self-paced").map((x) => ({ value: x.key, label: methodName(x.key) }))} />
          )}
          {!cohort && !(suggestCourseId && course) ? (
            <div className="rt-field">
              <label htmlFor="rt-cf-courseId">Course</label>
              {err("courseId")}
              <FieldSelect id="rt-cf-courseId" label="Course" value={f.courseId} onChange={(value) => setF((x) => ({ ...blankFor(courseOf(value)), sessions: x.sessions }))} options={datedCourses.map((c) => ({ value: String(c.id), label: c.title }))} placeholder={datedCourses.length ? "Choose a course" : `No ${methodName(studyMode).toLowerCase()} courses yet`} invalid={Boolean(errors.courseId)} describedBy={aria("courseId")["aria-describedby"]} />
            </div>
          ) : (
            <p className="rt-acc__note rt-pws-coh__for">For <b>{cohort ? cohort.courseTitle : course?.title}</b> · {methodName(method)}</p>
          )}
          {/* a classroom date needs a venue: say so first, before any dates are picked */}
          {method === "classroom" && venues.length === 0 && (
            <div className="rt-acc__notice -warn rt-pws-coh__novenue" role="status">
              <p><b>Add a venue first.</b> Classroom dates take place at one of your venues, and you haven't added one yet. Add it here: it is saved to your venues, and these dates use it.</p>
              {addingVenue ? venueForm : <button type="button" className="button -sm -purple-1 text-white" onClick={() => setAddingVenue(true)}>Add a venue</button>}
            </div>
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
                          <DateField id={`rt-cf-s${i}`} value={s.date} min={cohort ? undefined : today} onChange={(v) => setSlot(i, { date: v, end: !s.end || s.end < v ? v : s.end })} invalid={Boolean(errors[`d${i}`])} describedBy={errors[`d${i}`] ? `rt-cf-d${i}-e` : undefined} />
                        </div>
                        <div className="rt-field">
                          <label htmlFor={`rt-cf-e${i}`}>Ends</label>
                          <DateField id={`rt-cf-e${i}`} value={s.end || s.date} min={s.date} onChange={(v) => setSlot(i, { end: v })} />
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
              {tutors.length > 0 && (
                <div className="rt-field">
                  <label htmlFor="rt-cf-tutorUserId">Tutor</label>
                  {err("tutorUserId")}
                  <FieldSelect id="rt-cf-tutorUserId" label="Tutor" value={f.tutorUserId} onChange={(value) => set({ tutorUserId: value })} options={[{ value: "", label: "Not assigned" }, ...tutors.map((t) => ({ value: t.userId, label: t.name }))]} />
                </div>
              )}
              {method === "classroom" && (
                <div className="rt-field">
                  <label htmlFor="rt-cf-venueId">Venue</label>
                  {err("venueId")}
                  <FieldSelect id="rt-cf-venueId" label="Venue" placeholder={venues.length ? "Choose a venue" : "No venues yet"} value={f.venueId} onChange={(value) => set({ venueId: value })} options={venues.map((v) => ({ value: v.id, label: `${v.name}, ${v.city}` }))} invalid={Boolean(errors.venueId)} describedBy={aria("venueId")["aria-describedby"]} />
                  {venueAdded && <p className="rt-acc__note rt-pws-coh__added" role="status">{venueAdded}</p>}
                  {venues.length > 0 && (addingVenue ? venueForm : <button type="button" className="rt-cd__link rt-pws-coh__hintlink" onClick={() => setAddingVenue(true)}>+ Add a new venue</button>)}
                </div>
              )}
              {method === "live-online" && (
                <div className="rt-field">
                  <label htmlFor="rt-cf-joinUrl">Joining link (optional)</label>
                  <p className="rt-acc__note" id="rt-cf-joinUrl-h">The Zoom, Teams or Meet link. You can add it later; learners get it before the first session.</p>
                  {err("joinUrl")}
                  <input id="rt-cf-joinUrl" type="url" inputMode="url" value={f.joinUrl} onChange={(e) => set({ joinUrl: e.target.value })} autoComplete="url" aria-invalid={errors.joinUrl ? true : undefined} aria-describedby={`rt-cf-joinUrl-h${errors.joinUrl ? " rt-cf-joinUrl-e" : ""}`} />
                </div>
              )}
            </div>
            <div className="rt-pws-coh__setgrid">
              <div className="rt-field">
                <label htmlFor="rt-cf-price">Price per learner, including VAT (£)</label>
                {err("price")}
                <input id="rt-cf-price" type="text" inputMode="decimal" value={f.price} onChange={(e) => set({ price: e.target.value.trim() })} autoComplete="off" {...aria("price")} />
              </div>
              <div className="rt-field">
                <label htmlFor="rt-cf-wasPrice">“Was” price (optional, £)</label>
                {err("wasPrice")}
                <input id="rt-cf-wasPrice" type="text" inputMode="decimal" value={f.wasPrice} onChange={(e) => set({ wasPrice: e.target.value.trim() })} autoComplete="off" {...aria("wasPrice")} />
              </div>
              <div className="rt-field">
                <label htmlFor="rt-cf-capacity">Most learners</label>
                {err("capacity")}
                <input id="rt-cf-capacity" type="number" inputMode="numeric" min="1" max="200" step="1" value={f.capacity} onChange={(e) => set({ capacity: e.target.value })} autoComplete="off" {...aria("capacity")} />
              </div>
            </div>
            <div className="rt-field">
              <label htmlFor="rt-cf-details">Cohort structure (optional)</label>
              <p className="rt-acc__note" id="rt-cf-details-h">For example weekends, day release or certain days. Learners see it under the dates.</p>
              <textarea id="rt-cf-details" rows={3} maxLength={500} value={f.details} onChange={(e) => set({ details: e.target.value })} aria-describedby="rt-cf-details-h" autoComplete="off" />
            </div>
          </section>
          {errors.form && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{errors.form}</p>}
          <div className="rt-pws-coh__formfoot">
            <button type="submit" className="button -md -purple-1 text-white" disabled={busy} aria-busy={busy || undefined}>{busy ? "Saving…" : cohort ? "Save changes" : "Save cohort"}</button>
            {!cohort && <button type="button" className="button -md -outline-purple-1 text-purple-1" disabled={busy} onClick={(e) => save(e, true)}>Save and create another</button>}
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
