"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { api } from "@/lib/trpc/react";
import { Search, Tabs, formatWhen, getQuery, setQuery, TableSkeleton, Pager, SortTh, usePaging, Empty } from "./adminParts";
import { entryLabel, entrySummary, entryTarget, entryTimes } from "./activityWords";
import DateField from "./DateField";
import { AdminTag } from "./AdminStatus";

const copy = A.activity;
const KINDS = Object.keys(copy.kinds);
const FIRST = KINDS[0]; // the Important view: routine activity left out (API admin.activity, kind "important")
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

// The activity log viewer: the real, append-only log (API admin.activity), newest first. It opens on the important entries
// (routine ones are a tab away, under All and their own kinds). Search by a person's name or email, or any reference; filter
// by kind of action and by dates (UK days, both included). Clicking a person shows only what they did or
// what was done to them. The filters stay in the address, so a view can be shared; entries come in numbered pages, newest or oldest first.
export default function AdminActivity() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState(""); // what the list asks for, a moment after typing stops
  const [kind, setKind] = useState(FIRST);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ready, setReady] = useState(false);
  const paging = usePaging({ key: "when", dir: -1 });

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
    setQuery("kind", kind === FIRST ? "" : kind);
    setQuery("from", from);
    setQuery("to", to);
  }, [ready, search, kind, from, to]);

  const { sort, ...pageInput } = paging.input; // the log sorts by date only
  const input = { q: search || undefined, kind: kind === "all" ? undefined : kind, from: from || undefined, to: to || undefined, ...pageInput };
  const list = api.admin.activity.list.useQuery(input, { enabled: ready && paging.ready, placeholderData: (prev) => prev });
  const filtered = Boolean(search || kind !== FIRST || from || to);
  const clear = () => {
    paging.restart();
    setQ("");
    setSearch("");
    setKind(FIRST);
    setFrom("");
    setTo("");
  };
  const show = (who) => {
    paging.restart();
    setQ(who);
    setSearch(who);
  };

  const entries = list.data?.entries ?? [];
  const c = copy.columns;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={KINDS.map((key) => ({ key, label: copy.kinds[key] }))} value={kind} onChange={(k) => { setKind(k); paging.restart(); }} label="Show actions of this kind" />
        <Search value={q} onChange={(v) => { setQ(v); paging.restart(); }} label={copy.search} />
        <div className="rt-adm-activity__dates">
          <div className="rt-field">
            <label htmlFor="rt-adm-a-from" className="rt-sr">{copy.from}</label>
            <DateField id="rt-adm-a-from" compact clearable prefix={copy.from} placeholder="Any day" max={to || today()} value={from} onChange={(v) => { setFrom(v); paging.restart(); }} />
          </div>
          <div className="rt-field">
            <label htmlFor="rt-adm-a-to" className="rt-sr">{copy.to}</label>
            <DateField id="rt-adm-a-to" compact clearable prefix={copy.to} placeholder="Any day" min={from || undefined} max={today()} value={to} onChange={(v) => { setTo(v); paging.restart(); }} />
          </div>
        </div>
      </div>

      {list.error ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isPending ? <TableSkeleton /> : entries.length ? (
        <>
          <div className="rt-acc__card rt-biz__tablecard" aria-busy={list.isFetching}>
            <table className="rt-biz__table rt-adm-table">
              <thead><tr><SortTh label={c.when} col="when" sorter={paging.sorter} numeric /><th scope="col">{c.who}</th><th scope="col">{c.what}</th><th scope="col">{c.on}</th></tr></thead>
              <tbody>
                {entries.map((e) => {
                  const summary = entrySummary(e);
                  const target = entryTarget(e);
                  const times = entryTimes(e);
                  return (
                    <tr key={e.id}>
                      <td data-label={c.when}>
                        {formatWhen(Date.parse(e.at))}
                        {times && <small className="rt-adm-activity__times">{times}</small>}
                      </td>
                      <td data-label={c.who}>
                        {e.actor ? (
                          <button type="button" className="rt-adm-activity__who" onClick={() => show(e.actor.id)} title="Show only this person's activity">
                            <span className="rt-adm-strong">{e.actor.email ? e.actor.name : copy.deleted}</span>
                            {e.actor.email && <small>{e.actor.email}</small>}
                          </button>
                        ) : <span className="rt-adm-strong">{copy.system}</span>}
                        <span className="rt-adm-activity__as" title={copy.identityNote}><AdminTag>{copy.identities[e.identity]}</AdminTag></span>
                      </td>
                      <td data-label={c.what}>
                        <span className="rt-adm-strong">{entryLabel(e)}</span>
                        {summary && <small className="rt-adm-activity__summary" title={summary}>{summary}</small>}
                      </td>
                      <td data-label={c.on}>
                        {target ? <span className="rt-adm-activity__target">{target}</span> : <span className="rt-adm-muted">–</span>}
                        {e.organisation && target !== e.organisation && <small>{e.organisation}</small>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pager paging={paging} total={list.data.total} label="activity" />
          </div>
        </>
      ) : (
        <Empty kind={filtered ? "none" : "empty"} title={filtered ? copy.none : copy.empty} text={filtered ? undefined : "Decisions, changes and refused attempts show here as they happen."} action={filtered ? { label: copy.clear, onClick: clear } : undefined} />
      )}
    </div>
  );
}
