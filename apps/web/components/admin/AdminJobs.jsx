"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminWork as W } from "@/data/adminWork";
import { useAdmin } from "@/lib/admin";
import { Pill, Search, Tabs, formatWhen, getQuery, setQuery } from "./adminParts";
import { EmptyState } from "@/components/states/States";

const copy = W.jobs;
const TABS = ["candidates", "roles", "employers"];
export const CANDIDATE_TONE = { new: "warn", started: "ok", unsuitable: "muted", withdrawn: "muted" };

// Security Jobs (admin plan module 10): candidates from the Security Jobs page (newest first, searchable), the open roles and the
// employers we work with, as three tabs kept in the address. The consent rule is stated once above the list.
export default function AdminJobs() {
  const data = useAdmin();
  const [tab, setTab] = useState("candidates");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
  }, []);
  if (!data) return null;

  const needle = q.trim().toLowerCase();
  const candidates = data.candidates.filter((c) => !needle || `${c.ref} ${c.name} ${c.postcode} ${c.city}`.toLowerCase().includes(needle));
  const tabs = [
    { key: "candidates", label: copy.tabs.candidates, count: data.candidates.length },
    { key: "roles", label: copy.tabs.roles, count: data.roles.length },
    { key: "employers", label: copy.tabs.employers, count: data.employers.length },
  ];

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={tab} onChange={(t) => { setTab(t); setQuery("tab", t === "candidates" ? "" : t); }} label="Show" />
        {tab === "candidates" && <Search value={q} onChange={setQ} label={copy.search} />}
      </div>
      <p className="rt-acc__note rt-adm-help"><i className="icon-check text-12" aria-hidden="true"></i> {copy.consentRule}</p>

      {tab === "candidates" && (candidates.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead><tr>{Object.values(copy.columns).map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.ref}>
                  <td data-label={copy.columns.ref}><Link href={`/admin/jobs/${c.ref}`} className="rt-adm-strong">{c.ref}</Link></td>
                  <td data-label={copy.columns.candidate}>{c.name}<small>{c.email}</small></td>
                  <td data-label={copy.columns.licence}>{c.licence.type}<small>Ends {c.licence.expiry} · ending {c.licence.last4}</small></td>
                  <td data-label={copy.columns.area}>{c.city || c.postcode}<small>{c.travel}</small></td>
                  <td data-label={copy.columns.status}><Pill tone={CANDIDATE_TONE[c.status] || "info"}>{copy.statuses[c.status]}</Pill></td>
                  <td data-label={copy.columns.applied}>{formatWhen(c.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="No candidates match." />)}

      {tab === "roles" && (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead><tr>{Object.values(copy.roleColumns).map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {data.roles.map((r) => (
                <tr key={r.id}>
                  <td data-label={copy.roleColumns.title}><b>{r.title}</b><small>{r.licence} licence</small></td>
                  <td data-label={copy.roleColumns.employer}>{r.employerName}</td>
                  <td data-label={copy.roleColumns.area}>{r.city}</td>
                  <td data-label={copy.roleColumns.shifts}>{r.shifts}</td>
                  <td data-label={copy.roleColumns.pay}>{r.pay}</td>
                  <td data-label={copy.roleColumns.openings}>{r.openings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "employers" && (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead><tr>{Object.values(copy.employerColumns).map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {data.employers.map((e) => (
                <tr key={e.id}>
                  <td data-label={copy.employerColumns.name}><b>{e.name}</b><small>{e.contact}</small></td>
                  <td data-label={copy.employerColumns.sector}>{e.sector}</td>
                  <td data-label={copy.employerColumns.area}>{e.city}</td>
                  <td data-label={copy.employerColumns.roles}>{e.roles}</td>
                  <td data-label={copy.employerColumns.placed}>{e.placed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
