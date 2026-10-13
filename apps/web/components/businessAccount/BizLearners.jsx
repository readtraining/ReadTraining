"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { businessAccount as biz } from "@/data/businessAccount";
import { addLearner, getBusiness } from "@/lib/businessAccount";
import { formatDate } from "@/lib/format";
import { Avatar } from "@/components/marketing/parts";
import Sheet from "@/components/testPrep/runner/Sheet";
import { focusFirstError } from "@/lib/focusFirstError";
import { CertPill, certLine } from "./bizParts";

const copy = biz.learners;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FILTERS = ["all", "renewal", "unbooked", "invited"];
const certState = (l) => (l.certificates.some((c) => c.state === "expired") ? "expired" : l.certificates.some((c) => c.state === "renew") ? "renew" : l.certificates.length ? "valid" : null);

// Learner management: everyone on the account, searchable and filtered (renewal due, no training booked, invited), with their next
// course, certificate state and status (the /for-business page's learner list, as a table; cards on phones). A name opens the
// learner's training and certificates; "Add learner" (also ?add=1 from the dashboard) invites someone, who shows as Invited.
export default function BizLearners() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null); // the learner whose details are open
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", job: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [announce, setAnnounce] = useState("");
  const addRef = useRef(null);
  useEffect(() => {
    setData(getBusiness());
    if (new URLSearchParams(window.location.search).get("add") === "1") setAdding(true);
  }, []);

  const list = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.learners.filter((l) => {
      if (needle && !`${l.name} ${l.email}`.toLowerCase().includes(needle)) return false;
      if (filter === "renewal") return l.renewal;
      if (filter === "unbooked") return l.upcoming.length === 0;
      if (filter === "invited") return l.status === "invited";
      return true;
    });
  }, [data, q, filter]);
  if (!data) return null;

  const counts = { all: data.learners.length, renewal: data.learners.filter((l) => l.renewal).length, unbooked: data.learners.filter((l) => l.upcoming.length === 0).length, invited: data.learners.filter((l) => l.status === "invited").length };
  const learner = open && data.learners.find((l) => l.id === open);

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = "Enter their full name.";
    if (!form.email.trim()) found.email = "Enter their email address.";
    else if (!EMAIL_RE.test(form.email.trim())) found.email = "Enter an email address in the correct format, like name@example.com.";
    else if (data.learners.some((l) => l.email.toLowerCase() === form.email.trim().toLowerCase())) found.email = "This person is already on your account.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(e.currentTarget);
    setSaving(true);
    const added = await addLearner(form);
    setSaving(false);
    setAdding(false);
    setForm({ name: "", email: "", job: "" });
    setFilter("all");
    setQ("");
    setData(getBusiness());
    setAnnounce(`${added.name} added. We have emailed them an invitation.`);
  };
  const field = (k, label, props = {}) => (
    <div className="rt-field">
      <label htmlFor={`rt-bl-${k}`}>{label}</label>
      {errors[k] && <p className="rt-q__err" id={`rt-bl-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>}
      <input id={`rt-bl-${k}`} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} aria-invalid={errors[k] ? true : undefined} aria-describedby={errors[k] ? `rt-bl-${k}-e` : undefined} {...props} />
    </div>
  );

  return (
    <div className="rt-acc__stack">
      <div className="rt-acc__card rt-biz__toolbar">
        <label className="rt-field rt-biz__search">
          <span className="rt-sr">{copy.search}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy.search} autoComplete="off" />
        </label>
        <button type="button" ref={addRef} className="button -md -purple-1 text-white" aria-haspopup="dialog" onClick={() => { setErrors({}); setAdding(true); }}>{copy.add}</button>
        <div className="rt-acc__tabs rt-biz__filters" role="group" aria-label="Filter learners">
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`rt-tr__filter${filter === f ? " is-on" : ""}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {copy.filters[f]}<span className="rt-tr__filter-n">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="rt-sr" aria-live="polite">{announce || `${list.length} ${list.length === 1 ? "learner" : "learners"} shown`}</p>
      {announce && <p className="rt-acc__banner -done rt-biz__added" role="status">{announce}</p>}

      <div className="rt-acc__card rt-biz__tablecard">
        {list.length ? (
          <table className="rt-biz__table">
            <thead><tr>{copy.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
            <tbody>
              {list.map((l) => {
                const cs = certState(l);
                const next = l.upcoming[0];
                return (
                  <tr key={l.id}>
                    <td data-label={copy.columns[0]}>
                      <div className="rt-biz__who">
                        <Avatar name={l.name} />
                        <div className="fb-list__main">
                          <button type="button" className="rt-biz__name" aria-haspopup="dialog" onClick={() => setOpen(l.id)}>{l.name}</button>
                          <span>{l.email}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label={copy.columns[1]}>{l.job || "Not given"}</td>
                    <td data-label={copy.columns[2]}>{next ? <>{next.title}<small>{formatDate(next.date)}</small></> : <span className="rt-biz__muted">No training booked</span>}</td>
                    <td data-label={copy.columns[3]}>{cs ? <CertPill state={cs} /> : <span className="rt-biz__muted">None yet</span>}</td>
                    <td data-label={copy.columns[4]}><span className={`rt-pill rt-acc__status -${l.status === "active" ? "confirmed" : "cancelled"}`}>{copy.status[l.status]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="rt-acc__empty">{copy.empty}</p>
        )}
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title={copy.form.title} closeLabel="Close" fallbackFocus={addRef}>
        <form className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate>
          <p className="rt-acc__note">{copy.form.note}</p>
          {field("name", copy.form.name, { type: "text", autoComplete: "off" })}
          {field("email", copy.form.email, { type: "email", inputMode: "email", spellCheck: false, autoComplete: "off" })}
          {field("job", copy.form.job, { type: "text", autoComplete: "off" })}
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={saving} aria-busy={saving}>{saving ? "Adding" : copy.form.submit}</button>
        </form>
      </Sheet>

      <Sheet open={Boolean(learner)} onClose={() => setOpen(null)} title={learner ? learner.name : ""} closeLabel="Close">
        {learner && (
          <div className="rt-biz__detail">
            <p className="rt-acc__note">{learner.email}{learner.job ? ` · ${learner.job}` : ""} · {copy.status[learner.status]}</p>
            <h3 className="rt-acc__h3">{copy.detail.training}</h3>
            {learner.training.length ? (
              <ul className="rt-acc__certs">
                {learner.training.map((p) => (
                  <li key={p.id}><div><b>{p.title}</b><span>{formatDate(p.date)} · {p.venue ? p.city : "Live online"}</span></div><span className={`rt-pill rt-acc__status -${p.state === "upcoming" ? "confirmed" : "completed"}`}>{p.state === "upcoming" ? "Booked" : "Completed"}</span></li>
                ))}
              </ul>
            ) : <p className="rt-acc__empty">{copy.detail.none}</p>}
            <h3 className="rt-acc__h3">{copy.detail.certificates}</h3>
            {learner.certificates.length ? (
              <ul className="rt-acc__certs">
                {learner.certificates.map((c) => <li key={c.number}><div><b>{c.title}</b><span>{certLine(c)}</span></div><CertPill state={c.state} /></li>)}
              </ul>
            ) : <p className="rt-acc__empty">{copy.detail.noCerts}</p>}
            <Link href="/business/assignments" className="fb-textlink">{copy.detail.assign}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
          </div>
        )}
      </Sheet>
    </div>
  );
}
