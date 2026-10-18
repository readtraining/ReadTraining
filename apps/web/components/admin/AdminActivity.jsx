"use client";

import React, { useEffect, useState } from "react";
import { EmptyState, ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { api } from "@/lib/trpc/react";
import { Pill, Search, Tabs, formatWhen, getQuery, setQuery } from "./adminParts";

const copy = A.activity;
const KINDS = Object.keys(copy.kinds);
const IDENTITY_TONE = { student: "muted", provider: "info", business: "info", admin: "warn", system: "muted" };
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
// a change to the catalogue list is about an entry: show its name rather than its id
const CATALOGUE = new Set(["category", "subcategory", "topic", "method", "level"]);
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

// a log entry's extra facts (what it stored, and the IP address) as [label, words]; a code without words shows as stored
const word = (key, value) => {
  const d = copy.facts[key];
  if (d?.pounds) return `£${value}`;
  if (d?.percent) return value === "default" ? "Platform default" : `${value}%`;
  const v = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
  return d?.values?.[v] ?? copy.values[v] ?? v;
};
// in the order of copy.facts (the database doesn't keep the order they were stored in), any others after them
const ORDER = Object.keys(copy.facts);
const rank = (k) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length);
const facts = (e) =>
  Object.entries({ ...e.metadata, ...(e.ip ? { ip: e.ip } : {}) })
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([k, v]) => [copy.facts[k]?.label ?? k, word(k, v)]);

// The activity log viewer: the real, append-only log (API admin.activity), newest first. Search by a person's name or email, or
// any reference; filter by kind of action and by dates (UK days, both included). Clicking a person shows only what they did or
// what was done to them. The filters stay in the address, so a view can be shared; older entries load a page at a time.
export default function AdminActivity() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState(""); // what the list asks for, a moment after typing stops
  const [kind, setKind] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const k = getQuery("kind");
    const query = getQuery("q") || "";
    setQ(query);
    setSearch(query);
    if (KINDS.includes(k)) setKind(k);
    if (DAY_RE.test(getQuery("from") || "")) setFrom(getQuery("from"));
    if (DAY_RE.test(getQuery("to") || "")) setTo(getQuery("to"));
    setReady(true);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!ready) return;
    setQuery("q", search);
    setQuery("kind", kind === "all" ? "" : kind);
    setQuery("from", from);
    setQuery("to", to);
  }, [ready, search, kind, from, to]);

  const input = { q: search || undefined, kind: kind === "all" ? undefined : kind, from: from || undefined, to: to || undefined, limit: 50 };
  const list = api.admin.activity.list.useInfiniteQuery(input, { enabled: ready, getNextPageParam: (page) => page.next ?? undefined, placeholderData: (prev) => prev });
  const filtered = Boolean(search || kind !== "all" || from || to);
  const clear = () => {
    setQ("");
    setSearch("");
    setKind("all");
    setFrom("");
    setTo("");
  };
  const show = (who) => {
    setQ(who);
    setSearch(who);
  };

  const entries = list.data?.pages.flatMap((p) => p.entries) ?? [];
  const c = copy.columns;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Search value={q} onChange={setQ} label={copy.search} />
        <div className="rt-adm-activity__dates">
          <div className="rt-field">
            <label htmlFor="rt-adm-a-from">{copy.from}</label>
            <input id="rt-adm-a-from" type="date" max={to || today()} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-adm-a-to">{copy.to}</label>
            <input id="rt-adm-a-to" type="date" min={from || undefined} max={today()} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>
      <Tabs tabs={KINDS.map((key) => ({ key, label: copy.kinds[key] }))} value={kind} onChange={setKind} label="Show actions of this kind" />

      {list.error ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : !ready || list.isLoading ? null : entries.length ? (
        <>
          <div className="rt-acc__card rt-biz__tablecard" aria-busy={list.isFetching}>
            <table className="rt-biz__table rt-adm-table">
              <thead><tr><th scope="col">{c.when}</th><th scope="col">{c.who}</th><th scope="col">{c.what}</th><th scope="col">{c.on}</th></tr></thead>
              <tbody>
                {entries.map((e) => {
                  const more = facts(e);
                  return (
                    <tr key={e.id}>
                      <td data-label={c.when}>{formatWhen(Date.parse(e.at))}</td>
                      <td data-label={c.who}>
                        {e.actor ? (
                          <button type="button" className="rt-adm-activity__who" onClick={() => show(e.actor.id)} title="Show only this person's activity">
                            <span className="rt-adm-strong">{e.actor.email ? e.actor.name : copy.deleted}</span>
                            {e.actor.email && <small>{e.actor.email}</small>}
                          </button>
                        ) : <span className="rt-adm-strong">{copy.system}</span>}
                        <Pill tone={IDENTITY_TONE[e.identity]}>{copy.identities[e.identity]}</Pill>
                      </td>
                      <td data-label={c.what}>
                        <span className="rt-adm-strong">{copy.actions[e.action] ?? e.action}</span>
                        {more.length > 0 && (
                          <details className="rt-adm-activity__more">
                            <summary>{copy.details}</summary>
                            <dl>{more.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>
                          </details>
                        )}
                      </td>
                      <td data-label={c.on}>
                        {e.target && e.target.type !== "session" ? <span className="rt-adm-activity__target">{CATALOGUE.has(e.target.type) ? e.metadata.to ?? e.metadata.name ?? e.target.label : e.target.label}</span> : <span className="rt-adm-muted">–</span>}
                        {e.organisation && e.target?.label !== e.organisation && <small>{e.organisation}</small>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {list.hasNextPage && (
            <button type="button" className="button -md -outline-purple-1 text-purple-1 rt-adm-activity__older" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>{copy.more}</button>
          )}
        </>
      ) : (
        <EmptyState title={filtered ? copy.none : copy.empty} action={filtered ? { label: copy.clear, onClick: clear } : undefined} />
      )}
    </div>
  );
}
