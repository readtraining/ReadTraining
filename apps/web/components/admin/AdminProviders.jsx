"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { admin as A } from "@/data/admin";
import { docState, useAdmin } from "@/lib/admin";
import { Pill, Search, Tabs, getQuery, setQuery } from "./adminParts";

const copy = A.providers;
const TABS = ["all", "applied", "active", "suspended"];
export const STATUS_TONE = { applied: "info", review: "info", changes: "warn", active: "ok", suspended: "late", closed: "muted" };
const inTab = (p, tab) => tab === "all" || (tab === "applied" ? ["applied", "review", "changes"].includes(p.status) : p.status === tab);

// The worst accreditation state of a provider's documents, for the list
function AccState({ provider, now }) {
  const states = provider.documents.filter((d) => d.type === "Accreditation").map((d) => docState(d, now));
  if (states.includes("expired")) return <Pill tone="late">{copy.detail.expired}</Pill>;
  if (states.includes("expiring")) return <Pill tone="warn">{copy.detail.expiring}</Pill>;
  if (provider.documents.some((d) => !d.verified)) return <Pill tone="muted">To verify</Pill>;
  return <Pill tone="ok">{copy.detail.verified}</Pill>;
}

// Every provider and application: tabs (All, Applications, Active, Suspended, kept in the address), a search by name or city,
// and the business account's table (cards on phones): name and city, status, courses, commission, accreditation state.
export default function AdminProviders() {
  const data = useAdmin();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
  }, []);
  if (!data) return null;

  const needle = q.trim().toLowerCase();
  const list = data.providers.filter((p) => inTab(p, tab) && (!needle || `${p.name} ${p.city}`.toLowerCase().includes(needle)));
  const tabs = TABS.map((t) => ({ key: t, label: copy.tabs[t], count: data.providers.filter((p) => inTab(p, t)).length }));
  const c = copy.columns;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={tab} onChange={(t) => { setTab(t); setQuery("tab", t === "all" ? "" : t); }} label="Show providers" />
        <Search value={q} onChange={setQ} label={copy.search} />
      </div>
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "provider" : "providers"}`}</p>
      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead>
              <tr><th scope="col">{c.name}</th><th scope="col">{c.status}</th><th scope="col">{c.courses}</th><th scope="col">{c.commission}</th><th scope="col">{c.accreditation}</th></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.slug}>
                  <td data-label={c.name}><Link href={`/admin/providers/${p.slug}`} className="rt-adm-strong">{p.name}</Link><small>{p.city}{p.hold ? " · Payout hold" : ""}</small></td>
                  <td data-label={c.status}><Pill tone={STATUS_TONE[p.status]}>{copy.statuses[p.status]}</Pill></td>
                  <td data-label={c.courses}>{p.courses}</td>
                  <td data-label={c.commission}>{p.commission}%{p.commission !== data.fees.commission && <small>Override</small>}</td>
                  <td data-label={c.accreditation}><AccState provider={p} now={data.now} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rt-acc__card rt-acc__empty">No providers match.</p>
      )}
    </div>
  );
}
