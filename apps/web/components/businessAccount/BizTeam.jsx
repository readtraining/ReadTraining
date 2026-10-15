"use client";

import React, { useEffect, useRef, useState } from "react";
import { businessAccount as biz } from "@/data/businessAccount";
import { addTeamMember, getTeam, removeTeamMember } from "@/lib/businessAccount";
import { useAuthUser } from "@/lib/auth/authClient";
import { focusFirstError } from "@/lib/focusFirstError";
import { Avatar } from "@/components/marketing/parts";
import Sheet from "@/components/testPrep/runner/Sheet";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";

const copy = biz.team;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const empty = { first: "", last: "", email: "" };

// Team (/business/team), as Hurak's Business account: the colleagues who can manage the account. The signed-in person is the
// account owner (always first, can't be removed); members are added with first name, last name, work email and a role
// (Member, Hurak's only role), show as "Invitation sent" until they accept, and can be sent the invitation again or removed.
// The Learners page is for the people being trained.
export default function BizTeam() {
  const person = useAuthUser();
  const [team, setTeam] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [announce, setAnnounce] = useState("");
  const addRef = useRef(null);
  useEffect(() => setTeam(getTeam()), []);
  if (!team) return null;

  const ownerName = person?.name || "You";
  const ownerEmail = person?.email || "";
  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.first.trim()) found.first = "Enter their first name.";
    if (!form.last.trim()) found.last = "Enter their last name.";
    const email = form.email.trim().toLowerCase();
    if (!email) found.email = "Enter their work email address.";
    else if (!EMAIL_RE.test(email)) found.email = "Enter an email address in the correct format, like name@example.com.";
    else if (email === ownerEmail.toLowerCase() || team.some((m) => m.email.toLowerCase() === email)) found.email = "This person is already on your team.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(e.currentTarget);
    setSaving(true);
    const added = await addTeamMember(form);
    setSaving(false);
    setAdding(false);
    setForm(empty);
    setTeam(getTeam());
    setAnnounce(`We have emailed ${added.first} ${added.last} an invitation to join your Business account.`);
  };
  const remove = () => {
    removeTeamMember(removing.id);
    setTeam(getTeam());
    setAnnounce(`${removing.first} ${removing.last} has been removed from your team.`);
    setRemoving(null);
  };
  const field = (k, label, props = {}) => (
    <div className="rt-field">
      <label htmlFor={`rt-bt-${k}`}>{label}</label>
      {errors[k] && <p className="rt-q__err" id={`rt-bt-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>}
      <input id={`rt-bt-${k}`} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} aria-invalid={errors[k] ? true : undefined} aria-describedby={errors[k] ? `rt-bt-${k}-e` : undefined} {...props} />
    </div>
  );

  return (
    <div className="rt-acc__stack">
      <div className="rt-acc__card rt-biz__toolbar">
        <p className="rt-acc__note rt-biz__teamnote">{team.length + 1} {team.length ? "people manage" : "person manages"} this account.</p>
        <button type="button" ref={addRef} className="button -md -purple-1 text-white" aria-haspopup="dialog" onClick={() => { setErrors({}); setAdding(true); }}>{copy.add}</button>
      </div>
      <p className="rt-sr" aria-live="polite">{announce}</p>
      {announce && <p className="rt-acc__banner -done rt-biz__added" role="status">{announce}</p>}

      <div className="rt-acc__card rt-biz__tablecard">
        <table className="rt-biz__table">
          <thead><tr>{copy.columns.map((c, i) => <th key={c} scope="col">{i === 3 ? <span className="rt-sr">{c}</span> : c}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td data-label={copy.columns[0]}>
                <div className="rt-biz__who">
                  <Avatar name={ownerName} />
                  <div className="fb-list__main"><b>{ownerName}</b>{ownerEmail && <span>{ownerEmail}</span>}</div>
                </div>
              </td>
              <td data-label={copy.columns[1]}>{copy.roles.owner}<small>{copy.ownerNote}</small></td>
              <td data-label={copy.columns[2]}><span className="rt-pill rt-acc__status -confirmed">{copy.status.active}</span></td>
              <td data-label={copy.columns[3]}></td>
            </tr>
            {team.map((m) => {
              const name = `${m.first} ${m.last}`;
              return (
                <tr key={m.id}>
                  <td data-label={copy.columns[0]}>
                    <div className="rt-biz__who">
                      <Avatar name={name} />
                      <div className="fb-list__main"><b>{name}</b><span>{m.email}</span></div>
                    </div>
                  </td>
                  <td data-label={copy.columns[1]}>{copy.roles[m.role]}</td>
                  <td data-label={copy.columns[2]}><span className={`rt-pill rt-acc__status -${m.status === "active" ? "confirmed" : "requested"}`}>{copy.status[m.status]}</span></td>
                  <td data-label={copy.columns[3]}>
                    <div className="rt-biz__rowactions">
                      {m.status === "invited" && (
                        <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setAnnounce(`We have sent the invitation to ${m.email} again.`)}>{copy.resend}<span className="rt-sr"> to {name}</span></button>
                      )}
                      <button type="button" className="button -sm -outline-purple-1 text-purple-1" aria-haspopup="dialog" onClick={() => setRemoving(m)}>{copy.remove}<span className="rt-sr"> {name}</span></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title={copy.form.title} closeLabel="Close" fallbackFocus={addRef}>
        <form className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate>
          <p className="rt-acc__note">{copy.form.note}</p>
          <div className="rt-biz__pair">
            {field("first", copy.form.first, { type: "text", autoComplete: "off" })}
            {field("last", copy.form.last, { type: "text", autoComplete: "off" })}
          </div>
          {field("email", copy.form.email, { type: "email", inputMode: "email", spellCheck: false, autoComplete: "off" })}
          <div className="rt-field">
            <label htmlFor="rt-bt-role">{copy.form.role}</label>
            <p className="rt-field__hint" id="rt-bt-role-h">{copy.roleHint}</p>
            <FieldSelect id="rt-bt-role" label={copy.form.role} value="member" onChange={() => {}} options={[{ value: "member", label: copy.roles.member }]} describedBy="rt-bt-role-h" />
          </div>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={saving} aria-busy={saving}>{saving ? "Sending" : copy.form.submit}</button>
        </form>
      </Sheet>

      <Sheet open={Boolean(removing)} onClose={() => setRemoving(null)} title={removing ? copy.removeTitle.replace("{name}", `${removing.first} ${removing.last}`) : ""} closeLabel="Close">
        <div className="rt-q__form">
          <p className="rt-acc__note">{copy.removeText}</p>
          <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={remove}>{copy.removeConfirm}</button>
        </div>
      </Sheet>
    </div>
  );
}
