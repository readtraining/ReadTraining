"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { api } from "@/lib/trpc/react";
import { Pill, Search, Tabs, formatWhen, getQuery, setQuery, TableSkeleton, Pager, SortTh, usePaging } from "./adminParts";
import { formatRate } from "./commissionParts";

const copy = A.providers;
const TABS = Object.keys(copy.tabs);
export const STATUS_TONE = { pending: "info", changes_requested: "warn", active: "ok", suspended: "late", rejected: "muted" };

// The real provider accounts (API admin.providers): tabs with their counts (All, Applications, Active, Suspended, Not
// approved), a search by name, owner or phone, each with its commission (its own rate is marked), newest first and a page at
// a time. Tab and search stay in the address; each name opens the provider.
export default function AdminProviders() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);
  const paging = usePaging({ key: "applied", dir: -1 });

  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
    const query = getQuery("q") || "";
    setQ(query);
    setSearch(query);
    setReady(true);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!ready) return;
    setQuery("tab", tab === "all" ? "" : tab);
    setQuery("q", search);
  }, [ready, tab, search]);

  const counts = api.admin.providers.counts.useQuery();
  const list = api.admin.providers.list.useQuery({ q: search || undefined, tab: tab === "all" ? undefined : tab, ...paging.input }, { enabled: ready && paging.ready, placeholderData: (prev) => prev });
  const providers = list.data?.providers ?? [];
  const s = paging.sorter;
  const filtered = Boolean(search || tab !== "all");
  const c = copy.columns;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={TABS.map((key) => ({ key, label: copy.tabs[key], count: counts.data?.[key] }))} value={tab} onChange={(k) => { setTab(k); paging.restart(); }} label="Show providers" />
        <Search value={q} onChange={(v) => { setQ(v); paging.restart(); }} label={copy.search} />
      </div>
      {list.error ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isPending ? <TableSkeleton /> : providers.length ? (
        <>
          <div className="rt-acc__card rt-biz__tablecard" aria-busy={list.isFetching}>
            <table className="rt-biz__table rt-adm-table">
              <thead><tr><SortTh label={c.name} col="name" sorter={s} /><th scope="col">{c.owner}</th><SortTh label={c.applied} col="applied" sorter={s} numeric /><SortTh label={c.commission} col="commission" sorter={s} numeric /><SortTh label={c.status} col="status" sorter={s} /></tr></thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id}>
                    <td data-label={c.name}><Link href={`/admin/providers/${p.slug}`} className="rt-adm-strong">{p.name}</Link><small>/providers/{p.slug}</small></td>
                    <td data-label={c.owner}>{p.owner ? <><Link href={`/admin/learners/${p.owner.id}`} className="rt-adm-strong">{p.owner.name}</Link><small>{p.owner.email}</small></> : <span className="rt-adm-muted">–</span>}</td>
                    <td data-label={c.applied}>{formatWhen(Date.parse(p.appliedAt))}</td>
                    <td data-label={c.commission}>{formatRate(p.commissionBps)}{p.ownCommission && <small>{copy.ownRate}</small>}</td>
                    <td data-label={c.status}><Pill tone={STATUS_TONE[p.status]}>{copy.statuses[p.status]}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager paging={paging} total={list.data.total} label="providers" />
        </>
      ) : (
        <EmptyState title={filtered ? copy.none : copy.empty} action={filtered ? { label: copy.clear, onClick: () => { setQ(""); setSearch(""); setTab("all"); paging.restart(); } } : undefined} />
      )}
    </div>
  );
}
