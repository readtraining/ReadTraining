"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { cancelCohort, issueCertificates, learnerName, saveRecord, setAttendance, setResult, timeRange, useProvider } from "@/lib/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { COHORT_TONE, Loading, Pill, shortDay } from "./providerParts";
import { CohortForm, Seats, dayRange } from "./ProviderCohorts";

// One cohort: what, when, where and who teaches it, its sessions, and its learners. On the day the tutor takes the register
// (attended), records each result, keeps the learner record the course asks for (CLR), then issues certificates to everyone who
// passed. From here: edit the cohort, email its learners, download the register (CSV) or cancel it.

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const RESULTS = [{ value: "", label: "Not marked" }, { value: "pass", label: "Pass" }, { value: "fail", label: "Fail" }];
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const customKey = (f) => (typeof f === "string" ? `custom-${slug(f)}` : f.key || `custom-${slug(f.label)}`);
const customLabel = (f) => (typeof f === "string" ? f : f.label);
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function ProviderCohort({ cohortId }) {
  const data = useProvider();
  const [editing, setEditing] = useState(false);
  const [mailing, setMailing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [record, setRecord] = useState(null);
  const [toast, setToast] = useState(null);

  if (!data) return <Loading rows={3} />;
  const k = data.byId.cohort[cohortId];
  if (!k) {
    return (
      <div className="rt-acc__card rt-acc__empty">
        <p>This cohort was not found. It may have been removed.</p>
        <Link href="/provider/cohorts" className="fb-textlink">All cohorts<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
      </div>
    );
  }

  const course = k.course;
  const people = data.enrolments.filter((e) => e.cohortId === k.id).sort((a, b) => learnerName(a.learner).localeCompare(learnerName(b.learner)));
  const started = k.first <= data.today;
  const clr = course?.settings.clr || { enabled: false, fields: [], custom: [] };
  const toCertify = people.filter((e) => e.result === "pass" && !e.certificate).length;
  const marked = people.filter((e) => e.result).length;
  const certified = people.filter((e) => e.certificate).length;
  const pack = k.packageId ? data.byId.pack[k.packageId] : null;
  const where = k.venue ? `${k.venue.name}, ${k.venue.city}` : "Online";
  const canCancel = !k.cancelled && k.status === "upcoming";

  const download = () => {
    const head = ["Name", "Email", "Phone", "Company", "Order", "Attended", "Result", "Certificate"];
    const rows = people.map((e) => [learnerName(e.learner), e.learner?.email, e.learner?.phone, e.learner?.company, e.orderRef, e.attended === null ? "" : e.attended ? "Yes" : "No", e.result ? (e.result === "pass" ? "Pass" : "Fail") : "", e.certificate?.no || ""]);
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

  return (
    <div className="rt-acc__stack">
      <section className="rt-acc__card rt-adm-hero" aria-label="Cohort">
        <div>
          <div className="rt-adm-item__top">
            <Pill tone={COHORT_TONE[k.status]}>{pw.cohortStatuses[k.status]}</Pill>
            <span className="rt-adm-item__when">{pw.formats.find((f) => f.key === course?.format)?.short}</span>
          </div>
          <h2 className="rt-acc__h2 rt-adm-hero__name">{course ? <Link href={`/provider/courses/${course.id}`} className="rt-adm-strong">{course.title || "Untitled course"}</Link> : "Course removed"}</h2>
          <p className="rt-acc__note">{dayRange(k.first, k.last)} · {where} · {k.tutor ? `Tutor ${k.tutor.name || k.tutor.email}` : "No tutor assigned"}</p>
          <div className="rt-pws-coh__herofacts">
            <Seats booked={k.booked} max={k.max} />
            <span className="rt-adm-muted">{pack ? `${pack.name}, from ${formatPrice(pack.tiers.saver.price)}` : `${formatPrice(k.price)} per learner`}</span>
          </div>
        </div>
        <div className="rt-adm-hero__actions">
          {!k.cancelled && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setEditing(true)}>Edit</button>}
          {!k.cancelled && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setMailing(true)} disabled={!people.length}>Email learners</button>}
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={download} disabled={!people.length}>Download register</button>
          {canCancel && <button type="button" className="rt-pws-coh__remove rt-adm-danger" onClick={() => setCancelling(true)}>Cancel cohort</button>}
        </div>
      </section>

      {k.cancelled && <p className="rt-adm-item__block">This cohort is cancelled. Booked learners were told and offered another date or a refund.</p>}

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-coh-sess-h">
          <h2 className="rt-acc__h2" id="rt-coh-sess-h">Sessions</h2>
          <ol className="rt-adm-list rt-pws-coh__sessions">
            {[...k.sessions].sort((a, b) => a.date.localeCompare(b.date)).map((s, i) => (
              <li key={`${s.date}-${i}`}>
                <div>
                  <b>Session {i + 1} · {dayRange(s.date, s.end || s.date)}</b>
                  <small>{timeRange(s)}{k.venue ? ` · ${k.venue.street}, ${k.venue.city} ${k.venue.postcode}` : " · Joining link in the joining instructions"}</small>
                </div>
              </li>
            ))}
          </ol>
          {k.details && (
            <>
              <h3 className="rt-adm-h3">Shown to learners</h3>
              <p className="rt-acc__note">{k.details}</p>
            </>
          )}
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-coh-sum-h">
          <h2 className="rt-acc__h2" id="rt-coh-sum-h">Progress</h2>
          <dl className="rt-adm-dl">
            <div><dt>Booked</dt><dd>{k.booked} of {k.max} places ({k.left} left)</dd></div>
            <div><dt>Attended</dt><dd>{started ? `${people.filter((e) => e.attended).length} of ${people.length}` : `The register opens on ${shortDay(k.first)}`}</dd></div>
            <div><dt>Results marked</dt><dd>{marked} of {people.length}</dd></div>
            <div><dt>Certificates</dt><dd>{certified} issued{toCertify ? `, ${toCertify} ready to issue` : ""}</dd></div>
            <div><dt>Learner records</dt><dd>{clr.enabled ? "Kept for this course" : <>Not used. Turn them on in the <Link href={`/provider/courses/${k.courseId}?tab=settings`}>course settings</Link>.</>}</dd></div>
          </dl>
        </section>
      </div>

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-coh-ppl-h">
        <div className="rt-acc__cardhead rt-adm-cardhead rt-pws-coh__peoplehead">
          <h2 className="rt-acc__h2" id="rt-coh-ppl-h">Learners</h2>
          {!k.cancelled && people.length > 0 && (
            <button type="button" className="button -sm -purple-1 text-white" onClick={certify} disabled={!toCertify}>
              Issue certificates{toCertify ? ` (${toCertify})` : ""}
            </button>
          )}
        </div>
        {!started && people.length > 0 && <p className="rt-acc__note rt-pws-coh__tablenote">You can take the register and record results from {shortDay(k.first)}.</p>}
        {people.length ? (
          <table className="rt-biz__table rt-adm-table">
            <thead>
              <tr><th scope="col">Learner</th><th scope="col">Order</th><th scope="col">Attended</th><th scope="col">Result</th><th scope="col">Certificate</th>{clr.enabled && <th scope="col"><span className="rt-sr">Record</span></th>}</tr>
            </thead>
            <tbody>
              {people.map((e) => {
                const name = learnerName(e.learner);
                const locked = !started || k.cancelled;
                return (
                  <tr key={e.id}>
                    <td data-label="Learner"><Link href={`/provider/learners/${e.learnerId}`} className="rt-adm-strong">{name}</Link><small>{e.learner?.company || e.learner?.email}</small></td>
                    <td data-label="Order"><Link href={`/provider/orders/${e.orderRef}`}>{e.orderRef}</Link></td>
                    <td data-label="Attended">
                      <label className="rt-pws-coh__check">
                        <input type="checkbox" className="rt-fp__check" checked={Boolean(e.attended)} disabled={locked || Boolean(e.certificate)} onChange={(ev) => setAttendance(e.id, ev.target.checked)} />
                        <span>{e.attended ? "Yes" : locked ? "Not yet" : "No"}</span>
                        <span className="rt-sr"> attended, {name}</span>
                      </label>
                    </td>
                    <td data-label="Result">
                      <div className="rt-field rt-adm-select -inline">
                        <label htmlFor={`rt-coh-r-${e.id}`} className="rt-sr">Result for {name}</label>
                        <select id={`rt-coh-r-${e.id}`} value={e.result || ""} disabled={locked || !e.attended || Boolean(e.certificate)} onChange={(ev) => setResult(e.id, ev.target.value || null)}>
                          {RESULTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                    </td>
                    <td data-label="Certificate">{e.certificate ? <>{e.certificate.no}<small>Issued</small></> : <span className="rt-adm-muted" aria-label="None">—</span>}</td>
                    {clr.enabled && <td data-label="Record"><button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setRecord(e)}>Edit record<span className="rt-sr"> for {name}</span></button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="rt-acc__empty rt-pws-coh__tablenote">No learners booked yet. Bookings from ReadTraining, your website and your own orders appear here.</p>
        )}
      </section>

      <CohortForm open={editing} onClose={() => setEditing(false)} cohort={k} onSaved={() => { setEditing(false); setToast({ message: "Cohort saved" }); }} />
      <EmailLearners open={mailing} onClose={() => setMailing(false)} count={people.length} course={course?.title || "your course"} onSent={() => { setMailing(false); setToast({ message: `Email sent to ${people.length} ${people.length === 1 ? "learner" : "learners"}` }); }} />
      <RecordSheet enrolment={record} clr={clr} onClose={() => setRecord(null)} onSaved={() => { setRecord(null); setToast({ message: "Learner record saved" }); }} />

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

function EmailLearners({ open, onClose, count, course, onSent }) {
  const formRef = useRef(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [opened, setOpened] = useState(false);
  if (open && !opened) {
    setOpened(true);
    setSubject(`About your ${course} course`);
    setMessage("");
    setErrors({});
  }
  if (!open && opened) setOpened(false);

  const send = (e) => {
    e.preventDefault();
    const err = {};
    if (!subject.trim()) err.subject = "Enter a subject.";
    if (!message.trim()) err.message = "Write the message.";
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(formRef.current);
    onSent();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Email learners" closeLabel="Close">
      <form className="rt-q__form" onSubmit={send} noValidate ref={formRef}>
        <p className="rt-acc__note">Goes to the {count} {count === 1 ? "learner" : "learners"} booked on this cohort. Replies come to your order email.</p>
        <div className="rt-field">
          <label htmlFor="rt-coh-subject">Subject</label>
          {errors.subject && <p className="rt-q__err" id="rt-coh-subject-e"><span className="rt-sr">Error: </span>{errors.subject}</p>}
          <input id="rt-coh-subject" type="text" maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} autoComplete="off" aria-invalid={errors.subject ? true : undefined} aria-describedby={errors.subject ? "rt-coh-subject-e" : undefined} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-coh-message">Message</label>
          {errors.message && <p className="rt-q__err" id="rt-coh-message-e"><span className="rt-sr">Error: </span>{errors.message}</p>}
          <textarea id="rt-coh-message" rows={6} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} autoComplete="off" aria-invalid={errors.message ? true : undefined} aria-describedby={errors.message ? "rt-coh-message-e" : undefined} />
        </div>
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block">Send email</button>
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
              <input id="rt-clr-dob" type="date" value={f.dob || ""} onChange={(e) => set("dob", e.target.value)} autoComplete="off" {...aria("dob")} />
            </div>
          )}
          {fields.includes("gender") && (
            <div className="rt-field">
              <label htmlFor="rt-clr-gender">Gender</label>
              <select id="rt-clr-gender" value={f.gender || ""} onChange={(e) => set("gender", e.target.value)} autoComplete="off">
                <option value="">Not given</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}
          {fields.includes("result") && (
            <div className="rt-field">
              <label htmlFor="rt-clr-result">Course result</label>
              {(!enrolment.attended || enrolment.certificate) && <p className="rt-acc__note">{enrolment.certificate ? "Locked: the certificate has been issued." : "Mark the learner as attended first."}</p>}
              <select id="rt-clr-result" value={f.result || ""} onChange={(e) => set("result", e.target.value)} disabled={!enrolment.attended || Boolean(enrolment.certificate)} autoComplete="off">
                {RESULTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          )}
          {fields.includes("dispatch") && (
            <div className="rt-field">
              <label htmlFor="rt-clr-dispatch">Certificate dispatch date</label>
              <input id="rt-clr-dispatch" type="date" value={f.dispatch || ""} onChange={(e) => set("dispatch", e.target.value)} autoComplete="off" />
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
