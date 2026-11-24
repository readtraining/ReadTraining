"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { useWorkspaceLinks } from "@/lib/workspaceContext";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import Sheet from "@/components/testPrep/runner/Sheet";
import FilterScrollPill from "@/components/courses/FilterScrollPill";
import Toast from "@/components/courses/Toast";
import { COHORT_TONE, Choice, Loading, Pill, RowMenu, Search, Tabs, ToolSelect, WayCards, getQuery, setQuery, shortDay } from "./providerParts";
import CataloguePagination from "@/components/courses/CataloguePagination";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { METHOD_ALIASES, methodName } from "@/lib/taxonomy";
import { isDatedMethod, waysOf } from "@/lib/courseModes";
import { EmptyState, ErrorState } from "@/components/states/States";
import DateField from "@/components/admin/DateField";
import { VenueForm } from "./SettingsProfile";
import { useUnsavedChanges } from "@/lib/unsavedChanges";
import { useNewCourse } from "./NewCourse";
import TextArea from "@/components/forms/TextArea";
import { Req } from "./settingsForm";

// Cohorts: every run of a course on set dates: the cohort (date, course, venue, dates and times), its status,
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
export const WHEN = [
  { value: "upcoming", label: "Upcoming and in progress" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "Any date" },
];
// cancelled dates are listed under Cancelled and Any date only, so upcoming and past lists (and their counts) are the dates that run
// a date of a course that isn't on sale (not live): it stays in the workspace, labelled, and learners can't see or book it
const OFF_SALE = { draft: "Course in draft", pending: "Course in review", changes: "Course needs changes", paused: "Course paused" };
const offSale = (k) => OFF_SALE[k.courseStatus] || null;
// A cohort's status, as every list shows it: its own status (Upcoming, In progress…) is the one pill, and why learners can't book it
// (the course isn't on sale, its learning option has stopped taking bookings, or its own bookings are off) is plain text under it,
// so a row never carries several coloured badges (one badge per cell, the reasons as text)
export const whyNotOnSale = (k) => (k.cancelledAt ? "" : [offSale(k), k.optionClosed ? "Bookings stopped" : !k.bookable ? "Bookings off" : null].filter(Boolean).join(" · "));
export function CohortStatus({ k, status }) {
  const why = whyNotOnSale(k);
  return (
    <span className="rt-pws-coh__status">
      <Pill tone={COHORT_TONE[status]}>{COHORT_STATUSES[status]}</Pill>
      {why && <small className="rt-pws-coh__why">{why}</small>}
    </span>
  );
}
// a date can be deleted while nobody has booked it and it hasn't finished (the API checks again, counting every order); otherwise
// it is cancelled, or kept as the record of a course that ran
export const deletable = (k, today = todayIso()) => k.endsOn >= today && !k.taken;
export const askWhen = (when) => (when === "cancelled" ? "all" : when);
export const inWhen = (k, when) => when === "all" || (when === "cancelled" ? Boolean(k.cancelledAt) : !k.cancelledAt);
export const COHORT_STATUSES = { upcoming: "Upcoming", progress: "In progress", completed: "Completed", cancelled: "Cancelled" };
const ONLINE = "Online";
// the tutor menu: the team members who can teach, and the date's own tutor if they have left the team since (a finished date keeps
// who taught it)
export const tutorOptions = (tutors, k) => [
  { value: "", label: "Not assigned" },
  ...tutors.map((t) => ({ value: t.userId, label: t.name })),
  ...(k?.tutorUserId && !tutors.some((t) => t.userId === k.tutorUserId) ? [{ value: k.tutorUserId, label: k.tutorName || "Former team member" }] : []),
];
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

// The provider's dates, courses, venues and team, from the API (shared by the list, the form and the calendar). Only what this
// role may see is asked for (the API refuses the rest): a tutor gets the dates they teach and no venue list (only the date form,
// which they can't open, needs it); roles without dates or courses get an empty list. `may` says which ones the role sees.
// `courseId`: only that course's dates (the course overview).
const NONE = { data: [], isError: false, refetch: () => {} };
// a date's colour on the calendar: its own, or by type (classroom purple, live online blue)
export const defaultColour = (method) => (method === "live-online" ? "blue" : "purple");
export const colourOf = (k) => k.colour || defaultColour(k.method);

export function useSchedule(when = "upcoming", courseId = null, { near = false } = {}) {
  const access = useProviderAccess();
  const { organisationId } = access;
  const may = {
    dates: access.can("provider.cohorts.view") || access.can("provider.cohorts.view", { tutorUserId: access.userId }),
    venues: access.can("provider.venues.view"),
    team: access.can("provider.cohorts.view"),
    courses: access.can("provider.courses.view"),
  };
  const on = (ok) => ({ enabled: Boolean(organisationId) && ok });
  const cohorts = api.provider.cohorts.list.useQuery({ organisationId, when, ...(courseId ? { courseId } : {}), ...(near ? { near } : {}) }, on(may.dates));
  const courses = api.provider.courses.list.useQuery({ organisationId }, on(may.courses));
  const venues = api.provider.venues.list.useQuery({ organisationId }, on(may.venues));
  const tutors = api.provider.cohorts.tutors.useQuery({ organisationId }, on(may.team));
  return { may, cohorts: may.dates ? cohorts : NONE, courses: may.courses ? courses : NONE, venues: may.venues ? venues : NONE, tutors: may.team ? tutors : NONE };
}

// A joining link: the https address of one Zoom, Microsoft Teams or Google Meet meeting, with no login in it, as the API checks it
// (schedule.mts isMeetingLink): keep the two the same.
const MEETINGS = [
  [/^(?:[a-z0-9-]+\.)*zoom\.(?:us|com)$/, /^\/(?:(?:j|w)\/\d{9,13}|my\/[\w.-]+)\/?$/], // a Zoom meeting, webinar or personal room
  [/^teams\.(?:microsoft|live)\.com$/, /^\/(?:l\/meetup-join\/.+|meet\/[\w-]+\/?)$/], // a Teams meeting's join link
  [/^meet\.google\.com$/, /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/], // a Google Meet code
];
export function isMeetingLink(v) {
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || u.username || u.password) return false;
    const host = u.hostname.toLowerCase();
    return MEETINGS.some(([h, path]) => h.test(host) && path.test(u.pathname));
  } catch {
    return false;
  }
}

// ---- the list --------------------------------------------------------------------------------------------------------------

