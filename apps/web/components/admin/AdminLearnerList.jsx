"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { api } from "@/lib/trpc/react";
import { Pill, Search, Tabs, formatWhen, getQuery, setQuery, TableSkeleton } from "./adminParts";

const copy = A.learners;
const FILTERS = Object.keys(copy.filters);
export const STATE_TONE = { active: "ok", unconfirmed: "warn", blocked: "late" };

// The real learners (API admin.students): everyone with an account, newest first. Search by name, email or phone; filter by
// email not confirmed, blocked, or who also has a provider or business account. Search and filter stay in the address;
// more accounts load a page at a time. Each name opens the learner's record.
export default function AdminLearnerList() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [ready, setReady] = useState(false);

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

  const input = { q: search || undefined, status: filter === "all" ? undefined : filter, limit: 50 };
  const list = api.admin.students.list.useInfiniteQuery(input, { enabled: ready, getNextPageParam: (page) => page.next ?? undefined, placeholderData: (prev) => prev });
  const students = list.data?.pages.flatMap((p) => p.students) ?? [];
  const filtered = Boolean(search || filter !== "all");
  const c = copy.columns;

  return (
    <>
      <div className="rt-adm-toolbar">
        <Tabs tabs={FILTERS.map((key) => ({ key, label: copy.filters[key] }))} value={filter} onChange={setFilter} label="Show learners" />
        <Search value={q} onChange={setQ} label={copy.search} />
      </div>
      {list.error ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : !ready || list.isLoading ? <TableSkeleton /> : students.length ? (
        <>
          <div className="rt-acc__card rt-biz__tablecard" aria-busy={list.isFetching}>
            <table className="rt-biz__table rt-adm-table">
              <thead><tr><th scope="col">{c.name}</th><th scope="col">{c.joined}</th><th scope="col">{c.last}</th><th scope="col">{c.accounts}</th><th scope="col">{c.status}</th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td data-label={c.name}><Link href={`/admin/learners/${s.id}`} className="rt-adm-strong">{s.name}</Link><small>{s.email}</small></td>
                    <td data-label={c.joined}>{formatWhen(Date.parse(s.joinedAt))}</td>
                    <td data-label={c.last}>{s.lastSignInAt ? formatWhen(Date.parse(s.lastSignInAt)) : <span className="rt-adm-muted">{copy.detail.notYet}</span>}</td>
                    <td data-label={c.accounts}>
                      {s.organisations.length || s.admin ? (
                        <span className="rt-adm-learners__orgs">
                          {s.organisations.map((o) => <span key={`${o.type}-${o.name}`}>{o.name}<small>{copy.detail.orgTypes[o.type]}</small></span>)}
                          {s.admin && <span>{copy.adminTag}</span>}
                        </span>
                      ) : <span className="rt-adm-muted">–</span>}
                    </td>
                    <td data-label={c.status}><Pill tone={STATE_TONE[s.status]}>{copy.states[s.status]}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.hasNextPage && (
            <button type="button" className="button -md -outline-purple-1 text-purple-1 rt-adm-activity__older" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>{copy.more}</button>
          )}
        </>
      ) : (
        <EmptyState title={filtered ? copy.none : copy.empty} action={filtered ? { label: copy.clear, onClick: () => { setQ(""); setSearch(""); setFilter("all"); } } : undefined} />
      )}
    </>
  );
}
