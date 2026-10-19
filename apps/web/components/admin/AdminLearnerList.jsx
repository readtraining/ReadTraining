"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { api } from "@/lib/trpc/react";
import { Pill, Search, Tabs, formatWhen, getQuery, setQuery, TableSkeleton, Pager, SortTh, usePaging } from "./adminParts";

const copy = A.learners;
const FILTERS = Object.keys(copy.filters);
export const STATE_TONE = { active: "ok", unconfirmed: "warn", blocked: "late" };

// The real learners (API admin.students): everyone with an account, newest first. Search by name, email or phone; filter by
// email not confirmed, blocked, or who also has a provider or business account. Search and filter stay in the address;
// numbered pages, sorted by name, join date or last sign-in (on the server). Each name opens the learner's record.
export default function AdminLearnerList() {
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

  return (
    <>
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
              <thead><tr><SortTh label={c.name} col="name" sorter={s} /><SortTh label={c.joined} col="joined" sorter={s} numeric /><SortTh label={c.last} col="last" sorter={s} numeric /><th scope="col">{c.accounts}</th><th scope="col">{c.status}</th></tr></thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st.id}>
                    <td data-label={c.name}><Link href={`/admin/learners/${st.id}`} className="rt-adm-strong">{st.name}</Link><small>{st.email}</small></td>
                    <td data-label={c.joined}>{formatWhen(Date.parse(st.joinedAt))}</td>
                    <td data-label={c.last}>{st.lastSignInAt ? formatWhen(Date.parse(st.lastSignInAt)) : <span className="rt-adm-muted">{copy.detail.notYet}</span>}</td>
                    <td data-label={c.accounts}>
                      {st.organisations.length || st.admin ? (
                        <span className="rt-adm-learners__orgs">
                          {st.organisations.map((o) => <span key={`${o.type}-${o.name}`}>{o.name}<small>{copy.detail.orgTypes[o.type]}</small></span>)}
                          {st.admin && <span>{copy.adminTag}</span>}
                        </span>
                      ) : <span className="rt-adm-muted">–</span>}
                    </td>
                    <td data-label={c.status}><Pill tone={STATE_TONE[st.status]}>{copy.states[st.status]}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager paging={paging} total={list.data.total} label="learners" />
        </>
      ) : (
        <EmptyState title={filtered ? copy.none : copy.empty} action={filtered ? { label: copy.clear, onClick: () => { setQ(""); setSearch(""); setFilter("all"); paging.restart(); } } : undefined} />
      )}
    </>
  );
}
