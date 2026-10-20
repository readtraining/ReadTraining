"use client";

import React, { Fragment, useRef, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { addCohortNote, addEnrolmentNote, bookResit, bulkEnrol, cancelCohort, issueCertificates, learnerName, customerName, logEmail, replaceLearner, rescheduleEnrolment, saveRecord, setAttendance, setCohortEnabled, setCohortStatus, setResult, setStudentStatus, timeRange, updateLearner, useProvider } from "@/lib/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { COHORT_TONE, Choice, Loading, ORDER_TONE, Pill, RowMenu, formatWhen } from "./providerParts";
import { CohortForm, Seats, dayRange } from "./ProviderCohorts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { methodName } from "@/lib/taxonomy";
import { EmptyState } from "@/components/states/States";
import DateField from "@/components/admin/DateField";

// Manage cohort, as Hurak's: the cohort's details (course, venue, status set by hand, session notes, dates, timings, students,
// whether it takes bookings, tutor), with Edit cohort details, Enroll student (a new order on these dates), Bulk enrolment (a
// file of people booked outside ReadTraining) and Manage curriculum. Then its students: each one's status, name and email, the
// customer who paid (name and email), pricing plan, sales channel, payment, notes and LMS access, an email button, the learner record, and a menu
// (Edit Details, Reschedule, Resit, Notes, Timeline). A row opens to the register (attended, result, certificate). Picked rows
// can be emailed together; "Email students" uses a template or a new message.

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const RESULTS = [{ value: "", label: "Not marked" }, { value: "pass", label: "Pass" }, { value: "fail", label: "Fail" }];
const STUDENT_TONE = { enrolled: "ok", rescheduled: "info", cancelled: "muted" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const customKey = (f) => (typeof f === "string" ? `custom-${slug(f)}` : f.key || `custom-${slug(f.label)}`);
const customLabel = (f) => (typeof f === "string" ? f : f.label);
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// a small form helper: label, error above the input, the input
function Field({ id, label, error, hint, children }) {
  return (
    <div className="rt-field">
      <label htmlFor={id}>{label}</label>
      {hint && <p className="rt-field__hint" id={`${id}-h`}>{hint}</p>}
      {error && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{error}</p>}
      {children}
    </div>
  );
}
const ariaFor = (id, error, hint) => ({ "aria-invalid": error ? true : undefined, "aria-describedby": [hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(" ") || undefined });

// The page's heading: the cohort's course and dates (the page head is drawn on the server, the cohorts live in this browser).
export function CohortTitle({ cohortId, fallback }) {
  const data = useProvider();
  const k = data?.byId.cohort[cohortId];
  return k?.course ? `${k.course.title}, ${dayRange(k.first, k.last)}` : fallback;
}

export default function ProviderCohort({ cohortId }) {
  const data = useProvider();
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [record, setRecord] = useState(null);
  const [mail, setMail] = useState(null); // { ids: [...] }
  const [details, setDetails] = useState(null);
  const [moving, setMoving] = useState(null);
  const [resit, setResit] = useState(null);
  const [notes, setNotes] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [cancelling1, setCancelling1] = useState(null);
  const [sessionNotes, setSessionNotes] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [picked, setPicked] = useState([]);
  const [open, setOpen] = useState([]);
  const [toast, setToast] = useState(null);

  if (!data) return <Loading rows={3} />;
  const k = data.byId.cohort[cohortId];
  if (!k) {
    return (
      <EmptyState title="This cohort was not found." text="It may have been removed." action={{ href: "/provider/cohorts", label: "All cohorts" }} />
    );
  }

  const course = k.course;
  const people = data.enrolments.filter((e) => e.cohortId === k.id).sort((a, b) => learnerName(a.learner).localeCompare(learnerName(b.learner)));
  const active = people.filter((e) => e.status !== "cancelled");
  const started = k.first <= data.today;
  const clr = course?.settings.clr || { enabled: false, fields: [], custom: [] };
  const toCertify = active.filter((e) => e.result === "pass" && !e.certificate).length;
  const where = k.venue ? `${k.venue.name}, ${k.venue.street}, ${k.venue.city} ${k.venue.postcode}` : "Online";
  const canCancel = !k.cancelled && k.status === "upcoming";
  const tutors = data.team.filter((t) => t.status === "active");
  const orderOf = (e) => data.orders.find((o) => o.ref === e.orderRef);
  const planOf = (e) => pw.tiers.find((t) => t.key === bookingPlan(data, e))?.label || "";
  const lms = Boolean(course?.curriculum?.length);
  const othersOfCourse = (e) => cohortChoices(data, e);
  const allPicked = people.length > 0 && picked.length === people.length;
  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleOpen = (id) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  const download = () => {
    const head = ["Status", "Name", "Email", "Phone", "Customer", "Order", "Plan", "Attended", "Result", "Certificate"];
    const rows = people.map((e) => [pw.studentStatuses[e.status || "enrolled"], learnerName(e.learner), e.learner?.email, e.learner?.phone, orderOf(e) ? customerName(orderOf(e).customer) : "", e.orderRef, planOf(e), e.attended === null ? "" : e.attended ? "Yes" : "No", e.result ? (e.result === "pass" ? "Pass" : "Fail") : "", e.certificate?.no || ""]);
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `register-${slug(course?.title || "cohort")}-${k.first}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const certify = () => {
    const n = issueCertificates(k.id);
    setToast({ message: `${n} ${n === 1 ? "certificate" : "certificates"} issued and emailed` });
  };
  const changeCohortStatus = (v) => {
    if (v === k.status) return;
    if (v === "cancelled") return setCancelling(true);
    setCohortStatus(k.id, v);
    setToast({ message: `Cohort status changed to ${pw.cohortStatuses[v]}` });
  };
  const changeStudentStatus = (e, v) => {
    if (v === (e.status || "enrolled")) return;
    if (v === "cancelled") return setCancelling1(e);
    setStudentStatus(e.id, v);
    setToast({ message: `${learnerName(e.learner)} is now ${pw.studentStatuses[v]}` });
  };

  return (
    <div className="rt-acc__stack">
      <section className="rt-acc__card" aria-labelledby="rt-coh-det-h">
        <div className="rt-acc__cardhead rt-adm-cardhead">
          <h2 className="rt-acc__h2" id="rt-coh-det-h">Cohort details</h2>
          {course && <Link href={`/provider/courses/${course.id}?tab=curriculum`} className="button -sm -outline-purple-1 text-purple-1">Manage curriculum</Link>}
        </div>
        <dl className="rt-pws-coh__details">
          <div><dt>Course</dt><dd>{course ? <Link href={`/provider/courses/${course.id}`} className="rt-adm-strong">{course.title || "Untitled course"}</Link> : "Course removed"}<small>{methodName(course?.format)}</small></dd></div>
          <div><dt>Dates</dt><dd>{dayRange(k.first, k.last)}{k.sessions.length > 1 && <small>{k.sessions.length} sessions</small>}</dd></div>
          <div><dt>Venue</dt><dd>{where}</dd></div>
          <div><dt>Timings</dt><dd>{[...new Set(k.sessions.map((s) => timeRange(s)))].join(", ")}</dd></div>
          <div>
            <dt><label htmlFor="rt-coh-status">Cohort status</label></dt>
            <dd>
              {k.cancelled ? <Pill tone={COHORT_TONE.cancelled}>{pw.cohortStatuses.cancelled}</Pill> : (
                <div className="rt-field rt-adm-select -inline">
                  <FieldSelect id="rt-coh-status" label="Cohort status" value={k.status} onChange={changeCohortStatus} options={Object.entries(pw.cohortStatuses).map(([value, label]) => ({ value, label }))} compact />
                </div>
              )}
            </dd>
          </div>
          <div><dt>Students</dt><dd><Seats booked={k.booked} max={k.max} /><small>{`${k.places.enrolled} enrolled · ${k.places.rescheduled} rescheduled · ${k.places.cancelled} cancelled`}</small></dd></div>
          <div><dt>Session notes</dt><dd><button type="button" className="rt-cd__link" onClick={() => setSessionNotes(true)}>{k.notes?.length ? `View notes (${k.notes.length})` : "View notes"}</button></dd></div>
          <div>
            <dt>Status</dt>
            <dd className="rt-pws-coh__inline">
              <Pill tone={k.disabled ? "muted" : "ok"}>{k.disabled ? "Disabled" : "Enabled"}</Pill>
              {!k.cancelled && <button type="button" className="rt-cd__link" onClick={() => { setCohortEnabled(k.id, k.disabled); setToast({ message: k.disabled ? "Bookings enabled" : "Bookings disabled" }); }}>{k.disabled ? "Enable bookings" : "Disable bookings"}</button>}
            </dd>
          </div>
          <div><dt>Tutor</dt><dd>{k.tutor ? k.tutor.name || k.tutor.email : <span className="rt-adm-muted">Not assigned</span>}</dd></div>
        </dl>
        {!k.cancelled && (
          <div className="rt-pws-coh__heroactions">
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setEditing(true)}>Edit cohort details</button>
            {!k.disabled && k.left > 0 && <Link href={`/provider/orders/new?cohort=${k.id}`} className="button -sm -purple-1 text-white">Enroll student</Link>}
            {!k.disabled && k.left > 0 && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setBulk(true)}>Bulk enrolment</button>}
            {canCancel && <button type="button" className="rt-pws-coh__remove rt-adm-danger" onClick={() => setCancelling(true)}>Cancel cohort</button>}
          </div>
        )}
        {k.cancelled && <p className="rt-adm-item__block">This cohort is cancelled. Booked learners were told and offered another date or a refund.</p>}
        {k.disabled && !k.cancelled && <p className="rt-acc__note">Bookings are turned off: this cohort is not offered to new learners.</p>}
      </section>

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-coh-ppl-h">
        <div className="rt-acc__cardhead rt-adm-cardhead rt-pws-coh__peoplehead">
          <h2 className="rt-acc__h2" id="rt-coh-ppl-h">Students</h2>
          <div className="rt-pws-coh__heroactions">
            {people.length > 0 && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setMail({ ids: picked.length ? picked : active.map((e) => e.id) })} disabled={!active.length}>{picked.length ? `Email ${picked.length} picked` : "Email students"}</button>}
            {people.length > 0 && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={download}>Download register</button>}
            {!k.cancelled && people.length > 0 && k.last <= data.today && <button type="button" className="button -sm -purple-1 text-white" onClick={certify} disabled={!toCertify}>Issue certificates{toCertify ? ` (${toCertify})` : ""}</button>}
          </div>
        </div>
        {people.length ? (
          <table className="rt-biz__table rt-adm-table rt-pws-coh__students">
              <thead>
                <tr>
                  <th scope="col" className="rt-pws-coh__pick">
                    <label className="rt-pws-coh__check">
                      <input type="checkbox" className="rt-fp__check" checked={allPicked} onChange={() => setPicked(allPicked ? [] : people.map((e) => e.id))} />
                      <span className="rt-sr">Pick all students</span>
                    </label>
                  </th>
                  <th scope="col"><span className="rt-sr">More</span></th>
                  <th scope="col">Student status</th>
                  <th scope="col">Student</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Pricing plan</th>
                  <th scope="col">Sales channel</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Notes</th>
                  <th scope="col">LMS access</th>
                  <th scope="col"><span className="rt-sr">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {people.map((e) => {
                  const name = learnerName(e.learner);
                  const o = orderOf(e);
                  const st = e.status || "enrolled";
                  const isOpen = open.includes(e.id);
                  const locked = !started || k.cancelled || st === "cancelled";
                  return (
                    <Fragment key={e.id}>
                      <tr className={picked.includes(e.id) ? "is-picked" : undefined}>
                        <td data-label="Pick" className="rt-pws-coh__pick">
                          <label className="rt-pws-coh__check">
                            <input type="checkbox" className="rt-fp__check" checked={picked.includes(e.id)} onChange={() => togglePick(e.id)} />
                            <span className="rt-sr">Pick {name}</span>
                          </label>
                        </td>
                        <td data-label="More">
                          <button type="button" className={`rt-pws-coh__expand${isOpen ? " is-open" : ""}`} aria-expanded={isOpen} aria-controls={`rt-coh-more-${e.id}`} onClick={() => toggleOpen(e.id)}>
                            <span aria-hidden="true">+</span><span className="rt-sr">Register for {name}</span>
                          </button>
                        </td>
                        <td data-label="Student status">
                          <div className="rt-field rt-adm-select -inline">
                            <label htmlFor={`rt-coh-ss-${e.id}`} className="rt-sr">Student status for {name}</label>
                            <FieldSelect id={`rt-coh-ss-${e.id}`} label={`Student status for ${name}`} value={st} onChange={(v) => changeStudentStatus(e, v)} options={Object.entries(pw.studentStatuses).map(([value, label]) => ({ value, label }))} disabled={st === "cancelled" || k.cancelled} compact />
                          </div>
                        </td>
                        <td data-label="Student"><Link href={`/provider/learners/${e.learnerId}`} className="rt-adm-strong">{name}</Link><small>{e.learner?.email}</small>{e.resitOf && <small>Resit</small>}</td>
                        <td data-label="Customer">{o ? <>{customerName(o.customer)}<small>{o.customer.email}</small></> : "—"}</td>
                        <td data-label="Pricing plan">{planOf(e) || <span className="rt-adm-muted">—</span>}</td>
                        <td data-label="Sales channel">{o ? pw.channels[o.channel] : "—"}</td>
                        <td data-label="Payment">{o ? <Pill tone={ORDER_TONE[o.status]}>{pw.orderStatuses[o.status]}</Pill> : "—"}</td>
                        <td data-label="Notes">{e.notes?.length ? <button type="button" className="rt-cd__link" onClick={() => setNotes(e)}>{`${e.notes.length} ${e.notes.length === 1 ? "note" : "notes"}`}<span className="rt-sr"> for {name}</span></button> : <span className="rt-adm-muted">—</span>}</td>
                        <td data-label="LMS access">{lms && st !== "cancelled" ? "Yes" : <span className="rt-adm-muted">—</span>}</td>
                        <td data-label="Actions">
                          <div className="rt-pws-coh__rowactions">
                            <button type="button" className="rt-icon-btn rt-pws-coh__icon" onClick={() => setMail({ ids: [e.id], single: true })} disabled={st === "cancelled"}>
                              <i className="icon-email text-16" aria-hidden="true"></i><span className="rt-sr">Email {name}</span>
                            </button>
                            {clr.enabled && (
                              <button type="button" className="rt-icon-btn rt-pws-coh__icon" onClick={() => setRecord(e)}>
                                <i className="icon-list text-16" aria-hidden="true"></i><span className="rt-sr">Learning record for {name}</span>
                              </button>
                            )}
                            <RowMenu label={`Actions for ${name}`} items={[
                              { label: "Edit Details", onClick: () => setDetails(e) },
                              ...(st !== "cancelled" && !k.cancelled ? [{ label: "Reschedule", onClick: () => setMoving(e) }, { label: "Resit", onClick: () => setResit(e) }] : []),
                              { label: "Notes", onClick: () => setNotes(e) },
                              { label: "Timeline", onClick: () => setTimeline(e) },
                            ]} />
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="rt-pws-coh__morerow" id={`rt-coh-more-${e.id}`}>
                          <td colSpan={11}>
                            <div className="rt-pws-coh__more">
                              <div><span>Order</span><Link href={`/provider/orders/${e.orderRef}`}>{e.orderRef}</Link></div>
                              <div><span>Phone</span>{e.learner?.phone || "—"}</div>
                              <div>
                                <span>Attended</span>
                                <label className="rt-pws-coh__check">
                                  <input type="checkbox" className="rt-fp__check" checked={Boolean(e.attended)} disabled={locked || Boolean(e.certificate)} onChange={(ev) => setAttendance(e.id, ev.target.checked)} />
                                  <span>{e.attended ? "Yes" : locked ? "Not yet" : "No"}</span>
                                  <span className="rt-sr"> attended, {name}</span>
                                </label>
                              </div>
                              <div>
                                <span>Result</span>
                                <div className="rt-field rt-adm-select -inline">
                                  <label htmlFor={`rt-coh-r-${e.id}`} className="rt-sr">Result for {name}</label>
                                  <FieldSelect id={`rt-coh-r-${e.id}`} label={`Result for ${name}`} value={e.result || ""} disabled={locked || !e.attended || Boolean(e.certificate)} onChange={(value) => setResult(e.id, value || null)} options={RESULTS} compact />
                                </div>
                              </div>
                              <div><span>Certificate</span>{e.certificate ? e.certificate.no : "—"}</div>
                              {st === "cancelled" && e.cancelReason && <div className="rt-pws-coh__morewide"><span>Cancellation reason</span>{e.cancelReason}</div>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
        ) : (
          <EmptyState inCard title="No students yet." text="Bookings from ReadTraining, your website and your own orders appear here." />
        )}
      </section>

      <CohortForm open={editing} onClose={() => setEditing(false)} cohort={k} onSaved={() => { setEditing(false); setToast({ message: "Cohort saved" }); }} />
      <RecordSheet enrolment={record} clr={clr} onClose={() => setRecord(null)} onSaved={() => { setRecord(null); setToast({ message: "Learner record saved" }); }} />
      <EmailSheet value={mail} people={people} cohort={k} orderOf={orderOf} onClose={() => setMail(null)} onSent={(n, to) => { setMail(null); setPicked([]); setToast({ message: to ? `Email sent to ${to}` : `Email sent to ${n} ${n === 1 ? "student" : "students"}` }); }} />
      <DetailsSheet enrolment={details} onClose={() => setDetails(null)} onSaved={(msg) => { setDetails(null); setToast({ message: msg }); }} />
      <MoveSheet enrolment={moving} options={moving ? othersOfCourse(moving) : []} course={course} onClose={() => setMoving(null)} onSaved={(msg) => { setMoving(null); setToast({ message: msg }); }} />
      <ResitSheet enrolment={resit} options={resit ? othersOfCourse(resit) : []} course={course} onClose={() => setResit(null)} onSaved={(msg) => { setResit(null); setToast({ message: msg }); }} />
      <NotesSheet title={notes ? `Notes: ${learnerName(notes.learner)}` : "Notes"} open={Boolean(notes)} list={notes ? data.enrolments.find((x) => x.id === notes.id)?.notes || [] : []} onAdd={(t) => addEnrolmentNote(notes.id, t)} onClose={() => setNotes(null)} />
      <NotesSheet title="Session notes" intro="Notes for your team about this cohort. Learners never see them." open={sessionNotes} list={k.notes || []} onAdd={(t) => addCohortNote(k.id, t)} onClose={() => setSessionNotes(false)} />
      <TimelineSheet enrolment={timeline ? data.enrolments.find((x) => x.id === timeline.id) : null} order={timeline ? orderOf(timeline) : null} onClose={() => setTimeline(null)} />
      <CancelBookingSheet enrolment={cancelling1} onClose={() => setCancelling1(null)} onSaved={(msg) => { setCancelling1(null); setToast({ message: msg }); }} />
      <BulkSheet open={bulk} cohort={k} onClose={() => setBulk(false)} onSaved={(n) => { setBulk(false); setToast({ message: `${n} ${n === 1 ? "student" : "students"} enrolled` }); }} />

      <Sheet open={cancelling} onClose={() => setCancelling(false)} title="Cancel this cohort?" closeLabel="Close">
        <div className="rt-q__form">
          <p className="rt-acc__note">{k.booked ? `The ${k.booked} booked ${k.booked === 1 ? "learner is" : "learners are"} told straight away and offered another date or a full refund.` : "Nobody is booked yet, so nobody needs to be told."} This can't be undone.</p>
          <div className="rt-pws-coh__actions">
            <button type="button" className="button -md -purple-1 text-white" onClick={() => { cancelCohort(k.id); setCancelling(false); setToast({ message: "Cohort cancelled" }); }}>Cancel cohort</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setCancelling(false)}>Keep it</button>
          </div>
        </div>
      </Sheet>
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

// other dates of a booking's course it can move to (reschedule, resit): upcoming, taking bookings, with places, and not one the
// learner is already on
export const cohortChoices = (data, e) => data.cohorts
  .filter((x) => x.courseId === e.courseId && x.id !== e.cohortId && !x.cancelled && !x.disabled && x.status === "upcoming" && x.left > 0)
  .filter((x) => !data.enrolments.some((z) => z.learnerId === e.learnerId && z.cohortId === x.id && z.status !== "cancelled"))
  .sort((a, b) => a.first.localeCompare(b.first));
// a booking's pricing plan: an upsell's, otherwise its order line's
export const bookingPlan = (data, e) => {
  if (e.plan) return e.plan;
  const o = data.orders.find((x) => x.ref === e.orderRef);
  return o?.lines.find((l) => l.courseId === e.courseId && l.learnerIds.includes(e.learnerId))?.plan || "";
};

// fills a template's {name} {course} {date} {where} {order} for one student
const fill = (text, e, k, o) => text
  .replace(/\{name\}/g, e?.learner?.first || "there")
  .replace(/\{course\}/g, k.course?.title || "your course")
  .replace(/\{date\}/g, dayRange(k.first, k.last))
  .replace(/\{where\}/g, k.venue ? `${k.venue.name}, ${k.venue.city}` : "online")
  .replace(/\{order\}/g, o?.ref || "");

// "Send email": to one student (address can be changed, e.g. the order confirmation to someone else) or to every picked student.
// Hurak's "Select email template" (filled in for each student) or "Create new".
function EmailSheet({ value, people, cohort: k, orderOf, onClose, onSent }) {
  const formRef = useRef(null);
  const [mode, setMode] = useState("template");
  const [tpl, setTpl] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [forKey, setForKey] = useState(null);
  const list = value ? people.filter((e) => value.ids.includes(e.id) && e.status !== "cancelled") : [];
  const one = value?.single ? list[0] : null;
  const key = value ? value.ids.join(",") : null;
  if (key !== forKey) {
    setForKey(key);
    setMode("template");
    setTpl("");
    setTo(one?.learner?.email || "");
    setSubject("");
    setMessage("");
    setErrors({});
  }
  const useTemplate = (v) => {
    setTpl(v);
    const t = pw.emailTemplates.find((x) => x.key === v);
    if (!t) return;
    const body = t.body.join("\n\n");
    setSubject(one ? fill(t.subject, one, k, orderOf(one)) : t.subject);
    setMessage(one ? fill(body, one, k, orderOf(one)) : body);
  };
  const send = (ev) => {
    ev.preventDefault();
    const err = {};
    if (mode === "template" && !tpl) err.tpl = "Select an email template.";
    if (one && !EMAIL_RE.test(to.trim())) err.to = "Enter an email address in the correct format, like name@example.com.";
    if (!subject.trim()) err.subject = "Enter a subject.";
    if (!message.trim()) err.message = "Write the message.";
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(formRef.current);
    logEmail(list.map((e) => e.id), subject.trim(), one ? to.trim() : "");
    onSent(list.length, one ? to.trim() : "");
  };
  return (
    <Sheet open={Boolean(value)} onClose={onClose} title={one ? `Email ${learnerName(one.learner)}` : "Email students"} closeLabel="Close">
      {value && (
        <form className="rt-q__form" onSubmit={send} noValidate ref={formRef}>
          {!one && <p className="rt-acc__note">{`Goes to ${list.length} ${list.length === 1 ? "student" : "students"} on this cohort. {name}, {course}, {date}, {where} and {order} are filled in for each one.`}</p>}
          <Choice name="rt-mail-mode" legend="Select email option" value={mode} onChange={(v) => { setMode(v); setTpl(""); setSubject(""); setMessage(""); }} options={[{ value: "template", label: "Select email template" }, { value: "new", label: "Create new" }]} />
          {mode === "template" && (
            <Field id="rt-mail-tpl" label="Select template" error={errors.tpl}>
              <FieldSelect id="rt-mail-tpl" label="Select template" placeholder="Choose email" value={tpl} onChange={useTemplate} options={pw.emailTemplates.map((t) => ({ value: t.key, label: t.label }))} invalid={Boolean(errors.tpl)} describedBy={errors.tpl ? "rt-mail-tpl-e" : undefined} />
            </Field>
          )}
          {one && (
            <Field id="rt-mail-to" label="Send to" error={errors.to} hint="The student's email. Change it to send this to someone else, such as the person who paid.">
              <input id="rt-mail-to" type="email" value={to} onChange={(e) => setTo(e.target.value)} autoComplete="off" spellCheck={false} {...ariaFor("rt-mail-to", errors.to, true)} />
            </Field>
          )}
          <Field id="rt-mail-subject" label="Enter email subject" error={errors.subject}>
            <input id="rt-mail-subject" type="text" maxLength={140} value={subject} onChange={(e) => setSubject(e.target.value)} autoComplete="off" {...ariaFor("rt-mail-subject", errors.subject)} />
          </Field>
          <Field id="rt-mail-message" label="Message" error={errors.message}>
            <textarea id="rt-mail-message" rows={7} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} autoComplete="off" {...ariaFor("rt-mail-message", errors.message)} />
          </Field>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Send</button>
        </form>
      )}
    </Sheet>
  );
}

// "Edit Student Details" (the student's name, contact number and email), or "Replace Student" (someone else takes the place)
function DetailsSheet({ enrolment: e, onClose, onSaved }) {
  const formRef = useRef(null);
  const [mode, setMode] = useState("edit");
  const [f, setF] = useState({ first: "", last: "", phone: "", email: "" });
  const [errors, setErrors] = useState({});
  const [forId, setForId] = useState(null);
  if (e && e.id !== forId) {
    setForId(e.id);
    setMode("edit");
    setF({ first: e.learner?.first || "", last: e.learner?.last || "", phone: e.learner?.phone || "", email: e.learner?.email || "" });
    setErrors({});
  }
  if (!e && forId) setForId(null);
  const swap = (m) => {
    setMode(m);
    setErrors({});
    setF(m === "replace" ? { first: "", last: "", phone: "", email: "" } : { first: e.learner?.first || "", last: e.learner?.last || "", phone: e.learner?.phone || "", email: e.learner?.email || "" });
  };
  const save = (ev) => {
    ev.preventDefault();
    const err = {};
    if (!f.first.trim()) err.first = "Enter the first name.";
    if (!f.last.trim()) err.last = "Enter the last name.";
    if (f.phone.replace(/\D/g, "").length < 10) err.phone = "Enter a contact number, like 07700 900 982.";
    if (!EMAIL_RE.test(f.email.trim())) err.email = "Enter an email address in the correct format, like name@example.com.";
    if (mode === "replace" && f.email.trim().toLowerCase() === e.learner?.email.toLowerCase()) err.email = "This is the same person. Enter the new student's email.";
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(formRef.current);
    const p = { first: f.first.trim(), last: f.last.trim(), phone: f.phone.trim(), email: f.email.trim() };
    if (mode === "replace") {
      replaceLearner(e.id, p);
      onSaved(`${p.first} ${p.last} now has this place`);
    } else {
      updateLearner(e.learnerId, p, e.id);
      onSaved("Student details saved");
    }
  };
  const input = (key, label, props) => (
    <Field id={`rt-sd-${key}`} label={label} error={errors[key]}>
      <input id={`rt-sd-${key}`} value={f[key]} onChange={(ev) => setF((x) => ({ ...x, [key]: ev.target.value }))} {...props} {...ariaFor(`rt-sd-${key}`, errors[key])} />
    </Field>
  );
  return (
    <Sheet open={Boolean(e)} onClose={onClose} title={mode === "replace" ? "Replace student" : "Edit student details"} closeLabel="Close">
      {e && (
        <form className="rt-q__form" onSubmit={save} noValidate ref={formRef}>
          {mode === "replace" && <p className="rt-acc__note">{learnerName(e.learner)}'s place on this cohort goes to the person below. The order and payment stay as they are.</p>}
          <div className="rt-contact__pair">
            {input("first", "First name", { type: "text", autoComplete: "off" })}
            {input("last", "Last name", { type: "text", autoComplete: "off" })}
          </div>
          {input("phone", "Contact number", { type: "tel", autoComplete: "off" })}
          {input("email", "Email address", { type: "email", autoComplete: "off", spellCheck: false })}
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{mode === "replace" ? "Replace student" : "Save details"}</button>
          <button type="button" className="rt-cd__link rt-pws-coh__swap" onClick={() => swap(mode === "replace" ? "edit" : "replace")}>{mode === "replace" ? "Edit this student's details instead" : "Replace with another student"}</button>
        </form>
      )}
    </Sheet>
  );
}

// "Reschedule": another date of the same course with places left
export function MoveSheet({ enrolment: e, options, course, onClose, onSaved }) {
  const formRef = useRef(null);
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [forId, setForId] = useState(null);
  if (e && e.id !== forId) { setForId(e.id); setTo(""); setNote(""); setError(""); }
  if (!e && forId) setForId(null);
  const policy = course?.settings.reschedule;
  const save = (ev) => {
    ev.preventDefault();
    if (!to) { setError("Choose the new dates."); return focusFirstError(formRef.current); }
    rescheduleEnrolment(e.id, to, note.trim());
    onSaved(`${learnerName(e.learner)} rescheduled`);
  };
  return (
    <Sheet open={Boolean(e)} onClose={onClose} title={e ? `Reschedule ${learnerName(e.learner)}` : "Reschedule"} closeLabel="Close">
      {e && (
        <form className="rt-q__form" onSubmit={save} noValidate ref={formRef}>
          {policy?.enabled && <p className="rt-acc__note">{policy.paid ? `Your policy: a date change costs ${formatPrice(policy.fee)}.` : "Your policy: date changes are free."}</p>}
          {options.length ? (
            <>
              <Field id="rt-mv-to" label="New dates" error={error}>
                <FieldSelect id="rt-mv-to" label="New dates" placeholder="Choose the dates" value={to} onChange={(v) => { setTo(v); setError(""); }} options={options.map((x) => ({ value: x.id, label: `${dayRange(x.first, x.last)} · ${x.venue ? x.venue.city : "Online"} · ${x.left} left` }))} invalid={Boolean(error)} describedBy={error ? "rt-mv-to-e" : undefined} />
              </Field>
              <Field id="rt-mv-note" label="Note (optional)">
                <textarea id="rt-mv-note" rows={3} maxLength={500} value={note} onChange={(ev) => setNote(ev.target.value)} autoComplete="off" />
              </Field>
              <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Reschedule</button>
            </>
          ) : <p className="rt-acc__note">This course has no other upcoming dates with places left. Create a cohort first.</p>}
        </form>
      )}
    </Sheet>
  );
}

// "Resit": a new place on another date for a learner who needs to sit again, free or for the course's resit fee
export function ResitSheet({ enrolment: e, options, course, onClose, onSaved }) {
  const formRef = useRef(null);
  const [to, setTo] = useState("");
  const [pay, setPay] = useState("free");
  const [error, setError] = useState("");
  const [forId, setForId] = useState(null);
  const fee = course?.settings.resit?.price || 0;
  if (e && e.id !== forId) { setForId(e.id); setTo(""); setPay(course?.settings.resit?.paid && fee ? "paid" : "free"); setError(""); }
  if (!e && forId) setForId(null);
  const save = (ev) => {
    ev.preventDefault();
    if (!to) { setError("Choose the resit dates."); return focusFirstError(formRef.current); }
    bookResit(e.id, to, pay === "paid" ? fee : 0);
    onSaved(pay === "paid" ? `Resit booked. Payment link for ${formatPrice(fee)} sent to ${e.learner?.email}` : "Free resit booked");
  };
  return (
    <Sheet open={Boolean(e)} onClose={onClose} title={e ? `Resit for ${learnerName(e.learner)}` : "Resit"} closeLabel="Close">
      {e && (
        <form className="rt-q__form" onSubmit={save} noValidate ref={formRef}>
          {e.result !== "fail" && <p className="rt-acc__note">{e.result === "pass" ? "This student passed. A resit is usually for students who did not." : "No result is marked yet. A resit is usually booked after a fail."}</p>}
          {options.length ? (
            <>
              <Field id="rt-rs-to" label="Resit dates" error={error}>
                <FieldSelect id="rt-rs-to" label="Resit dates" placeholder="Choose the dates" value={to} onChange={(v) => { setTo(v); setError(""); }} options={options.map((x) => ({ value: x.id, label: `${dayRange(x.first, x.last)} · ${x.venue ? x.venue.city : "Online"} · ${x.left} left` }))} invalid={Boolean(error)} describedBy={error ? "rt-rs-to-e" : undefined} />
              </Field>
              <Choice name="rt-rs-pay" legend="Resit fee" value={pay} onChange={setPay} options={[{ value: "free", label: "Free resit" }, ...(fee ? [{ value: "paid", label: `${course?.settings.resit?.title || "Exam resit"}: ${formatPrice(fee)} (we send a payment link)` }] : [])]} />
              <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Book resit</button>
            </>
          ) : <p className="rt-acc__note">This course has no other upcoming dates with places left. Create a cohort first.</p>}
        </form>
      )}
    </Sheet>
  );
}

// "Booking Cancellation Reason": cancelling one student's place asks why
function CancelBookingSheet({ enrolment: e, onClose, onSaved }) {
  const formRef = useRef(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [forId, setForId] = useState(null);
  if (e && e.id !== forId) { setForId(e.id); setReason(""); setError(""); }
  if (!e && forId) setForId(null);
  const save = (ev) => {
    ev.preventDefault();
    if (!reason.trim()) { setError("Enter the reason for cancelling."); return focusFirstError(formRef.current); }
    setStudentStatus(e.id, "cancelled", reason.trim());
    onSaved(`${learnerName(e.learner)}'s booking cancelled`);
  };
  return (
    <Sheet open={Boolean(e)} onClose={onClose} title="Booking cancellation reason" closeLabel="Close">
      {e && (
        <form className="rt-q__form" onSubmit={save} noValidate ref={formRef}>
          <p className="rt-acc__note">{learnerName(e.learner)}'s place is freed for someone else. Any refund is made from the order.</p>
          <Field id="rt-cb-reason" label="Reason" error={error}>
            <textarea id="rt-cb-reason" rows={4} maxLength={500} value={reason} onChange={(ev) => setReason(ev.target.value)} autoComplete="off" {...ariaFor("rt-cb-reason", error)} />
          </Field>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Cancel booking</button>
        </form>
      )}
    </Sheet>
  );
}

// notes (a student's, or the cohort's session notes): newest first, and a box to add one
function NotesSheet({ title, intro, open, list, onAdd, onClose }) {
  const formRef = useRef(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [was, setWas] = useState(false);
  if (open !== was) { setWas(open); setText(""); setError(""); }
  const add = (ev) => {
    ev.preventDefault();
    if (!text.trim()) { setError("Write the note."); return focusFirstError(formRef.current); }
    onAdd(text.trim());
    setText("");
    setError("");
  };
  return (
    <Sheet open={open} onClose={onClose} title={title} closeLabel="Close">
      <div className="rt-q__form">
        {intro && <p className="rt-acc__note">{intro}</p>}
        {list.length ? (
          <ol className="rt-pws-coh__notes">
            {[...list].reverse().map((n) => <li key={n.at}><p>{n.text}</p><small>{n.who} · {formatWhen(n.at)}</small></li>)}
          </ol>
        ) : <p className="rt-acc__note">No notes yet.</p>}
        <form className="rt-q__form" onSubmit={add} noValidate ref={formRef}>
          <Field id="rt-note-text" label="Add a note" error={error}>
            <textarea id="rt-note-text" rows={3} maxLength={1000} value={text} onChange={(ev) => setText(ev.target.value)} autoComplete="off" {...ariaFor("rt-note-text", error)} />
          </Field>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Add note</button>
        </form>
      </div>
    </Sheet>
  );
}

// "Timeline": what happened to this place, oldest first (booked, emails, date changes, resits, notes, cancellation)
function TimelineSheet({ enrolment: e, order, onClose }) {
  const events = e ? [
    ...(order ? [{ at: order.at, who: order.channel === "manual" ? "Your team" : pw.channels[order.channel], text: `Booked on order ${order.ref}` }] : []),
    ...(e.timeline || []),
    ...(e.notes || []).map((n) => ({ ...n, text: `Note: ${n.text}` })),
  ].sort((a, b) => a.at - b.at) : [];
  return (
    <Sheet open={Boolean(e)} onClose={onClose} title={e ? `Timeline: ${learnerName(e.learner)}` : "Timeline"} closeLabel="Close">
      {e && (
        <ol className="rt-pws-coh__timeline">
          {events.map((x, i) => <li key={`${x.at}-${i}`}><p>{x.text}</p><small>{x.who} · {formatWhen(x.at)}</small></li>)}
        </ol>
      )}
    </Sheet>
  );
}

// "Bulk Students Enrollment": a CSV of people booked outside ReadTraining (first name, last name, email, phone)
function BulkSheet({ open, cohort: k, onClose, onSaved }) {
  const formRef = useRef(null);
  const [rows, setRows] = useState(null);
  const [file, setFile] = useState("");
  const [error, setError] = useState("");
  const [was, setWas] = useState(false);
  if (open !== was) { setWas(open); setRows(null); setFile(""); setError(""); }
  const read = (ev) => {
    const f = ev.target.files?.[0];
    ev.target.value = "";
    if (!f) return;
    setFile(f.name);
    if (!/\.csv$/i.test(f.name)) { setRows(null); return setError("The file must be a CSV."); }
    f.text().then((text) => {
      const lines = text.split(/\r?\n/).map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))).filter((c) => c.some(Boolean));
      if (lines.length && /first/i.test(lines[0][0] || "")) lines.shift();
      const people = lines.map(([first = "", last = "", email = "", phone = ""]) => ({ first, last, email, phone }));
      const bad = people.findIndex((p) => !p.first || !p.last || !EMAIL_RE.test(p.email));
      if (!people.length) { setRows(null); return setError("The file has no students in it."); }
      if (bad >= 0) { setRows(null); return setError(`Row ${bad + 1} needs a first name, last name and a valid email.`); }
      if (people.length > k.left) { setRows(null); return setError(`The file has ${people.length} students but only ${k.left} ${k.left === 1 ? "place is" : "places are"} left.`); }
      setError("");
      setRows(people);
    });
  };
  const save = (ev) => {
    ev.preventDefault();
    if (!rows) { if (!error) setError("Choose a CSV file."); return focusFirstError(formRef.current); }
    onSaved(bulkEnrol(k.id, rows));
  };
  return (
    <Sheet open={open} onClose={onClose} title="Bulk students enrolment" closeLabel="Close">
      <form className="rt-q__form" onSubmit={save} noValidate ref={formRef}>
        <p className="rt-acc__note">{`Add students who booked with you outside ReadTraining. Use a CSV with one student a row: first name, last name, email, phone. ${k.left} ${k.left === 1 ? "place" : "places"} left.`}</p>
        <Field id="rt-bulk-file" label="Student file (CSV)" error={error}>
          <input id="rt-bulk-file" type="file" accept=".csv,text/csv" onChange={read} {...ariaFor("rt-bulk-file", error)} />
        </Field>
        {rows && <p className="rt-acc__note" role="status">{`${file}: ${rows.length} ${rows.length === 1 ? "student" : "students"} ready to enrol.`}</p>}
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Enrol students</button>
      </form>
    </Sheet>
  );
}

// The learner record (CLR) for one learner: the fields the course's settings ask for, plus any custom fields.
function RecordSheet({ enrolment, clr, onClose, onSaved }) {
  const formRef = useRef(null);
  const [f, setF] = useState({});
  const [errors, setErrors] = useState({});
  const [forId, setForId] = useState(null);
  if (enrolment && enrolment.id !== forId) {
    setForId(enrolment.id);
    setF({ name: learnerName(enrolment.learner), result: enrolment.result || "", ...enrolment.clr });
    setErrors({});
  }
  if (!enrolment && forId) setForId(null);

  const fields = clr.fields || [];
  const custom = clr.custom || [];
  const set = (key, value) => setF((x) => ({ ...x, [key]: value }));
  const save = (e) => {
    e.preventDefault();
    const err = {};
    const today = new Date().toISOString().slice(0, 10);
    if (fields.includes("name") && !String(f.name || "").trim()) err.name = "Enter the learner's full name.";
    if (f.dob && f.dob > today) err.dob = "The date of birth must be in the past.";
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(formRef.current);
    const { result, ...rest } = f;
    saveRecord(enrolment.id, rest);
    if (fields.includes("result") && enrolment.attended && !enrolment.certificate && (result || null) !== enrolment.result) setResult(enrolment.id, result || null);
    onSaved();
  };
  const err = (key) => errors[key] && <p className="rt-q__err" id={`rt-clr-${key}-e`}><span className="rt-sr">Error: </span>{errors[key]}</p>;
  const aria = (key) => ({ "aria-invalid": errors[key] ? true : undefined, "aria-describedby": errors[key] ? `rt-clr-${key}-e` : undefined });

  return (
    <Sheet open={Boolean(enrolment)} onClose={onClose} title={enrolment ? `Learner record: ${learnerName(enrolment.learner)}` : "Learner record"} closeLabel="Close">
      {enrolment && (
        <form className="rt-q__form" onSubmit={save} noValidate ref={formRef}>
          {fields.includes("name") && (
            <div className="rt-field">
              <label htmlFor="rt-clr-name">Full name</label>
              <p className="rt-acc__note">As it should appear on the certificate.</p>
              {err("name")}
              <input id="rt-clr-name" type="text" maxLength={100} value={f.name || ""} onChange={(e) => set("name", e.target.value)} autoComplete="off" {...aria("name")} />
            </div>
          )}
          {fields.includes("dob") && (
            <div className="rt-field">
              <label htmlFor="rt-clr-dob">Date of birth</label>
              {err("dob")}
              <DateField id="rt-clr-dob" value={f.dob || ""} onChange={(v) => set("dob", v)} invalid={Boolean(errors.dob)} describedBy={errors.dob ? "rt-clr-dob-e" : undefined} />
            </div>
          )}
          {fields.includes("gender") && (
            <div className="rt-field">
              <label htmlFor="rt-clr-gender">Gender</label>
              <FieldSelect id="rt-clr-gender" label="Gender" value={f.gender || ""} onChange={(value) => set("gender", value)} options={[{ value: "", label: "Not given" }, ...GENDERS]} />
            </div>
          )}
          {fields.includes("result") && (
            <div className="rt-field">
              <label htmlFor="rt-clr-result">Course result</label>
              {(!enrolment.attended || enrolment.certificate) && <p className="rt-acc__note">{enrolment.certificate ? "Locked: the certificate has been issued." : "Mark the learner as attended first."}</p>}
              <FieldSelect id="rt-clr-result" label="Course result" value={f.result || ""} onChange={(value) => set("result", value)} disabled={!enrolment.attended || Boolean(enrolment.certificate)} options={RESULTS} />
            </div>
          )}
          {fields.includes("dispatch") && (
            <div className="rt-field">
              <label htmlFor="rt-clr-dispatch">Certificate dispatch date</label>
              <DateField id="rt-clr-dispatch" clearable value={f.dispatch || ""} onChange={(v) => set("dispatch", v)} />
            </div>
          )}
          {custom.map((c) => {
            const key = customKey(c);
            return (
              <div className="rt-field" key={key}>
                <label htmlFor={`rt-clr-${key}`}>{customLabel(c)}</label>
                <input id={`rt-clr-${key}`} type="text" maxLength={200} value={f[key] || ""} onChange={(e) => set(key, e.target.value)} autoComplete="off" />
              </div>
            );
          })}
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Save record</button>
        </form>
      )}
    </Sheet>
  );
}