export default function ProviderCohorts() {
  const links = useWorkspaceLinks();
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
  // the date being edited stays set while its form closes, so the closing form doesn't turn into an empty "Create cohort"
  const [editing, setEditing] = useState({ open: false, k: null });
  const [deleting, setDeleting] = useState(null);
  const [cancelOne, setCancelOne] = useState(null);
  const [moveOne, setMoveOne] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState(null);
  // a row change shows at once (bookings on or off, the tutor), before the list loads again; gone again if the save fails
  const [changing, setChanging] = useState({});
  const change = (id, patch) => setChanging((x) => (patch ? { ...x, [id]: { ...x[id], ...patch } } : Object.fromEntries(Object.entries(x).filter(([k]) => k !== id))));
  const s = useSchedule(askWhen(when));
  const utils = api.useUtils();
  const assignTutor = api.provider.cohorts.setTutor.useMutation();
  const bookable = api.provider.cohorts.setBookable.useMutation();
  const edit = can("provider.cohorts.edit");
  // new dates set their prices, so adding them also needs prices (ReadTraining staff without the pricing switch can't)
  const add = edit && can("provider.pricing.edit");
  const newCourse = useNewCourse();

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
    if (getQuery("new") === "1" && add) setFormOpen(true); // "Create cohort" from the dashboard (only for someone who can add dates)
    const d = getQuery("date");
    if (/^\d{4}-\d{2}-\d{2}$/.test(d || "")) { setDate(d); setWhen("all"); }
  }, []);

  // any filter change starts again at page 1
  useEffect(() => setPage(1), [mode, course, venue, tutor, when, q, date]);

  const keep = (key, value, fallback = "") => setQuery(key, value === fallback ? "" : value);
  if (!s.may.dates) return <EmptyState title="Dates aren't part of your role" text="Ask your provider's owner or an admin if you need to see the dates." />;
  const failed = [s.cohorts, s.courses, s.venues].find((x) => x.isError);
  if (failed) return <ErrorState title="We couldn't load your dates." text="Check your connection, then try again." onRetry={() => failed.refetch()} />;
  if (!s.cohorts.data || !s.courses.data || !s.venues.data) return <Loading rows={2} />;

  const today = todayIso();
  const courses = s.courses.data;
  const courseOf = Object.fromEntries(courses.map((c) => [c.id, c]));
  const tutors = s.tutors.data || [];
  // a tutor sees only the dates they teach (no team list), so a tutor on them is the tutor themselves; someone who has left the
  // team since keeps their name on the dates they taught
  const tutorName = (id, k) => tutors.find((t) => t.userId === id)?.name ?? (!s.may.team && id ? "You" : id && id === k?.tutorUserId ? k.tutorName : undefined);
  const scoped = s.cohorts.data.filter((k) => !changing[k.id]?.deleted && inWhen(k, when)).map((k) => {
    const now = { ...k, ...changing[k.id] };
    return { ...now, status: cohortState(now, today), course: courseOf[k.courseId] };
  });
  // the courses taught on dates (classroom or live online among their learning options), and the ones offered self-paced
  const datedCourses = courses.filter((c) => datedOf(c).length);
  const onDemand = courses.filter((c) => waysOf(c).includes("self-paced"));

  const needle = q.trim().toLowerCase();
  const list = scoped
    .filter((k) => mode === "all" || mode === "self-paced" || k.method === mode)
    .filter((k) => !course || String(k.courseId) === course)
    .filter((k) => !venue || (venue === "online" ? !k.venueId : k.venueId === venue))
    .filter((k) => !tutor || (tutor === "none" ? !k.tutorUserId : k.tutorUserId === tutor))
    .filter((k) => !date || (k.startsOn <= date && k.endsOn >= date))
    .filter((k) => !needle || `${k.courseTitle} ${k.venue?.name || ONLINE} ${k.venue?.city || ""} ${tutorName(k.tutorUserId, k) || ""}`.toLowerCase().includes(needle));

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
  const refresh = () =>
    Promise.all([utils.provider.cohorts.list.invalidate(), utils.provider.courses.list.invalidate({ organisationId }), utils.provider.courses.get.invalidate()]);
  const fail = (e) => setToast({ message: errorsFrom(e).general || "We couldn't save that. Please try again." });
  // only the tutor changes (nothing else on the dates is sent, so a colleague's change to them stays)
  const setTutorOf = (k, v) => {
    change(k.id, { tutorUserId: v || null });
    assignTutor.mutate({ organisationId, cohortId: k.id, tutorUserId: v || null }, {
      onSuccess: async () => { setToast({ message: v ? `${tutorName(v) || "Tutor"} assigned` : "Tutor removed" }); await refresh(); change(k.id, null); },
      onError: (e) => { change(k.id, null); fail(e); },
    });
  };
  const toggleBookings = (k) => {
    change(k.id, { bookable: !k.bookable });
    bookable.mutate({ organisationId, cohortId: k.id, bookable: !k.bookable }, {
      onSuccess: async () => { setToast({ message: k.bookable ? "Bookings turned off. Learners can't book this cohort now." : "Bookings turned on. Learners can book this cohort once online booking opens." }); await refresh(); change(k.id, null); },
      onError: (e) => { change(k.id, null); fail(e); },
    });
  };

  const create = add && <button type="button" className="button -md -purple-1 text-white" onClick={() => setFormOpen(true)} disabled={!datedCourses.length}>Create cohort</button>;
  const nothingYet = !scoped.length && when === "upcoming" && !filtered;

  return (
    <div className="rt-acc__stack">
      {nothingYet && mode !== "self-paced" ? (
        <EmptyState
          title="No upcoming dates"
          text="A cohort is one run of a course on set dates. Add one so learners see it once the course is live; online booking opens in a later update."
          action={add ? (datedCourses.length ? { label: "Create cohort", onClick: () => setFormOpen(true) } : { label: "Create a course first", onClick: newCourse }) : null}
        />
      ) : null}
      {(!nothingYet || mode === "self-paced") && (
        <>
          <div className="rt-adm-toolbar">
            <Tabs tabs={MODES.map((m) => ({ ...m, count: m.key === "self-paced" ? onDemand.length : scoped.filter((k) => m.key === "all" || k.method === m.key).length }))} value={mode} onChange={(v) => { setMode(v); keep("mode", v, "all"); if (v === "live-online" && venue) { setVenue(""); keep("venue", ""); } }} label="Delivery" />
            {mode !== "self-paced" && create}
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
                <p className="rt-acc__note">The self-paced option has no dates: learners start as soon as they book.</p>
                <table className="rt-biz__table rt-adm-table">
                  <thead><tr><th scope="col">Course</th><th scope="col">Course status</th><th scope="col"><span className="rt-sr">Actions</span></th></tr></thead>
                  <tbody>
                    {onDemand.map((c) => (
                      <tr key={c.id}>
                        <td data-label="Course"><Link href={links.course(c.id)} className="rt-adm-strong">{c.title}</Link></td>
                        <td data-label="Course status"><Pill tone={c.status === "live" ? "ok" : c.status === "changes" ? "warn" : "muted"}>{pw.courseStatuses[c.status]}</Pill></td>
                        <td data-label="Actions"><RowMenu label={`Actions for ${c.title}`} items={[{ label: "Edit course", href: links.course(c.id) }, { label: "Price", href: links.course(c.id, "pricing") }]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState title="No self-paced courses yet." text="A self-paced course has no dates: learners start as soon as they book." />
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
                    const name = `${k.courseTitle}, ${dayRange(k.startsOn, k.endsOn)}`;
                    const cancelled = Boolean(k.cancelledAt);
                    return (
                      <tr key={k.id}>
                        <td data-label="Cohort"><CohortCell k={k} /></td>
                        <td data-label="Status">
                          <CohortStatus k={k} status={k.status} />
                        </td>
                        <td data-label="Tutor">
                          {edit && !cancelled && tutors.length ? (
                            <div className="rt-field rt-adm-select -inline">
                              <label htmlFor={`rt-coh-tu-${k.id}`} className="rt-sr">Tutor for {name}</label>
                              <FieldSelect id={`rt-coh-tu-${k.id}`} label={`Tutor for ${name}`} value={k.tutorUserId || ""} onChange={(v) => setTutorOf(k, v)} options={tutorOptions(tutors, k)} disabled={assignTutor.isPending} compact />
                            </div>
                          ) : (tutorName(k.tutorUserId, k) || <span className="rt-adm-muted">Not assigned</span>)}
                        </td>
                        <td data-label="Places"><Seats booked={k.taken ?? 0} max={k.capacity} /></td>
                        <td data-label="Price">{k.planId ? "From " : ""}{formatPrice(k.pricePence / 100)}{k.wasPricePence ? <small className="rt-adm-muted"> was {formatPrice(k.wasPricePence / 100)}</small> : null}</td>
                        <td data-label="Actions" className="rt-pws-coh__end">
                          <RowMenu label={`Actions for ${name}`} items={[
                            ...(links.cohort(k.id) ? [{ label: "View", href: links.cohort(k.id) }] : []),
                            ...(edit && !cancelled ? [
                              { label: "Edit", onClick: () => setEditing({ open: true, k }) },
                              // a finished date takes no bookings, so it has nothing to turn on or off
                              ...(k.endsOn >= today ? [
                                { label: k.bookable ? "Turn bookings off" : "Turn bookings on", onClick: () => toggleBookings(k) },
                                { label: "Move to another course", onClick: () => setMoveOne(k) },
                                { label: "Cancel", onClick: () => setCancelOne(k) },
                              ] : []),
                            ] : []),
                            ...(edit && deletable(k, today) ? [{ label: "Delete", onClick: () => setDeleting(k), danger: true }] : []),
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

      <CohortForm open={formOpen} onClose={() => setFormOpen(false)} suggestCourseId={course} mode={mode} onSaved={(id) => { setFormOpen(false); refresh(); setToast({ message: "Cohort saved", ...(links.cohort(id) ? { href: links.cohort(id), label: "Open" } : {}) }); }} onAnother={() => refresh()} />
      <CohortForm open={editing.open} onClose={() => setEditing((x) => ({ ...x, open: false }))} cohort={editing.k} onSaved={() => { setEditing((x) => ({ ...x, open: false })); refresh(); setToast({ message: "Cohort saved" }); }} />
      <MoveSheet cohort={moveOne} onClose={() => setMoveOne(null)} onDone={async (title) => { setMoveOne(null); setToast({ message: `Moved to ${title}` }); await refresh(); }} />
      <CancelSheet cohort={cancelOne} onClose={() => setCancelOne(null)} onDone={async () => { const id = cancelOne.id; setCancelOne(null); change(id, { cancelledAt: new Date().toISOString() }); setToast({ message: "Cohort cancelled" }); await refresh(); change(id, null); }} />
      <DeleteSheet cohort={deleting} onClose={() => setDeleting(null)} onDone={async () => { const id = deleting.id; setDeleting(null); change(id, { deleted: true }); setToast({ message: "Cohort deleted" }); await refresh(); change(id, null); }} />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

// A cohort's first cell, as the Cohorts list shows it: the date tile, then the course (a link to the cohort), the venue or Online,
// and the dates, times and number of sessions. `forCourse` (one course's cohorts, on the course overview, whose title already
// names the course): the link reads the dates instead, and the last line has only the times and sessions.
export function CohortCell({ k, forCourse = false }) {
  const links = useWorkspaceLinks();
  const s0 = k.sessions[0];
  const range = dayRange(k.startsOn, k.endsOn);
  const times = s0 ? `${forCourse ? "From" : " from"} ${s0.from} to ${s0.to}` : "";
  const sessions = k.sessions.length > 1 ? `${times || !forCourse ? " · " : ""}${k.sessions.length} sessions` : "";
  return (
    <div className="rt-pws-coh__cohort">
      <span className="rt-pws-coh__date" aria-hidden="true"><small>{monthShort(k.startsOn)}</small><b>{k.startsOn.slice(8)}</b></span>
      <div>
        {links.cohort(k.id) ? <Link href={links.cohort(k.id)} className="rt-adm-strong">{forCourse ? range : k.courseTitle}</Link> : <span className="rt-adm-strong">{forCourse ? range : k.courseTitle}</span>}
        <small>{k.venue ? `${k.venue.name}, ${k.venue.city}` : ONLINE}</small>
        {(!forCourse || times || sessions) && <small>{forCourse ? "" : range}{times}{sessions}</small>}
      </div>
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
    <Sheet open={Boolean(cohort)} onClose={onClose} title="Cancel this cohort?" closeLabel="Close" noClose>
      {cohort && (
        <form className="rt-q__form" onSubmit={submit} noValidate>
          <p className="rt-acc__note">{cohort.courseTitle}, {dayRange(cohort.startsOn, cohort.endsOn)}. Nobody can book it after this, and it can&apos;t be undone.</p>
          <div className="rt-field">
            <label htmlFor="rt-coh-cancel-why">Reason<Req /></label>
            {error && <p className="rt-q__err" id="rt-coh-cancel-why-e"><span className="rt-sr">Error: </span>{error}</p>}
            <TextArea id="rt-coh-cancel-why" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "rt-coh-cancel-why-e" : undefined} autoComplete="off" />
          </div>
          <div className="rt-pws-set__actions">
            <button type="submit" className="button -md -outline-red-3 text-red-3" disabled={cancel.isPending} aria-busy={cancel.isPending || undefined}>{cancel.isPending ? "Cancelling…" : "Cancel cohort"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onClose}>Go back</button>
          </div>
        </form>
      )}
    </Sheet>
  );
}

// Move a cohort to another of the provider's courses that offers its way of learning and takes bookings for it (API
// provider.cohorts.move: refused once anyone has booked it). `onDone(courseTitle)` after the move.
export function MoveSheet({ cohort, onClose, onDone }) {
  const { organisationId } = useProviderAccess();
  const courses = api.provider.courses.list.useQuery({ organisationId }, { enabled: Boolean(cohort) && Boolean(organisationId) });
  const move = api.provider.cohorts.move.useMutation();
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (cohort) {
      setCourseId("");
      setError("");
    }
  }, [cohort]);
  const eligible = (courses.data ?? []).filter((c) => c.id !== cohort?.courseId && c.methods.includes(cohort?.method) && !c.closedMethods.includes(cohort?.method));
  const submit = (e) => {
    e.preventDefault();
    if (!courseId) {
      setError("Choose a course.");
      return document.getElementById("rt-coh-move-course")?.focus();
    }
    move.mutate({ organisationId, cohortId: cohort.id, courseId: Number(courseId) }, {
      onSuccess: (r) => onDone(r.courseTitle),
      onError: (er) => setError(errorsFrom(er).general || Object.values(errorsFrom(er).fields)[0]),
    });
  };
  return (
    <Sheet open={Boolean(cohort)} onClose={onClose} title="Move to another course" closeLabel="Close">
      {cohort && (!courses.data ? <Loading rows={1} /> : eligible.length ? (
        <form className="rt-q__form" onSubmit={submit} noValidate>
          <p className="rt-acc__note">The dates, times, venue, tutor, places and price move with it.</p>
          <div className="rt-field">
            <label htmlFor="rt-coh-move-course">Course<Req /></label>
            {error && <p className="rt-q__err" id="rt-coh-move-course-e"><span className="rt-sr">Error: </span>{error}</p>}
            <FieldSelect id="rt-coh-move-course" label="Course" value={courseId} onChange={(v) => { setCourseId(v); setError(""); }} placeholder="Choose a course"
              options={eligible.map((c) => ({ value: String(c.id), label: c.status === "live" ? c.title : `${c.title} (${COURSE_STATUS[c.status] ?? c.status})` }))} />
          </div>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={move.isPending} aria-busy={move.isPending || undefined}>{move.isPending ? "Moving…" : "Move cohort"}</button>
        </form>
      ) : (
        <p className="rt-acc__note">None of your other courses is taught {cohort.method === "live-online" ? "live online" : "in the classroom"}.</p>
      ))}
    </Sheet>
  );
}
const COURSE_STATUS = { draft: "Draft", changes: "Changes asked", pending: "Waiting for review", paused: "Paused" };

export function DeleteSheet({ cohort, onClose, onDone }) {
  const { organisationId } = useProviderAccess();
  const remove = api.provider.cohorts.remove.useMutation();
  const [error, setError] = useState("");
  return (
    <Sheet open={Boolean(cohort)} onClose={() => { setError(""); onClose(); }} title="Delete this cohort?" closeLabel="Close" noClose>
      {cohort && (
        <div className="rt-q__form">
          <p className="rt-acc__note">{cohort.courseTitle}, {dayRange(cohort.startsOn, cohort.endsOn)}, is removed for good.</p>
          {error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
          <div className="rt-pws-set__actions">
            <button type="button" className="button -md -outline-red-3 text-red-3" disabled={remove.isPending} onClick={() => remove.mutate({ organisationId, cohortId: cohort.id }, { onSuccess: onDone, onError: (e) => setError(errorsFrom(e).general) })}>{remove.isPending ? "Deleting…" : "Delete cohort"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onClose}>Cancel</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ---- create and edit -------------------------------------------------------------------------------------------------------

const money = (pence) => (pence == null ? "" : (pence / 100).toFixed(2).replace(/\.00$/, ""));
const PRICE_RE = /^\d+(\.\d{1,2})?$/;
const MAX_PRICE = 100000; // pounds (the API's limit)
// the API's limits on a date's sessions (schedule.mts): how many, how long one lasts, how far ahead
const MAX_SESSIONS = 60;
const MAX_SESSION_DAYS = 31;
const MAX_AHEAD_DAYS = 3 * 366;
const MEETING_LINK_ERROR = "Use the https link to one Zoom, Microsoft Teams or Google Meet meeting, like https://zoom.us/j/1234567890.";
// the API's names for the form's fields, where they differ
const FIELD_OF = { pricePence: "price", wasPricePence: "wasPrice" };
const FORM_FIELDS = new Set(["method", "courseId", "sessions", "venueId", "joinUrl", "price", "wasPrice", "planId", "capacity", "details", "tutorUserId"]);
// a plan's packages in one line, for the plan picker ("Basic £249 · Plus £299 · Pro £399")
const planLine = (p) => p.tiers.map((t) => `${t.name} ${formatPrice(t.pricePence / 100)}`).join(" · ");

// a course's learning options taught on dates (classroom, live online), its primary first; `open`: only the ones taking bookings
// (new dates are only for those: the API refuses one for an option whose new bookings were stopped)
const datedOf = (c, { open = false } = {}) => waysOf(c, { open }).filter(isDatedMethod);

// The panel for one cohort. `cohort` (from the list) edits it; otherwise it creates one, asking which course (or for
// `suggestCourseId`). New dates are for one of the course's dated learning options: `mode` (the list's Classroom / Live online tab)
// picks the one the form starts on, a suggested course starts on its first, and one offering both asks which. Dates keep theirs.
export function CohortForm({ open, onClose, suggestCourseId = "", mode = "", cohort = null, onSaved, onAnother }) {
  const links = useWorkspaceLinks();
  const { organisationId } = useProviderAccess();
  const formRef = useRef(null);
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  // another of the provider's courses is at the venue at the same time: said under the Venue field as soon as a venue and dates are
  // chosen (the API's venueClash, below); saving with it shown tells the API the provider has seen it (the venue has another room).
  // `venueAsk`: the same words when only the save found it (the check not back yet, or dates added elsewhere at that moment)
  const [venueAsk, setVenueAsk] = useState("");
  // a venue being added from here (it saves as a normal venue, and the date picks it)
  const [addingVenue, setAddingVenue] = useState(false);
  const [venueAdded, setVenueAdded] = useState("");
  const [view, setView] = useState(() => monthStart(todayIso()));
  const [studyMode, setStudyMode] = useState("classroom");
  // how the calendar picks: "range" (first day, then last day: one session) or "days" (each click one day); `anchor` is the
  // first day of a range still waiting for its last day
  const [pickMode, setPickMode] = useState("range");
  const [anchor, setAnchor] = useState(null);
  // the form as it was filled (or last saved): while it differs, leaving the page asks first (lib/unsavedChanges.js)
  const [start, setStart] = useState(null);
  const unsaved = Boolean(open && f && start !== null && JSON.stringify(f) !== start);
  useUnsavedChanges(unsaved);
  const on = { enabled: open && Boolean(organisationId) };
  const coursesQ = api.provider.courses.list.useQuery({ organisationId }, on);
  const venuesQ = api.provider.venues.list.useQuery({ organisationId }, on);
  const tutorsQ = api.provider.cohorts.tutors.useQuery({ organisationId }, { ...on, retry: false });
  const plansQ = api.provider.plans.list.useQuery({ organisationId }, { ...on, retry: false });
  const plans = plansQ.data || [];
  const create = api.provider.cohorts.create.useMutation();
  const update = api.provider.cohorts.update.useMutation();
  const utils = api.useUtils();
  const courses = coursesQ.data || [];
  const courseOf = (id) => courses.find((c) => String(c.id) === String(id));

  // pricing: "flat" (the date's own price) or "tiered" (a price plan's packages, Tiered)
  const blankFor = (c) => ({ courseId: c ? String(c.id) : "", sessions: [], tutorUserId: "", venueId: "", joinUrl: "", pricing: "flat", planId: "", price: "", wasPrice: "", capacity: "12", details: "", colour: "" });

  // fill the form each time the panel opens (once the courses are in)
  useEffect(() => {
    if (!open || !coursesQ.data) return;
    if (cohort) {
      const filled = { courseId: String(cohort.courseId), sessions: cohort.sessions.map((s) => ({ ...s })), tutorUserId: cohort.tutorUserId || "", venueId: cohort.venueId || "", joinUrl: cohort.joinUrl || "", pricing: cohort.planId ? "tiered" : "flat", planId: cohort.planId || "", price: cohort.planId ? "" : money(cohort.pricePence), wasPrice: cohort.planId ? "" : money(cohort.wasPricePence), capacity: String(cohort.capacity), details: cohort.details || "", colour: cohort.colour || "" };
      setF(filled);
      setStart(JSON.stringify(filled));
      setView(monthStart(cohort.startsOn || todayIso()));
      setPickMode(cohort.sessions.length > 1 && cohort.sessions.every((s) => !s.end || s.end === s.date) ? "days" : "range");
    } else {
      const c = courseOf(suggestCourseId);
      const ways = c ? datedOf(c, { open: true }) : [];
      const blank = blankFor(ways.length ? c : null);
      setF(blank);
      setStart(JSON.stringify(blank));
      setView(monthStart(todayIso()));
      setPickMode("range");
      setStudyMode(ways.includes(mode) ? mode : ways[0] || (mode === "live-online" ? "live-online" : "classroom"));
    }
    setErrors({});
    setVenueAsk("");
    setAnchor(null);
    setAddingVenue(false);
    setVenueAdded("");
  }, [open, Boolean(coursesQ.data)]); // eslint-disable-line react-hooks/exhaustive-deps -- fill once per opening

  // not tied to `open`, so the filled form stays in place while the sheet closes
  const ready = Boolean(f && venuesQ.data);
  const course = ready ? courseOf(f.courseId) : null;
  const method = cohort ? cohort.method : studyMode;
  const today = todayIso();
  // the shared-venue check: once a classroom date has its course, venue and complete sessions (a finish after its start)
  const clashSessions = (f?.sessions || []).map((x) => ({ ...x, end: x.end || x.date }));
  const clashReady = Boolean(open && f && method === "classroom" && f.courseId && f.venueId && clashSessions.length && clashSessions.length <= 60 && clashSessions.every((x) => x.end > x.date || x.to > x.from));
  const clashQ = api.provider.cohorts.venueClash.useQuery(
    { organisationId, courseId: Number(f?.courseId) || 1, venueId: f?.venueId || "00000000-0000-0000-0000-000000000000", sessions: clashSessions.length ? clashSessions : [{ date: today, end: today, from: "09:00", to: "17:00" }], ...(cohort ? { cohortId: cohort.id } : {}) },
    { enabled: clashReady, retry: false, staleTime: 15_000 },
  );
  const venueNote = clashReady ? clashQ.data?.note || venueAsk : "";
  // changing a field takes its message away (the next save checks everything again)
  const set = (patch) => {
    setF((x) => ({ ...x, ...patch }));
    if ("venueId" in patch || "sessions" in patch) setVenueAsk("");
    setErrors((e) => (Object.keys(patch).some((k) => e[k]) ? { ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) } : e));
  };
  const venueSaved = async (r) => {
    await venuesQ.refetch();
    set({ venueId: r.id });
    setAddingVenue(false);
    setVenueAdded(r.located ? "Venue added and chosen for these dates." : r.unchecked ? "Venue added and chosen. We couldn't check its town just now; we'll try again." : "Venue added and chosen. We couldn't find its postcode on the map, so check it in Venues.");
    setErrors((e) => ({ ...e, venueId: undefined }));
  };
  const venueForm = <VenueForm inline idPrefix="rt-cf-v" onSaved={venueSaved} onCancel={() => setAddingVenue(false)} />;

  const endOf = (s) => s.end || s.date;
  const daySpan = (s) => {
    const n = daysBetween(s.date, endOf(s)) + 1;
    return n === 1 ? shortDay(s.date) : `${shortDay(s.date)} – ${shortDay(endOf(s))} (${n} days)`;
  };
  const openRange = (list) => (anchor ? list.find((s) => s.date === anchor && endOf(s) === anchor) : null);
  const pickDay = (iso) => {
    const r = pickOn(f.sessions, pickMode === "range" ? openRange(f.sessions) : null, iso, pickMode);
    setF((x) => ({ ...x, sessions: r.sessions }));
    setVenueAsk("");
    setAnchor(r.anchor);
    setErrors((e) => ({ ...e, sessions: undefined }));
    // the session this click added or changed, so its card is brought into view in the list
    const had = new Set(f.sessions.map((s) => `${s.date}/${endOf(s)}`));
    const picked = r.sessions.find((s) => !had.has(`${s.date}/${endOf(s)}`));
    setShown(picked ? { date: picked.date } : null);
  };
  // on a computer the list scrolls inside itself: move only the list (never the pop-up) to the row just picked on the calendar;
  // only on a calendar click (a new `shown` each time), never when a time or anything else in the list changes
  const [shown, setShown] = useState(null);
  const listRef = useRef(null);
  useEffect(() => {
    const list = listRef.current;
    const card = shown && list?.querySelector(`[data-date="${shown.date}"]`);
    if (!card || list.scrollHeight <= list.clientHeight) return;
    const top = card.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    if (top < list.scrollTop || top + card.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTo({ top: top - 4, behavior: "smooth" });
  }, [shown]);
  const setSlot = (i, patch) => {
    setF((x) => ({ ...x, sessions: x.sessions.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
    setVenueAsk("");
  };

  // "Save and create another": the form stays open for the same course and settings
  const save = async (e, another = false) => {
    e.preventDefault();
    setPressed(another ? "another" : "save");
    setSavedNote("");
    const err = {};
    if (!f.courseId) err.courseId = "Choose the course this cohort is for.";
    if (!f.sessions.length) err.sessions = "Pick at least one date on the calendar.";
    else if (f.sessions.length > MAX_SESSIONS) err.sessions = `Add up to ${MAX_SESSIONS} sessions.`;
    const firstNow = cohort?.startsOn;
    const latest = addDays(today, MAX_AHEAD_DAYS);
    f.sessions.forEach((s, i) => {
      if (s.date < today && s.date !== firstNow && (!cohort || s.date < firstNow)) err[`d${i}`] = "The start date can't be in the past.";
      else if ((s.end || s.date) === s.date && s.to <= s.from) err[`d${i}`] = "The end time must be after the start time.";
      else if (daysBetween(s.date, s.end || s.date) > MAX_SESSION_DAYS) err[`d${i}`] = `A session can last up to ${MAX_SESSION_DAYS} days. Add longer courses as several sessions.`;
      else if ((s.end || s.date) > latest) err[`d${i}`] = "Dates can be up to 3 years ahead.";
    });
    if (method === "classroom" && !f.venueId) err.venueId = "Choose the venue.";
    if (method === "live-online" && !f.joinUrl.trim()) err.joinUrl = "Enter the joining link for these dates.";
    else if (method === "live-online" && !isMeetingLink(f.joinUrl.trim())) err.joinUrl = MEETING_LINK_ERROR;
    const tiered = f.pricing === "tiered";
    if (tiered && !f.planId) err.planId = "Choose the price plan learners pick their package from.";
    if (!tiered && (!PRICE_RE.test(f.price) || Number(f.price) < 1)) err.price = "Enter the price per learner in pounds, like 95.";
    else if (!tiered && Number(f.price) > MAX_PRICE) err.price = "Enter a price of £100,000 or less.";
    if (!tiered && f.wasPrice && (!PRICE_RE.test(f.wasPrice) || Number(f.wasPrice) <= Number(f.price))) err.wasPrice = "Enter a “was” price higher than the price, or leave it empty.";
    else if (!tiered && f.wasPrice && Number(f.wasPrice) > 2 * Number(f.price)) err.wasPrice = "The “was” price can’t be more than double the price.";
    else if (!tiered && f.wasPrice && Number(f.wasPrice) > MAX_PRICE) err.wasPrice = "Enter a “was” price of £100,000 or less.";
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
      ...(tiered ? { planId: f.planId } : { planId: null, pricePence: Math.round(Number(f.price) * 100), wasPricePence: f.wasPrice ? Math.round(Number(f.wasPrice) * 100) : null }),
      details: f.details.trim() || null,
      tutorUserId: f.tutorUserId || null,
      colour: f.colour || null,
      bookable: cohort ? cohort.bookable : true,
      // "Save anyway": the provider has seen that another course is at the venue then
      ...(method === "classroom" && venueNote ? { sharedVenue: true } : {}),
    };
    try {
      // an edit sends the version it was filled from, so one over a colleague's newer change is refused instead of undoing it
      const id = cohort ? (await update.mutateAsync({ ...values, cohortId: cohort.id, seen: cohort.updatedAt ? new Date(cohort.updatedAt).toISOString() : undefined }), cohort.id) : (await create.mutateAsync({ ...values, courseId: Number(f.courseId), method })).id;
      if (another) {
        const first = values.sessions[0]?.date;
        setF((x) => {
          const next = { ...x, sessions: [] };
          setStart(JSON.stringify(next)); // saved: only the next cohort's dates are new
          return next;
        });
        setAnchor(null);
        setErrors({});
        setVenueAsk("");
        setVenueAdded("");
        // the form stays open, so the confirmation shows in it (the page's message is behind the form)
        setSavedNote(`Cohort saved${first ? ` (starting ${new Date(`${first}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})` : ""}. Pick the dates for the next one.`);
        onAnother?.(id, { method, startsOn: values.sessions[0]?.date });
        requestAnimationFrame(() => formRef.current?.firstElementChild?.scrollIntoView({ block: "start" }));
        return;
      }
      setStart(JSON.stringify(f)); // saved, so closing or leaving doesn't ask
      // what was saved, so a page counting dates (the course editor) can count it at once, before it loads again
      onSaved?.(id, { method, startsOn: values.sessions[0]?.date });
    } catch (error) {
      const { fields, general } = errorsFrom(error);
      if (fields.sharedVenue) {
        setErrors({});
        setVenueAsk(fields.sharedVenue);
        requestAnimationFrame(() => document.getElementById("rt-cf-venuenote")?.scrollIntoView({ block: "center" }));
        return;
      }
      const named = Object.fromEntries(Object.entries(fields).map(([k, m]) => [FIELD_OF[k] || k, m]));
      // one the form has no place for (it shouldn't happen) is said above the buttons, so no refusal goes unseen
      const stray = Object.keys(named).filter((k) => !FORM_FIELDS.has(k)).map((k) => named[k])[0];
      setErrors({ ...named, form: general || stray || "" });
      // changed by someone else since the form was filled: the list and the dates load again, ready for when it is reopened
      if (error?.data?.code === "CONFLICT" && /changed somewhere else/i.test(error.message)) Promise.all([utils.provider.cohorts.list.invalidate(), utils.provider.cohorts.get.invalidate()]);
      requestAnimationFrame(() => focusFirstError(formRef.current));
    }
  };
  const busy = create.isPending || update.isPending;
  // which button is saving, so only that one says "Saving…"
  const [pressed, setPressed] = useState(null);
  const [savedNote, setSavedNote] = useState("");
  useEffect(() => {
    if (!open) setSavedNote("");
  }, [open]);

  const err = (key) => errors[key] && <p className="rt-q__err" id={`rt-cf-${key}-e`}><span className="rt-sr">Error: </span>{errors[key]}</p>;
  const aria = (key) => ({ "aria-invalid": errors[key] ? true : undefined, "aria-describedby": errors[key] ? `rt-cf-${key}-e` : undefined });

  // the courses offering the chosen way; a suggested course offering both dated ways asks which these dates are
  const datedCourses = courses.filter((c) => datedOf(c, { open: true }).includes(studyMode));
  const askMode = !cohort && (!suggestCourseId || (course && datedOf(course, { open: true }).length > 1));
  const tutors = tutorsQ.data || [];
  const venues = ready ? venuesQ.data.filter((v) => v.active || v.id === f.venueId) : [];
  const ordered = ready ? f.sessions.map((s, i) => ({ s, i })).sort((a, b) => a.s.date.localeCompare(b.s.date)) : [];

  return (
    <Sheet open={open} onClose={onClose} unsaved={unsaved} title={cohort ? "Edit cohort" : "Create cohort"} closeLabel="Close" className="rt-pws-coh__sheet">
      {/* its courses or venues didn't load: said, with Try again, instead of loading for ever */}
      {open && !ready && (coursesQ.isError || venuesQ.isError
        ? <ErrorState title="We couldn't load the form." text="Check your connection, then try again." onRetry={() => { coursesQ.refetch(); venuesQ.refetch(); }} />
        : <Loading rows={2} />)}
      {ready && (
        <form className="rt-q__form rt-pws-coh__form" onSubmit={save} noValidate ref={formRef}>
          {savedNote && <p className="rt-acc__notice -ok" role="status">{savedNote}</p>}
          {askMode && (
            <fieldset className="rt-field rt-pws-ce__ways" aria-describedby={errors.method ? "rt-cf-mode-e" : undefined}>
              <legend>Learning option</legend>
              {errors.method && <p className="rt-q__err" id="rt-cf-mode-e"><span className="rt-sr">Error: </span>{errors.method}</p>}
              <WayCards name="rt-cf-mode" value={studyMode} invalid={Boolean(errors.method)}
                onChange={(v) => { setStudyMode(v); setErrors((e) => ({ ...e, method: undefined })); if (course && !datedOf(course, { open: true }).includes(v)) setF((x) => ({ ...blankFor(null), sessions: x.sessions })); }}
                options={pw.formats.filter((x) => (course && suggestCourseId ? datedOf(course, { open: true }) : ["classroom", "live-online"]).includes(x.key)).map((x) => ({ value: x.key, label: methodName(x.key), text: x.text }))} />
            </fieldset>
          )}
          {!cohort && !(suggestCourseId && course) ? (
            <div className="rt-field">
              <label htmlFor="rt-cf-courseId">Course<Req /></label>
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

          {/* the calendar picks the days; beside it, the dates picked as one row each (its days and its times), in a panel as tall as
              the calendar that scrolls inside itself on a computer */}
          <div className="rt-pws-coh__dates">
            <div className="rt-pws-coh__pickcol">
              <Choice name="rt-cf-pick" legend="How does the course run?" value={pickMode} onChange={(v) => { setPickMode(v); setAnchor(null); }}
                options={[{ value: "range", label: "Date range" }, { value: "days", label: "Individual days" }]} />
              <DatePicker view={view} setView={setView} sessions={f.sessions} anchor={pickMode === "range" && openRange(f.sessions) ? anchor : null} mode={pickMode} onPick={pickDay} min={cohort ? "" : today} />
            </div>
            <section className="rt-pws-coh__slots" aria-labelledby="rt-cf-slots-h">
              <div className="rt-pws-coh__slotpanel">
                <h3 className="rt-pws-coh__h3" id="rt-cf-slots-h">Selected dates<Req /></h3>
                <p className="rt-acc__note">Pick days on the calendar. Times are copied from the latest date.</p>
                {err("sessions")}
                {/* what is picked, in words, said aloud after each click */}
                <p className="rt-sr" aria-live="polite">{ordered.map(({ s }) => `${daySpan(s)}, ${s.from} to ${s.to}`).join("; ")}</p>
                <div className="rt-pws-coh__slotscroll">
                  {ordered.length === 0 ? (
                    <p className="rt-pws-coh__noslot">No dates picked yet.</p>
                  ) : (
                    <ol className="rt-pws-coh__slotlist rt-pill-scroll" ref={listRef}>
                      {ordered.map(({ s, i }, n) => (
                        <li key={`${s.date}-${i}`} className="rt-pws-coh__slot" data-date={s.date}>
                          <p className="rt-pws-coh__slotday">{daySpan(s)}</p>
                          {/* the course page lists a run only before its first day (the API's listings: starts_on after today), so the
                              first date says so when it is today or has passed */}
                          {n === 0 && s.date <= today && <p className="rt-pws-coh__slotnote">{s.date === today ? "Starts today" : "Already started"}, so it won&apos;t show on the course page.</p>}
                          {err(`d${i}`)}
                          <div className="rt-pws-coh__slottimes">
                            <label className="rt-sr" htmlFor={`rt-cf-f${i}`}>From, {daySpan(s)}</label>
                            <FieldSelect id={`rt-cf-f${i}`} label="From" value={s.from} onChange={(value) => setSlot(i, { from: value })} options={TIMES} invalid={Boolean(errors[`d${i}`])} describedBy={errors[`d${i}`] ? `rt-cf-d${i}-e` : undefined} />
                            <span aria-hidden="true">–</span>
                            <label className="rt-sr" htmlFor={`rt-cf-t${i}`}>To, {daySpan(s)}</label>
                            <FieldSelect id={`rt-cf-t${i}`} label="To" value={s.to} onChange={(value) => setSlot(i, { to: value })} options={TIMES} />
                          </div>
                          <button type="button" className="rt-pws-coh__remove" onClick={() => { setF((x) => ({ ...x, sessions: x.sessions.filter((_, j) => j !== i) })); setVenueAsk(""); }}>Remove<span className="rt-sr"> {daySpan(s)}</span></button>
                        </li>
                      ))}
                    </ol>
                  )}
                  {ordered.length > 0 && <FilterScrollPill scrollRef={listRef} watch={ordered.length} />}
                </div>
              </div>
            </section>
          </div>

          <section className="rt-pws-coh__settings" aria-labelledby="rt-cf-set-h">
            <h3 className="rt-pws-coh__h3" id="rt-cf-set-h">Cohort settings</h3>
            <div className={`rt-pws-coh__setgrid${method === "classroom" ? " -top" : ""}`}>
              {tutors.length > 0 && (
                <div className="rt-field">
                  <label htmlFor="rt-cf-tutorUserId">Tutor</label>
                  {err("tutorUserId")}
                  <FieldSelect id="rt-cf-tutorUserId" label="Tutor" value={f.tutorUserId} onChange={(value) => set({ tutorUserId: value })} options={tutorOptions(tutors, cohort)} />
                </div>
              )}
              {method === "classroom" && (
                <div className="rt-field">
                  <label htmlFor="rt-cf-venueId">Venue<Req /></label>
                  {err("venueId")}
                  <FieldSelect id="rt-cf-venueId" label="Venue" placeholder={venues.length ? "Choose a venue" : "No venues yet"} value={f.venueId} onChange={(value) => set({ venueId: value })} options={venues.map((v) => ({ value: v.id, label: `${v.name}, ${v.city}` }))} invalid={Boolean(errors.venueId)} describedBy={aria("venueId")["aria-describedby"]} />
                  {venueAdded && <p className="rt-acc__note rt-pws-coh__added" role="status">{venueAdded}</p>}
                  {venueNote && <p className="rt-acc__notice -warn" id="rt-cf-venuenote" role="status">{venueNote}</p>}
                  {venues.length > 0 && (addingVenue ? venueForm : <button type="button" className="rt-cd__link rt-pws-coh__hintlink" onClick={() => setAddingVenue(true)}>Add a new venue</button>)}
                </div>
              )}
              {method === "live-online" && (
                <div className="rt-field">
                  <label htmlFor="rt-cf-joinUrl">Joining link<Req /></label>
                  <p className="rt-acc__note" id="rt-cf-joinUrl-h">The Zoom, Teams or Google Meet meeting learners join, like https://zoom.us/j/1234567890. Once online booking opens, learners get it before the first session.</p>
                  {err("joinUrl")}
                  <input id="rt-cf-joinUrl" type="url" inputMode="url" value={f.joinUrl} onChange={(e) => set({ joinUrl: e.target.value })} autoComplete="url" aria-invalid={errors.joinUrl ? true : undefined} aria-describedby={`rt-cf-joinUrl-h${errors.joinUrl ? " rt-cf-joinUrl-e" : ""}`} />
                </div>
              )}
            </div>
            <Choice name="rt-cf-pricing" legend="Pricing" value={f.pricing} onChange={(v) => { set({ pricing: v }); setErrors((e) => ({ ...e, price: undefined, wasPrice: undefined, planId: undefined })); }}
              options={[{ value: "flat", label: "Flat: one price" }, { value: "tiered", label: "Tiered: packages from a price plan" }]} />
            {f.pricing === "tiered" && (
              <div className="rt-field">
                <label htmlFor="rt-cf-planId">Price plan<Req /></label>
                <p className="rt-field__hint" id="rt-cf-planId-h">
                  Learners choose a package when they book, and the date shows the cheapest package as its price.{" "}
                  <Link href={links.plans()} className="rt-cd__link">{plans.length ? "Manage price plans" : "Create a price plan first"}</Link>
                </p>
                {err("planId")}
                <FieldSelect id="rt-cf-planId" label="Price plan" placeholder={plans.length ? "Choose a price plan" : "No price plans yet"} value={f.planId} onChange={(value) => set({ planId: value })}
                  options={plans.filter((p) => !p.archived || p.id === cohort?.planId).map((p) => ({ value: p.id, label: `${p.name}: ${planLine(p)}` }))}
                  invalid={Boolean(errors.planId)} describedBy={`rt-cf-planId-h${errors.planId ? " rt-cf-planId-e" : ""}`} />
              </div>
            )}
            <div className="rt-pws-coh__setgrid">
              {f.pricing === "flat" && (
                <>
                  <div className="rt-field">
                    <label htmlFor="rt-cf-price">Price per learner, including VAT (£)<Req /></label>
                    {err("price")}
                    <input id="rt-cf-price" type="text" inputMode="decimal" value={f.price} onChange={(e) => set({ price: e.target.value.replace(/£|,/g, "").trim() })} autoComplete="off" {...aria("price")} />
                  </div>
                  <div className="rt-field">
                    <label htmlFor="rt-cf-wasPrice">“Was” price (£)</label>
                    {err("wasPrice")}
                    <input id="rt-cf-wasPrice" type="text" inputMode="decimal" value={f.wasPrice} onChange={(e) => set({ wasPrice: e.target.value.trim() })} autoComplete="off" {...aria("wasPrice")} />
                  </div>
                </>
              )}
              <div className="rt-field">
                <label htmlFor="rt-cf-capacity">Number of places<Req /></label>
                {err("capacity")}
                <input id="rt-cf-capacity" type="number" inputMode="numeric" min="1" max="200" step="1" value={f.capacity} onChange={(e) => set({ capacity: e.target.value })} autoComplete="off" {...aria("capacity")} />
              </div>
            </div>
            <div className="rt-field">
              <label htmlFor="rt-cf-details">Cohort structure</label>
              <p className="rt-field__hint" id="rt-cf-details-h">For example weekends, day release or certain days. Learners see it under the dates.</p>
              {err("details")}
              <TextArea id="rt-cf-details" rows={3} maxLength={500} value={f.details} onChange={(e) => set({ details: e.target.value })} aria-invalid={errors.details ? true : undefined} aria-describedby={`rt-cf-details-h${errors.details ? " rt-cf-details-e" : ""}`} autoComplete="off" />
            </div>
            <fieldset className="rt-pws-coh__colours">
              <legend>Calendar colour</legend>
              <div className="rt-pws-coh__swatches">
                {pw.cohortColours.map((c) => {
                  const on = (f.colour || defaultColour(method)) === c.key;
                  return (
                    <label key={c.key} className={`rt-pws-coh__swatch -c-${c.key}${on ? " is-on" : ""}`}>
                      <input type="radio" name="rt-cf-colour" className="rt-sr" value={c.key} checked={on} onChange={() => set({ colour: c.key })} />
                      <span aria-hidden="true"></span><span className="rt-sr">{c.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </section>
          {errors.form && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{errors.form}</p>}
          <div className="rt-pws-coh__formfoot">
            <button type="submit" className="button -md -purple-1 text-white" disabled={busy} aria-busy={(busy && pressed !== "another") || undefined}>{busy && pressed !== "another" ? "Saving…" : cohort ? "Save changes" : "Save cohort"}</button>
            {!cohort && <button type="button" className="button -md -outline-purple-1 text-purple-1" disabled={busy} aria-busy={(busy && pressed === "another") || undefined} onClick={(e) => save(e, true)}>{busy && pressed === "another" ? "Saving…" : "Save and create another"}</button>}
          </div>
        </form>
      )}
    </Sheet>
  );
}

// Two months of days. Arrow keys move between days (one tab stop for the whole calendar); Enter or Space picks.
// A click on the cohort form's calendar: the sessions after it, and the first day of a range left waiting for its last day.
// A day already picked takes its session away. Separate days ("days"): any other day is one more one-day session. Date range:
// the first click is a one-day session (a one-day course is one click) and waits (`open`); the next click sets its last day (an
// earlier day becomes the new first day instead, and the first day again clears it), and a session it runs over is taken into
// it, as sessions can't overlap; after that a click starts a new range. A new session copies the latest one's times.
function pickOn(list, open, iso, mode) {
  const endOf = (s) => s.end || s.date;
  const inside = list.find((s) => s !== open && iso >= s.date && iso <= endOf(s));
  if (open && iso === open.date) return { sessions: list.filter((s) => s !== open), anchor: null };
  if (open && iso > open.date) return { sessions: list.filter((s) => s === open || endOf(s) < open.date || s.date > iso).map((s) => (s === open ? { ...s, end: iso } : s)), anchor: null };
  if (open) return { sessions: list.filter((s) => s !== inside).map((s) => (s === open ? { ...s, date: iso, end: iso } : s)), anchor: iso };
  if (inside) return { sessions: list.filter((s) => s !== inside), anchor: null };
  const latest = list[list.length - 1];
  return { sessions: [...list, { date: iso, end: iso, from: latest?.from || DEFAULT_SLOT.from, to: latest?.to || DEFAULT_SLOT.to }], anchor: mode === "range" ? iso : null };
}

// The cohort form's two-month calendar. Each session shows as its first and last day filled and the days between banded;
// while a range waits for its last day (`anchor`), the days up to the one under the mouse or the keyboard are banded too.
function DatePicker({ view, setView, sessions, anchor, mode, onPick, min }) {
  const today = todayIso();
  const [focusDay, setFocusDay] = useState(null);
  const [overDay, setOverDay] = useState(null);
  const gridRef = useRef(null);
  const months = [view, addMonths(view, 1)];
  const starts = sessions.map((s) => s.date).sort();
  const active = focusDay || (starts.length ? starts[0] : today);
  const reach = anchor && overDay > anchor ? overDay : null; // the last day a click would give the waiting range
  const look = (iso) => {
    const s = sessions.find((x) => iso >= x.date && iso <= (x.end || x.date));
    if (s) return { on: true, cls: iso === s.date || iso === (s.end || s.date) ? " is-on" : " is-mid" };
    if (reach && iso > anchor && iso <= reach) return { on: false, cls: iso === reach ? " is-reach" : " is-mid" };
    return { on: false, cls: "" };
  };
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
    <div className="rt-pws-coh__picker" ref={gridRef} onMouseLeave={() => setOverDay(null)}>
      <div className="rt-pws-coh__pickhead">
        <button type="button" className="rt-pws-cal__nav" onClick={() => setView(addMonths(view, -1))} disabled={Boolean(min) && view <= monthStart(min)} aria-label="Previous month"><i className="icon-chevron-left text-12" aria-hidden="true"></i></button>
        <p className="rt-pws-coh__pickhint">{mode === "days" ? "Click each day the course runs" : anchor ? "Now click the last day" : "Click the first day, then the last day"}</p>
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
                      const { on, cls } = look(iso);
                      const past = Boolean(min) && iso < min;
                      return (
                        <td key={di}>
                          <button
                            type="button"
                            data-day={iso}
                            className={`rt-pws-coh__day${cls}${iso === today ? " is-today" : ""}`}
                            aria-pressed={on}
                            aria-label={`${longDay(iso)}${iso === today ? ", today" : ""}`}
                            disabled={past}
                            tabIndex={iso === tabDay ? 0 : -1}
                            onClick={() => { setFocusDay(iso); setOverDay(null); onPick(iso); }}
                            onMouseEnter={() => setOverDay(iso)}
                            onFocus={() => setOverDay(iso)}
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
