"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { admin as A } from "@/data/admin";
import { adminWork as W } from "@/data/adminWork";
import { useAdmin } from "@/lib/admin";
import { currentAdmin } from "@/lib/adminStore";
import { Search, Tabs, formatWhen, getQuery, setQuery, useSort, SortTh, Pager, usePaging, TableSkeleton } from "./adminParts";
import { EmptyState } from "@/components/states/States";
import { AdminStatus, AdminDue } from "./AdminStatus";

const copy = W.requests;
const TABS = ["open", "mine", "done", "all"];

const REQUEST_SORT = { when: (r) => r.at, who: (r) => r.name, kind: (r) => r.kind, status: (r) => r.status, due: (r) => (r.status === "new" ? -r.due : null) };

// The requests inbox (admin plan module 9): every "apply for me", training request, group or in-house quote, HS&E test booking
// and contact message, newest first. Tabs (Open, Assigned to me, Done, All, kept in the address), a search, and the table (cards
// on phones) with the kind, status, who has it and the reply-by date for new requests.
export default function AdminRequests() {
  const data = useAdmin();
  const [tab, setTab] = useState("open");
  const [q, setQ] = useState("");
  const sorter = useSort();
  const pages = usePaging({ key: "", dir: -1 });
  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
    const s = getQuery("q");
    if (s) setQ(s);
  }, []);
  if (!data) return <TableSkeleton />;

  const me = currentAdmin().name;
  const inTab = (r, t) => (t === "open" ? r.open : t === "mine" ? r.open && r.assignee === me : t === "done" ? !r.open : true);
  const needle = q.trim().toLowerCase();
  const list = data.requests.filter((r) => inTab(r, tab) && (!needle || `${r.ref} ${r.name} ${r.email} ${r.company || ""}`.toLowerCase().includes(needle)));
  const tabs = TABS.map((t) => ({ key: t, label: copy.tabs[t], count: data.requests.filter((r) => inTab(r, t)).length }));
  const c = copy.columns;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={tab} onChange={(t) => { setTab(t); setQuery("tab", t === "open" ? "" : t); pages.restart(); }} label="Show requests" />
        <Search value={q} onChange={(v) => { setQ(v); setQuery("q", v.trim()); pages.restart(); }} label={copy.search} />
      </div>
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "request" : "requests"}`}</p>
      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead>
              <tr><SortTh label={c.ref} col="when" sorter={sorter} numeric /><SortTh label={c.who} col="who" sorter={sorter} /><SortTh label={c.kind} col="kind" sorter={sorter} /><SortTh label={c.status} col="status" sorter={sorter} /><SortTh label={c.due} col="due" sorter={sorter} numeric /></tr>
            </thead>
            <tbody>
              {sorter.apply(list, REQUEST_SORT).slice((pages.page - 1) * pages.limit, pages.page * pages.limit).map((r) => (
                <tr key={r.ref}>
                  <td data-label={c.ref}><Link href={`/admin/requests/${r.ref}`} className="rt-adm-strong">{r.ref}</Link><small>{formatWhen(r.at)}</small></td>
                  <td data-label={c.who}>{r.name}<small>{r.company || r.email}</small></td>
                  <td data-label={c.kind}>{copy.kinds[r.kind]}<small>{r.title}</small></td>
                  <td data-label={c.status}><AdminStatus kind="request" status={r.status}>{copy.statuses[r.status]}</AdminStatus><small>{r.assignee || copy.unassigned}</small></td>
                  <td data-label={c.due}>{r.status === "new" ? <AdminDue due={r.due} now={data.now} /> : <span className="rt-acc__note">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="rt-adm-more"><Pager paging={pages} total={list.length} label="requests" /></div>
        </div>
      ) : (
        <EmptyState title="No requests here." />
      )}
    </div>
  );
}
