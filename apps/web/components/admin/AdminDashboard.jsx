"use client";

import React from "react";
import Link from "next/link";
import { admin as A } from "@/data/admin";
import { useAdmin } from "@/lib/admin";
import { api } from "@/lib/trpc/react";
import { formatDate, formatPrice } from "@/lib/format";
import { Pill, Stats, formatWhen } from "./adminParts";
import { MONEY_TONE } from "./AdminOrders";
import { EmptyState, ErrorState } from "@/components/states/States";

const copy = A.dashboard;
const DAY = 86400000;
const demoTag = <span className="rt-demo-tag" title={A.demo.all.note}>{copy.demoTag}</span>;

// The latest entries of the real activity log (API admin.activity.list): who did what, and when.
function RecentActivity() {
  const log = api.admin.activity.list.useQuery({ limit: 6 }, { staleTime: 30000 });
  const entries = log.data?.entries ?? [];
  return (
    <section className="rt-acc__card" aria-labelledby="rt-adm-act-h" aria-busy={log.isLoading}>
      <div className="rt-acc__cardhead">
        <h2 className="rt-acc__h2" id="rt-adm-act-h">{copy.activity}</h2>
        <Link href="/admin/activity" className="fb-textlink">{copy.activityAll}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
      </div>
      {log.error ? (
        <ErrorState inCard onRetry={() => log.refetch()} />
      ) : log.isLoading ? (
        <ul className="rt-adm-feed" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <li key={i}><span className="rt-skel rt-skel--line" style={{ width: "70%", height: 14 }}></span></li>)}
        </ul>
      ) : entries.length ? (
        <ul className="rt-adm-feed">
          {entries.map((e) => (
            <li key={e.id}>
              <span className="rt-acc__avatar" aria-hidden="true">{(e.actor?.name || A.activity.system).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
              <div>
                <p><strong>{e.actor ? e.actor.name : A.activity.system}</strong> {(A.activity.actions[e.action] ?? e.action).toLowerCase()}{e.target?.label && e.target.type !== "session" ? <> · <span className="rt-adm-muted">{e.target.label}</span></> : null}</p>
                <small>{formatWhen(Date.parse(e.at))}</small>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState inCard title={copy.activityNone} />
      )}
    </section>
  );
}

// The admin dashboard: the four numbers that say how today is going (the account dashboard's stats strip), the queues with their
// counts and how many are overdue (provider applications are real, API admin.providers.counts; the rest is DEMO) beside the real
// activity log's latest entries, then the sessions starting this week without joining instructions (the gap Hurak's learners
// complain about) and the latest orders, both DEMO and tagged so.
export default function AdminDashboard() {
  const data = useAdmin();
  const providers = api.admin.providers.counts.useQuery();
  if (!data) return null;
  const { now, orders, approvals, changes } = data;
  const week = orders.filter((o) => o.booked > now - 7 * DAY && o.state !== "cancelled");
  const pending = approvals.filter((a) => a.status === "pending");
  const open = changes.filter((c) => c.open);
  const stats = [
    { icon: "icon-basket", value: String(week.length), label: copy.stats.orders },
    { icon: "icon-save-money", value: formatPrice(week.reduce((s, o) => s + o.total, 0)), label: copy.stats.revenue },
    { icon: "icon-check", value: String(pending.length + open.length), label: copy.stats.pending },
    { icon: "icon-wall-clock", value: String(data.counts.overdue), label: copy.stats.overdue },
  ];
  const queues = [
    { key: "approvals", n: pending.length, overdue: pending.filter((a) => a.due < now).length },
    { key: "applications", n: providers.data?.applications ?? 0, overdue: 0 },
    { key: "changes", n: open.length, overdue: open.filter((c) => c.due < now).length },
    // Phase 2 queues (lib/adminWork.js)
    { key: "requests", n: data.counts.requests, overdue: data.counts.requestsOverdue },
    { key: "credit", n: data.counts.credit, overdue: 0 },
    { key: "debt", n: data.counts.debt, overdue: 0 },
    { key: "candidates", n: data.counts.candidates, overdue: 0 },
  ];
  // the same sessions as Sessions and venues > Next 7 days
  const soon = data.sessions.filter((s) => !s.cancelled && s.daysAway <= 7 && !s.joiningSent);
  const latest = [...orders].sort((a, b) => b.booked - a.booked).slice(0, 5);

  return (
    <div className="rt-acc__stack">
      <Stats items={stats} label="Today" />

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-queues-h">
          <h2 className="rt-acc__h2" id="rt-adm-queues-h">{copy.queues}</h2>
          <ul className="rt-adm-queues">
            {queues.map((q) => (
              <li key={q.key}>
                <Link href={copy.queueItems[q.key].href} className={`rt-adm-queue${q.n ? "" : " is-clear"}`}>
                  <span className="rt-adm-queue__n">{q.n}</span>
                  <span className="rt-adm-queue__label">{copy.queueItems[q.key].label}</span>
                  {q.overdue > 0 && <Pill tone="late">{copy.overdueNote.replace("{n}", q.overdue)}</Pill>}
                  <i className="icon-chevron-right text-12" aria-hidden="true"></i>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <RecentActivity />
      </div>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-risk-h">
          <div className="rt-acc__cardhead">
            <h2 className="rt-acc__h2" id="rt-adm-risk-h">{copy.atRisk}</h2>
            {demoTag}
          </div>
          <p className="rt-acc__note rt-adm-cardnote">{copy.atRiskNote}</p>
          {soon.length ? (
            <ul className="rt-adm-list">
              {soon.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <div>
                    <Link href={`/admin/catalogue/${s.courseId}`} className="rt-adm-strong">{s.course}</Link>
                    <small>{formatDate(s.date)} · {s.provider} · {s.city}</small>
                  </div>
                  <Pill tone="warn">{copy.noJoining}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState inCard title={copy.atRiskNone} />
          )}
          {soon.length > 0 && <Link href="/admin/sessions?tab=week" className="fb-textlink rt-adm-mt">{soon.length > 5 ? `All ${soon.length} sessions` : "Open sessions"}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>}
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-adm-latest-h">
          <div className="rt-acc__cardhead">
            <h2 className="rt-acc__h2" id="rt-adm-latest-h">{copy.recent}</h2>
            {demoTag}
          </div>
          <ul className="rt-adm-list">
            {latest.map((o) => (
              <li key={o.ref}>
                <div>
                  <Link href={`/admin/orders/${o.ref}`} className="rt-adm-strong">{o.buyer.name}</Link>
                  <small>{o.lines[0].title} · {o.ref}</small>
                </div>
                <div className="rt-adm-list__side">
                  <strong className="rt-adm-num-cell">{formatPrice(o.total)}</strong>
                  <Pill tone={MONEY_TONE[o.lines[0].money]}>{A.orders.money[o.lines[0].money]}</Pill>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/admin/orders" className="fb-textlink rt-adm-mt">{copy.allOrders}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
        </section>
      </div>
    </div>
  );
}
