"use client";

import React, { useEffect, useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { admin as A } from "@/data/admin";
import { inviteStaff, saveFees, setStaffRole, useAdmin } from "@/lib/admin";
import { currentAdmin } from "@/lib/adminStore";
import { focusFirstError } from "@/lib/focusFirstError";
import { Pill, Search, Tabs, formatWhen, getQuery, setQuery } from "./adminParts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { EmptyState } from "@/components/states/States";

const copy = A.settings;
const TABS = ["staff", "fees", "audit"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const roleLabel = (key) => copy.roles.find((r) => r.key === key).label;
// what each fee field accepts: [min, max, whole numbers only]
const LIMITS = { commission: [0, 60, false], card: [0, 10, false], bnpl: [0, 15, false], payoutDay: [1, 28, true], supportLimit: [0, 1000, true] };

// Settings and audit. Staff and roles: the three launch roles (what each can and cannot do), every staff member with their role
// (changed in place, but never your own), two-factor and last sign-in, and "Invite staff". Fees and payouts: default commission,
// card and Klarna fees, payout day and the Support limit, checked and saved together. Audit log: every change made in the admin,
// newest first, searchable. Tab in the address.
export default function AdminSettings() {
  const data = useAdmin();
  const [tab, setTab] = useState("staff");
  const [fees, setFees] = useState(null);
  const [errors, setErrors] = useState({});
  const [inviting, setInviting] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", role: "support" });
  const [q, setQ] = useState("");
  const [said, setSaid] = useState("");
  const feeRef = useRef(null);
  const inviteRef = useRef(null);
  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
  }, []);
  useEffect(() => {
    if (data && !fees) setFees(Object.fromEntries(Object.entries(data.fees).map(([k, v]) => [k, String(v)])));
  }, [data, fees]);
  if (!data || !fees) return null;

  const err = (k) => errors[k] && <p className="rt-q__err" id={`rt-adm-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>;
  const pick = (t) => {
    setTab(t);
    setErrors({});
    setQuery("tab", t === "staff" ? "" : t);
  };

  const submitFees = (e) => {
    e.preventDefault();
    const found = {};
    Object.entries(LIMITS).forEach(([k, [min, max, whole]]) => {
      const v = fees[k].trim();
      const ok = whole ? /^\d+$/.test(v) : /^\d+(\.\d{1,2})?$/.test(v);
      if (!ok || Number(v) < min || Number(v) > max) found[k] = `Enter ${whole ? "a whole number" : "a number"} from ${min} to ${max}.`;
    });
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(feeRef.current);
    saveFees(Object.fromEntries(Object.entries(fees).map(([k, v]) => [k, Number(v)])), data.fees);
    setSaid(copy.feesSaved);
  };
  const submitInvite = (e) => {
    e.preventDefault();
    const found = {};
    if (!invite.name.trim()) found.iname = "Enter their full name.";
    if (!EMAIL_RE.test(invite.email.trim())) found.iemail = "Enter an email address in the correct format, like name@readtraining.co.uk.";
    else if (data.staff.some((s) => s.email.toLowerCase() === invite.email.trim().toLowerCase())) found.iemail = "This email address already has a staff account.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(inviteRef.current);
    inviteStaff({ name: invite.name.trim(), email: invite.email.trim(), role: invite.role });
    setSaid(`Invited ${invite.name.trim()}`);
    setInviting(false);
  };

  const needle = q.trim().toLowerCase();
  const log = data.audit.filter((a) => !needle || `${a.action} ${a.target} ${a.who}`.toLowerCase().includes(needle));
  const tabs = [{ key: "staff", label: copy.tabs.staff, count: data.staff.length }, { key: "fees", label: copy.tabs.fees }, { key: "audit", label: copy.tabs.audit, count: data.audit.length }];
  const sc = copy.staffColumns;
  const ac = copy.auditColumns;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={tab} onChange={pick} label="Show settings" />
        {tab === "staff" && <button type="button" className="button -sm -purple-1 text-white" onClick={() => { setInviting(true); setErrors({}); setInvite({ name: "", email: "", role: "support" }); }}>{copy.invite}</button>}
        {tab === "audit" && <Search value={q} onChange={setQ} label={copy.auditSearch} />}
      </div>
      <p className="rt-sr" aria-live="polite">{said}</p>

      {tab === "staff" && (
        <>
          <ul className="rt-teamtiles rt-adm-roles">
            {copy.roles.map((r) => (
              <li key={r.key} className="rt-teamtile">
                <h3 className="rt-teamtile__title">{r.label}</h3>
                <p className="rt-teamtile__text"><strong>Can:</strong> {r.can}</p>
                <p className="rt-teamtile__text"><strong>Cannot:</strong> {r.cannot}</p>
              </li>
            ))}
          </ul>
          <div className="rt-acc__card rt-biz__tablecard">
            <table className="rt-biz__table rt-adm-table">
              <thead><tr><th scope="col">{sc.name}</th><th scope="col">{sc.role}</th><th scope="col">{sc.twofa}</th><th scope="col">{sc.last}</th></tr></thead>
              <tbody>
                {data.staff.map((s) => {
                  const me = s.email === currentAdmin().email;
                  return (
                    <tr key={s.email}>
                      <td data-label={sc.name}><span className="rt-adm-strong">{s.name}{me ? " (you)" : ""}</span><small>{s.email}</small></td>
                      <td data-label={sc.role}>
                        {me ? roleLabel(s.role) : (
                          <span className="rt-field rt-adm-select -inline">
                            <label htmlFor={`rt-adm-role-${s.email}`} className="rt-sr">Role for {s.name}</label>
                            <FieldSelect id={`rt-adm-role-${s.email}`} label={`Role for ${s.name}`} value={s.role} onChange={(value) => { setStaffRole(s, value); setSaid(`${s.name} is now ${roleLabel(value)}`); }} options={copy.roles.map((r) => ({ value: r.key, label: r.label }))} compact />
                          </span>
                        )}
                      </td>
                      <td data-label={sc.twofa}>{s.invited ? <Pill tone="info">{copy.invited}</Pill> : s.twofa ? <Pill tone="ok">On</Pill> : <Pill tone="late">Off</Pill>}</td>
                      <td data-label={sc.last}>{s.last ? formatWhen(s.last) : <span className="rt-adm-muted">Not yet</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "fees" && (
        <form className="rt-acc__card rt-adm-fees" onSubmit={submitFees} noValidate ref={feeRef}>
          <p className="rt-acc__note rt-adm-cardnote">{copy.feesNote}</p>
          <div className="rt-adm-fees__grid">
            {Object.entries(copy.fees).map(([k, f]) => (
              <div key={k} className="rt-field">
                <label htmlFor={`rt-adm-${k}`}>{f.label}{f.unit && ` (${f.unit})`}</label>
                <small className="rt-field__hint" id={`rt-adm-${k}-hint`}>{f.hint}</small>
                {err(k)}
                <input id={`rt-adm-${k}`} type="text" inputMode="decimal" value={fees[k]} onChange={(e) => setFees((x) => ({ ...x, [k]: e.target.value }))} aria-invalid={errors[k] ? true : undefined} aria-describedby={`rt-adm-${k}-hint${errors[k] ? ` rt-adm-${k}-e` : ""}`} className="rt-adm-num" />
              </div>
            ))}
          </div>
          <button type="submit" className="button -md -purple-1 text-white">Save settings</button>
        </form>
      )}

      {tab === "audit" && (
        log.length ? (
          <div className="rt-acc__card rt-biz__tablecard">
            <table className="rt-biz__table rt-adm-table">
              <thead><tr><th scope="col">{ac.when}</th><th scope="col">{ac.who}</th><th scope="col">{ac.action}</th><th scope="col">{ac.target}</th></tr></thead>
              <tbody>
                {log.map((a, i) => (
                  <tr key={`${a.at}-${i}`}>
                    <td data-label={ac.when}>{formatWhen(a.at)}</td>
                    <td data-label={ac.who}>{a.who}</td>
                    <td data-label={ac.action}><span className="rt-adm-strong">{a.action}</span></td>
                    <td data-label={ac.target}>{a.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title={data.audit.length ? "No changes match." : copy.auditEmpty} />
      )}

      <Sheet open={inviting} onClose={() => setInviting(false)} title={copy.inviteTitle} closeLabel="Close">
        <form className="rt-q__form rt-biz__sheetform" onSubmit={submitInvite} noValidate ref={inviteRef}>
          <div className="rt-field">
            <label htmlFor="rt-adm-iname">Full name</label>
            {err("iname")}
            <input id="rt-adm-iname" type="text" autoComplete="off" value={invite.name} onChange={(e) => setInvite((x) => ({ ...x, name: e.target.value }))} aria-invalid={errors.iname ? true : undefined} aria-describedby={errors.iname ? "rt-adm-iname-e" : undefined} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-adm-iemail">Work email</label>
            {err("iemail")}
            <input id="rt-adm-iemail" type="email" inputMode="email" spellCheck={false} autoComplete="off" value={invite.email} onChange={(e) => setInvite((x) => ({ ...x, email: e.target.value }))} aria-invalid={errors.iemail ? true : undefined} aria-describedby={errors.iemail ? "rt-adm-iemail-e" : undefined} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-adm-irole">Role</label>
            <FieldSelect id="rt-adm-irole" label="Role" value={invite.role} onChange={(value) => setInvite((x) => ({ ...x, role: value }))} options={copy.roles.map((r) => ({ value: r.key, label: r.label }))} />
          </div>
          <p className="rt-acc__note">They get an email to set a password and turn on two-factor sign-in.</p>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{copy.invite}</button>
        </form>
      </Sheet>
    </div>
  );
}
