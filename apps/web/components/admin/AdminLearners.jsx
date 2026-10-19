"use client";

import React, { useEffect, useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { admin as A } from "@/data/admin";
import { certState, issueCertificate, reinstateCertificate, revokeCertificate, useAdmin } from "@/lib/admin";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate } from "@/lib/format";
import { Pill, Search, Tabs, getQuery, setQuery, Said, TableSkeleton } from "./adminParts";
import AdminLearnerList from "./AdminLearnerList";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { EmptyState } from "@/components/states/States";
import DateField from "./DateField";

const copy = A.learners;
const CERT_TONE = { valid: "ok", none: "ok", expiring: "warn", expired: "muted", revoked: "late" };
export const CertPill = ({ cert, now }) => {
  const st = certState(cert, now);
  return <Pill tone={CERT_TONE[st]}>{copy.certStates[st]}</Pill>;
};
const today = () => new Date().toISOString().slice(0, 10);

// Learners and certificates. Learners: the real accounts (AdminLearnerList), each opening the learner's record.
// Certificates: the register (number, holder, course, issued, expires, state), search, "Issue certificate" (holder, course, issue
// date; the number is made, never a duplicate) and Revoke (with a reason) / Reinstate. Tab in the address.
export default function AdminLearners() {
  const data = useAdmin();
  const [tab, setTab] = useState("learners");
  const [q, setQ] = useState("");
  const [revoking, setRevoking] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [form, setForm] = useState({ holder: "", courseId: "", issued: today() });
  const [errors, setErrors] = useState({});
  const [said, setSaid] = useState("");
  const formRef = useRef(null);
  useEffect(() => {
    if (getQuery("tab") === "certificates") setTab("certificates");
  }, []);
  if (!data) return <TableSkeleton />;

  const { certificates, catalogue, now } = data;
  const needle = q.trim().toLowerCase();
  const certs = certificates.filter((c) => !needle || `${c.number} ${c.holder}`.toLowerCase().includes(needle));
  const cc = copy.certColumns;

  const openRevoke = (c) => {
    setRevoking(c);
    setForm((f) => ({ ...f, reason: "" }));
    setErrors({});
  };
  const sendRevoke = (e) => {
    e.preventDefault();
    if (!form.reason?.trim()) {
      setErrors({ reason: copy.revokeError });
      return focusFirstError(formRef.current);
    }
    revokeCertificate(revoking, form.reason.trim());
    setSaid(`Revoked ${revoking.number}`);
    setRevoking(null);
  };
  const sendIssue = (e) => {
    e.preventDefault();
    const found = {};
    if (!form.holder.trim()) found.holder = "Enter the holder's full name, as it should appear on the certificate.";
    if (!form.courseId) found.courseId = "Select the course.";
    if (!form.issued) found.issued = "Enter the issue date.";
    else if (form.issued > today()) found.issued = "The issue date cannot be in the future.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    const course = catalogue.find((c) => String(c.id) === form.courseId);
    const years = /(\d+)\s*year/i.exec(course.validity || "");
    const number = issueCertificate({ holder: form.holder.trim(), course: course.title, provider: course.offerings[0]?.provider || "", issued: form.issued, years: years ? Number(years[1]) : null }, certificates);
    setSaid(`Issued ${number} to ${form.holder.trim()}`);
    setIssuing(false);
  };
  const err = (k) => errors[k] && <p className="rt-q__err" id={`rt-adm-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={[{ key: "learners", label: copy.tabs.learners }, { key: "certificates", label: copy.tabs.certificates, count: certificates.length }]} value={tab} onChange={(t) => { setTab(t); setQ(""); setQuery("tab", t === "certificates" ? t : ""); setQuery("q", ""); setQuery("show", ""); }} label="Show" />
        {tab === "certificates" && <div className="rt-adm-toolbar__end">
          <Search value={q} onChange={setQ} label={copy.certSearch} />
          <button type="button" className="button -sm -purple-1 text-white" onClick={() => { setIssuing(true); setErrors({}); setForm({ holder: "", courseId: "", issued: today() }); }}>{copy.issue}</button>
        </div>}
      </div>
      <Said text={said} />

      {tab === "learners" ? (
        <AdminLearnerList />
      ) : (
        <>
          <p className="rt-acc__note rt-adm-help">{copy.checkerNote}</p>
          {certs.length ? (
            <div className="rt-acc__card rt-biz__tablecard">
              <table className="rt-biz__table rt-adm-table">
                <thead>
                  <tr><th scope="col">{cc.number}</th><th scope="col">{cc.holder}</th><th scope="col">{cc.course}</th><th scope="col">{cc.expires}</th><th scope="col">{cc.status}</th><th scope="col"><span className="rt-sr">Action</span></th></tr>
                </thead>
                <tbody>
                  {certs.map((c) => (
                    <tr key={c.number}>
                      <td data-label={cc.number}><span className="rt-adm-strong">{c.number}</span><small>Issued {formatDate(c.issued)}</small></td>
                      <td data-label={cc.holder}>{c.holder}</td>
                      <td data-label={cc.course}>{c.course}<small>{c.provider}</small></td>
                      <td data-label={cc.expires}>{c.expires ? formatDate(c.expires) : <span className="rt-adm-muted">No expiry</span>}</td>
                      <td data-label={cc.status}><CertPill cert={c} now={now} />{c.revoked && c.revokeReason && <small>{c.revokeReason}</small>}</td>
                      <td className="rt-biz__act">
                        {c.revoked
                          ? <button type="button" className="rt-cd__link" onClick={() => { reinstateCertificate(c); setSaid(`Reinstated ${c.number}`); }}>{copy.reinstate}</button>
                          : <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => openRevoke(c)}>{copy.revoke}</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No certificates match." />}
        </>
      )}

      <Sheet open={Boolean(revoking)} onClose={() => setRevoking(null)} title={copy.revokeTitle} closeLabel="Close">
        {revoking && (
          <form className="rt-q__form rt-biz__sheetform" onSubmit={sendRevoke} noValidate ref={formRef}>
            <p className="rt-acc__note"><strong>{revoking.number}</strong> · {revoking.holder} · {revoking.course}</p>
            <div className="rt-field">
              <label htmlFor="rt-adm-reason">{copy.revokeReason}</label>
              {err("reason")}
              <textarea id="rt-adm-reason" rows={3} maxLength={600} value={form.reason || ""} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} aria-invalid={errors.reason ? true : undefined} aria-describedby={errors.reason ? "rt-adm-reason-e" : undefined} />
            </div>
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{copy.revoke}</button>
          </form>
        )}
      </Sheet>

      <Sheet open={issuing} onClose={() => setIssuing(false)} title={copy.issue} closeLabel="Close">
        <form className="rt-q__form rt-biz__sheetform" onSubmit={sendIssue} noValidate ref={formRef}>
          <div className="rt-field">
            <label htmlFor="rt-adm-holder">Holder's full name</label>
            {err("holder")}
            <input id="rt-adm-holder" type="text" autoComplete="off" value={form.holder} onChange={(e) => setForm((f) => ({ ...f, holder: e.target.value }))} aria-invalid={errors.holder ? true : undefined} aria-describedby={errors.holder ? "rt-adm-holder-e" : undefined} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-adm-courseId">Course</label>
            {err("courseId")}
            <FieldSelect id="rt-adm-courseId" label="Course" value={form.courseId} onChange={(value) => setForm((f) => ({ ...f, courseId: value }))} options={catalogue.map((c) => ({ value: c.id, label: c.title }))} invalid={Boolean(errors.courseId)} describedBy={errors.courseId ? "rt-adm-courseId-e" : undefined} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-adm-issued">Issue date</label>
            {err("issued")}
            <DateField id="rt-adm-issued" max={today()} value={form.issued} onChange={(v) => setForm((f) => ({ ...f, issued: v }))} invalid={Boolean(errors.issued)} describedBy={errors.issued ? "rt-adm-issued-e" : undefined} />
          </div>
          <p className="rt-acc__note">The expiry date comes from the course's validity.</p>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{copy.issue}</button>
        </form>
      </Sheet>
    </div>
  );
}
