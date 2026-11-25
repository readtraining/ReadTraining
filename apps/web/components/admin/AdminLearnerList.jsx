"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { api } from "@/lib/trpc/react";
import { ColWidths, Search, Tabs, formatWhen, getQuery, setQuery, TableSkeleton, Pager, SortTh, usePaging, Empty, RowMenu, Said } from "./adminParts";
import { AdminStatus, AdminTag } from "./AdminStatus";
import { BlockSheet, useDownloadData } from "./AdminLearner";
import { CloseAccountSheet } from "./AdminClosures";

const copy = A.learners;
const d = copy.detail;
const FILTERS = Object.keys(copy.filters);

// The real learners (API admin.students): everyone with an account, newest first. Search by name, email or phone; filter by
// email not confirmed, blocked, or who also has a provider or business account. Search and filter stay in the address;
// numbered pages, sorted by name, join date or last sign-in (on the server). Each name opens the learner's record; its ⋯ menu
// downloads their data, blocks or unblocks them and closes an account they asked to close, with the record's own pop-ups and rules.
export default function AdminLearnerList() {
  const me = useAdminAccess();
  const utils = api.useUtils();
  const [said, setSaid] = useState("");
  const [blocking, setBlocking] = useState(null); // { learner, kind: "block" | "unblock" }
  const [closing, setClosing] = useState(null); // { id, name, email }: their closure request
  const changed = (text) => {
    setSaid(text);
    utils.admin.students.list.invalidate();
    utils.admin.activity.list.invalidate();
  };
  const download = useDownloadData({ onDone: changed, onFail: setSaid });
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [ready, setReady] = useState(false);
  const paging = usePaging({ key: "joined", dir: -1 });

  useEffect(() => {
    const query = getQuery("q") || "";
    setQ(query);
    setSearch(query);
    if (FILTERS.includes(getQuery("show"))) setFilter(getQuery("show"));
    setReady(true);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!ready) return;
    setQuery("q", search);
    setQuery("show", filter === "all" ? "" : filter);
  }, [ready, search, filter]);

  const input = { q: search || undefined, status: filter === "all" ? undefined : filter, ...paging.input };
  const list = api.admin.students.list.useQuery(input, { enabled: ready && paging.ready, placeholderData: (prev) => prev });
  const students = list.data?.students ?? [];
  const s = paging.sorter;
  const filtered = Boolean(search || filter !== "all");
  const c = copy.columns;
  const can = (p) => me?.permissions?.includes(p);
  // the record page's actions, by its rules: never on themselves, and an admin's account isn't blocked from here
  const menu = (st) => {
    const mine = me?.id === st.id;
    return [
      { label: d.open, href: `/admin/learners/${st.id}` },
      ...(can("export") ? [{ label: d.exportData, onClick: () => download.run(st) }] : []),
      ...(can("suspend") && !mine && !st.admin ? [st.status === "blocked" ? { label: d.unblock, onClick: () => setBlocking({ learner: st, kind: "unblock" }) } : { label: d.block, danger: true, onClick: () => setBlocking({ learner: st, kind: "block" }) }] : []),
      ...(can("suspend") && !mine && st.closureId ? [{ label: d.closeAccount, danger: true, onClick: () => setClosing({ id: st.closureId, name: st.name, email: st.email }) }] : []),
    ];
  };

  return (
    <>
      <Said text={said} />
      <div className="rt-adm-toolbar">
        <Tabs tabs={FILTERS.map((key) => ({ key, label: copy.filters[key] }))} value={filter} onChange={(k) => { setFilter(k); paging.restart(); }} label="Show learners" />
        <Search value={q} onChange={(v) => { setQ(v); paging.restart(); }} label={copy.search} />
      </div>
      {list.error ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isPending ? <TableSkeleton /> : students.length ? (
        <>
          <div className="rt-acc__card rt-biz__tablecard" aria-busy={list.isFetching}>
            <table className="rt-biz__table rt-adm-table">
              <ColWidths widths={["26%", "13%", "14%", "25%", null, "64px"]} />
              <thead><tr><SortTh label={c.name} col="name" sorter={s} /><SortTh label={c.joined} col="joined" sorter={s} numeric /><SortTh label={c.last} col="last" sorter={s} numeric /><th scope="col">{c.accounts}</th><th scope="col">{c.status}</th><th scope="col"><span className="rt-sr">Actions</span></th></tr></thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st.id}>
                    <td data-label={c.name}><Link href={`/admin/learners/${st.id}`} className="rt-adm-strong">{st.name}</Link><small>{st.email}</small></td>
                    <td data-label={c.joined}>{formatWhen(Date.parse(st.joinedAt))}</td>
                    <td data-label={c.last}>{st.lastSignInAt ? formatWhen(Date.parse(st.lastSignInAt)) : <span className="rt-adm-muted">{copy.detail.notYet}</span>}</td>
                    <td data-label={c.accounts}>
                      {st.organisations.length || st.admin ? (
                        <span className="rt-adm-learners__orgs">
                          {st.organisations.map((o) => <span key={`${o.type}-${o.name}`}>{o.name} <AdminTag>{copy.detail.orgTypes[o.type]}</AdminTag></span>)}
                          {st.admin && <span>ReadTraining <AdminTag>{copy.adminTag}</AdminTag></span>}
                        </span>
                      ) : <span className="rt-adm-muted">–</span>}
                    </td>
                    <td data-label={c.status}><AdminStatus kind="learner" status={st.status}>{copy.states[st.status]}</AdminStatus></td>
                    <td className="rt-biz__act"><RowMenu label={`Actions for ${st.name}`} items={menu(st)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager paging={paging} total={list.data.total} label="learners" />
          </div>
        </>
      ) : (
        <Empty kind={filtered ? "none" : "empty"} title={filtered ? copy.none : copy.empty} text={filtered ? undefined : "People who sign up on the website show here."} action={filtered ? { label: copy.clear, onClick: () => { setQ(""); setSearch(""); setFilter("all"); paging.restart(); } } : undefined} />
      )}
      <BlockSheet learner={blocking?.learner ?? { id: "", name: "" }} kind={blocking?.kind ?? null} onClose={() => setBlocking(null)} onDone={changed} />
      <CloseAccountSheet request={closing} onClose={() => setClosing(null)} onDone={() => setSaid(A.closures.closed)} />
    </>
  );
}
