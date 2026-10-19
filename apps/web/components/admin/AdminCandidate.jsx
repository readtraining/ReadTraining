"use client";

import React, { useRef, useState } from "react";
import { admin as A } from "@/data/admin";
import { adminWork as W } from "@/data/adminWork";
import { useAdmin } from "@/lib/admin";
import { addCandidateNote, moveIntro, offerRole, recordConsent, setCandidateStatus } from "@/lib/adminWork";
import { focusFirstError } from "@/lib/focusFirstError";
import Sheet from "@/components/testPrep/runner/Sheet";
import { Pill, formatWhen, Said } from "./adminParts";
import { CANDIDATE_TONE } from "./AdminJobs";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { EmptyState } from "@/components/states/States";

const copy = W.jobs;
const d = copy.detail;
const ANSWERS = { yes: "Yes", no: "No", partly: "Partly" };
const ELIGIBILITY = { licence: "Holds a current SIA licence", work: "Right to work in the UK", history: "5-year address and work history" };

// One candidate: status actions, licence and availability, eligibility answers, and the roles offered to them. Introducing a
// candidate to an employer (sharing their details) stays locked until their yes for THAT role is recorded, with how they said it,
// as the Security Jobs page promises. Then interview and start. Each change is saved.
export default function AdminCandidate({ reference }) {
  const data = useAdmin();
  const [said, setSaid] = useState("");
  const [role, setRole] = useState("");
  const [consentFor, setConsentFor] = useState(null);
  const [how, setHow] = useState("");
  const [errors, setErrors] = useState({});
  const [note, setNote] = useState("");
  const offerRef = useRef(null);
  const consentRef = useRef(null);
  const noteRef = useRef(null);
  if (!data) return null;
  const c = data.candidates.find((x) => x.ref === reference);
  if (!c) return <EmptyState title="This candidate was not found." action={{ href: "/admin/jobs", label: d.back }} />;

  const offered = new Set(c.intros.map((i) => i.role));
  const roleOptions = data.roles.filter((r) => !offered.has(r.id));
  const closed = ["unsuitable", "withdrawn"].includes(c.status);

  const offer = (e) => {
    e.preventDefault();
    if (!role) {
      setErrors({ role: "Choose a role." });
      return focusFirstError(offerRef.current);
    }
    offerRole(c, role);
    setRole("");
    setErrors({});
    setSaid("Consent asked");
  };
  const saveConsent = (e) => {
    e.preventDefault();
    if (!how) {
      setErrors({ how: "Choose how the candidate said yes." });
      return focusFirstError(consentRef.current);
    }
    recordConsent(c, consentFor, how);
    setConsentFor(null);
    setHow("");
    setErrors({});
    setSaid("Consent recorded");
  };
  const saveNote = (e) => {
    e.preventDefault();
    if (!note.trim()) {
      setErrors({ note: "Write the note first." });
      return focusFirstError(noteRef.current);
    }
    addCandidateNote(c, note.trim());
    setNote("");
    setErrors({});
    setSaid("Note added");
  };
  const nextFor = { consent: ["introduced", d.introduce], introduced: ["interview", "Mark interview booked"], interview: ["started", "Mark as started"] };

  return (
    <div className="rt-acc__stack">
      <Said text={said} />

      <section className="rt-acc__card rt-adm-hero" aria-label="Candidate">
        <div>
          <div className="rt-adm-item__top">
            <Pill tone={CANDIDATE_TONE[c.status] || "info"}>{copy.statuses[c.status]}</Pill>
            <span className="rt-adm-item__when">Applied {formatWhen(c.at)}</span>
          </div>
          <h1 className="rt-adm__h1 rt-adm-hero__name">{c.name}</h1>
          <p className="rt-acc__note">{c.ref} · {c.licence.type} licence · {c.city || c.postcode}</p>
        </div>
        <div className="rt-adm-hero__actions">
          {c.status === "new" && <button type="button" className="button -sm -purple-1 text-white" onClick={() => { setCandidateStatus(c, "screening"); setSaid("Call booked"); }}>Book a call</button>}
          {!closed && c.status !== "started" && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setCandidateStatus(c, "unsuitable"); setSaid("Marked not suitable"); }}>Not suitable</button>}
          {closed && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setCandidateStatus(c, "screening"); setSaid("Reopened"); }}>Reopen</button>}
        </div>
      </section>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-cl-h">
          <h2 className="rt-acc__h2" id="rt-adm-cl-h">{d.licence}</h2>
          <dl className="rt-adm-dl">
            <div><dt>Type</dt><dd>{c.licence.type}</dd></div>
            <div><dt>Number</dt><dd>Ending {c.licence.last4}</dd></div>
            <div><dt>Expires</dt><dd>{c.licence.expiry}</dd></div>
          </dl>
          <h3 className="rt-adm-h3">{d.availability}</h3>
          <dl className="rt-adm-dl">
            <div><dt>Shifts</dt><dd>{c.shifts.join(", ")}</dd></div>
            <div><dt>Travel</dt><dd>{c.travel}</dd></div>
            <div><dt>Can start</dt><dd>{c.start}</dd></div>
            <div><dt>Contact</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a>{c.phone && <><br /><a href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a></>}</dd></div>
          </dl>
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-adm-ce-h">
          <h2 className="rt-acc__h2" id="rt-adm-ce-h">{d.eligibility}</h2>
          <dl className="rt-adm-dl">
            {Object.entries(ELIGIBILITY).map(([k, label]) => <div key={k}><dt>{label}</dt><dd>{ANSWERS[c.eligibility[k]] || "Not answered"}</dd></div>)}
          </dl>
        </section>
      </div>

      <section className="rt-acc__card" aria-labelledby="rt-adm-ci-h">
        <h2 className="rt-acc__h2" id="rt-adm-ci-h">{d.intros}</h2>
        <p className="rt-acc__note">{copy.consentRule}</p>
        {c.intros.length > 0 && (
          <ul className="rt-adm-intros">
            {c.intros.map((i) => {
              const n = nextFor[i.status];
              return (
                <li key={i.role} className="rt-adm-intro">
                  <div>
                    <b>{i.roleInfo?.title}</b>
                    <small>{i.roleInfo?.employerName} · {i.roleInfo?.city} · {i.roleInfo?.pay}</small>
                    <small>{i.consent ? `Said yes ${formatWhen(i.consent.at)} · ${i.consent.how}` : "No yes recorded yet"}</small>
                  </div>
                  <div className="rt-adm-intro__side">
                    <Pill tone={i.status === "started" ? "ok" : i.status === "asked" ? "warn" : "info"}>{copy.introStatuses[i.status]}</Pill>
                    {i.status === "asked" && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setConsentFor(i.role); setErrors({}); }}>{d.consentSave}</button>}
                    {n && <button type="button" className="button -sm -purple-1 text-white" onClick={() => { moveIntro(c, i.role, n[0]); setSaid(n[1]); }}>{n[1]}</button>}
                    {i.status === "asked" && <span className="rt-adm-locked"><i className="fa fa-lock" aria-hidden="true"></i>{d.introBlocked}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!closed && roleOptions.length > 0 && (
          <form className="rt-adm-inline" onSubmit={offer} noValidate ref={offerRef}>
            <div className="rt-field">
              <label htmlFor="rt-adm-role">{d.offer}</label>
              {errors.role && <p className="rt-q__err" id="rt-adm-role-e"><span className="rt-sr">Error: </span>{errors.role}</p>}
              <FieldSelect id="rt-adm-role" label={d.offer} placeholder="Choose a role" value={role} onChange={setRole} options={roleOptions.map((r) => ({ value: r.id, label: `${r.title}, ${r.employerName} (${r.city})` }))} invalid={Boolean(errors.role)} describedBy={errors.role ? "rt-adm-role-e" : undefined} />
            </div>
            <button type="submit" className="button -sm -outline-purple-1 text-purple-1">{d.offerSave}</button>
          </form>
        )}
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-adm-cn-h">
        <h2 className="rt-acc__h2" id="rt-adm-cn-h">{d.notes}</h2>
        <form className="rt-adm-noteform" onSubmit={saveNote} noValidate ref={noteRef}>
          <div className="rt-field">
            <label htmlFor="rt-adm-cnote" className="rt-sr">{A.providers.detail.notePlaceholder}</label>
            {errors.note && <p className="rt-q__err" id="rt-adm-cnote-e"><span className="rt-sr">Error: </span>{errors.note}</p>}
            <textarea id="rt-adm-cnote" rows={3} maxLength={1000} placeholder={A.providers.detail.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={errors.note ? true : undefined} aria-describedby={errors.note ? "rt-adm-cnote-e" : undefined} />
          </div>
          <button type="submit" className="button -sm -outline-purple-1 text-purple-1">{A.providers.detail.addNote}</button>
        </form>
        {c.notes.length > 0 && (
          <ul className="rt-adm-notes">
            {c.notes.map((n) => <li key={n.at}><p>{n.text}</p><small>{n.who} · {formatWhen(n.at)}</small></li>)}
          </ul>
        )}
      </section>

      <Sheet open={Boolean(consentFor)} onClose={() => setConsentFor(null)} title={d.consentSave} closeLabel="Close">
        <form className="rt-q__form" onSubmit={saveConsent} noValidate ref={consentRef}>
          <p className="rt-acc__note">{copy.consentRule}</p>
          <div className="rt-field">
            <label htmlFor="rt-adm-how">{d.consentHow}</label>
            {errors.how && <p className="rt-q__err" id="rt-adm-how-e"><span className="rt-sr">Error: </span>{errors.how}</p>}
            <FieldSelect id="rt-adm-how" label={d.consentHow} value={how} onChange={setHow} options={d.consentWays} invalid={Boolean(errors.how)} describedBy={errors.how ? "rt-adm-how-e" : undefined} />
          </div>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{d.consentSave}</button>
        </form>
      </Sheet>
    </div>
  );
}
