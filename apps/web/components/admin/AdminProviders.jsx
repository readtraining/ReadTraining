"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { api } from "@/lib/trpc/react";
import { Search, Tabs, formatWhen, getQuery, setQuery, TableSkeleton, Pager, SortTh, usePaging, Empty, PageLink, RowMenu, Said } from "./adminParts";
import { formatRate } from "./commissionParts";
import { AdminStatus } from "./AdminStatus";
import { DANGER, DecisionSheet, decisionsFor } from "./AdminProvider";

const copy = A.providers;
const TABS = Object.keys(copy.tabs);

// The real provider accounts (API admin.providers): tabs with their counts (All, Applications, Active, Suspended, Not
// approved), a search by name, owner or phone, each with its commission (its own rate is marked), newest first and a page at
// a time. Tab and search stay in the address; each name opens the provider. Each row's ⋮ menu opens it, its edit pages, and
// the decisions the admin can make on it now (approve, ask for changes, don't approve, suspend, reinstate), in the provider
// page's own pop-up, with the same rules, emails and activity log; the row and the tab counts update straight after.
export default function AdminProviders() {
  const me = useAdminAccess();
  // the provider's record needs approve, suspend or finance settings; an admin with only the pricing switch opens its price plans
  const readsRecord = ["approve", "suspend", "finance.settings"].some((x) => me?.permissions?.includes(x));
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);
  const paging = usePaging({ key: "applied", dir: -1 });
  const utils = api.useUtils();
  const [deciding, setDeciding] = useState(null); // { provider, decision }
  const [said, setSaid] = useState("");
  const [warning, setWarning] = useState("");
  const d = copy.detail;
  const decided = async (decision, { emailed, outbox }) => {
    setSaid(outbox ? `${d.done[decision]}. ${d.emailOutbox}` : d.done[decision]);
    setWarning(emailed || outbox ? "" : d.notEmailed);
    utils.admin.activity.list.invalidate();
    await utils.admin.providers.invalidate().catch(() => {}); // the list and the tab counts
  };
  const menu = (p) => [
    { label: d.open, href: readsRecord ? `/admin/providers/${p.slug}` : `/admin/providers/${p.slug}/plans` },
    ...(p.status === "active" || p.status === "suspended" ? d.edit.items.filter((x) => x.needs.some((s) => me?.permissions?.includes(s))).map((x) => ({ label: x.label, href: `/admin/providers/${p.slug}/${x.path}` })) : []),
    ...decisionsFor(p, me).map((k) => ({ label: d.actions[k], danger: DANGER.has(k), onClick: () => setDeciding({ provider: p, decision: k }) })),
  ];

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
      <Said text={said} />
      {warning && <p className="rt-adm-item__block" role="alert">{warning}</p>}
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
              <thead><tr><SortTh label={c.name} col="name" sorter={s} /><th scope="col">{c.owner}</th><SortTh label={c.applied} col="applied" sorter={s} numeric /><SortTh label={c.commission} col="commission" sorter={s} numeric right /><SortTh label={c.status} col="status" sorter={s} /><th scope="col"><span className="rt-sr">Actions</span></th></tr></thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id}>
                    <td data-label={c.name}><Link href={readsRecord ? `/admin/providers/${p.slug}` : `/admin/providers/${p.slug}/plans`} className="rt-adm-strong">{p.name}</Link></td>
                    <td data-label={c.owner}>{p.owner ? <><PageLink href={`/admin/learners/${p.owner.id}`} className="rt-adm-strong">{p.owner.name}</PageLink><small>{p.owner.email}</small></> : <span className="rt-adm-muted">–</span>}</td>
                    <td data-label={c.applied}>{formatWhen(Date.parse(p.appliedAt))}</td>
                    <td data-label={c.commission} className="rt-adm-num-cell">{formatRate(p.commissionBps)}{p.ownCommission && <small>{copy.ownRate}</small>}</td>
                    <td data-label={c.status}><AdminStatus kind="provider" status={p.status}>{copy.statuses[p.status]}</AdminStatus></td>
                    <td className="rt-biz__act"><RowMenu label={`Actions for ${p.name}`} items={menu(p)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager paging={paging} total={list.data.total} label="providers" />
          </div>
        </>
      ) : (
        <Empty kind={filtered ? "none" : "empty"} title={filtered ? copy.none : copy.empty} text={filtered ? undefined : "Training providers who apply show here."} action={filtered ? { label: copy.clear, onClick: () => { setQ(""); setSearch(""); setTab("all"); paging.restart(); } } : undefined} />
      )}
      <DecisionSheet provider={deciding?.provider ?? { name: "" }} decision={deciding?.decision ?? null} onClose={() => setDeciding(null)} onDone={decided} />
    </div>
  );
}
