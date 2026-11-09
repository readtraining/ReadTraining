"use client";

import React from "react";
import Link from "next/link";
import { admin as A } from "@/data/admin";
import { useAdmin } from "@/lib/admin";
import { api } from "@/lib/trpc/react";
import { formatDate, formatPrice } from "@/lib/format";
import { Stats, formatWhen, DetailSkeleton, Empty, actionLabel } from "./adminParts";
import { useAdminAccess } from "@/lib/adminContext";
import { ErrorState } from "@/components/states/States";
import { AdminStatus } from "./AdminStatus";
import { SHOW_DEMO } from "@/lib/demo";

const copy = A.dashboard;
// "Approved a course" after a name reads "approved a course"; only the first letter changes, so names and quotes keep theirs
const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);
const demoTag = <span className="rt-demo-tag" title={A.demo.all.note}>{copy.demoTag}</span>;

// The latest things people did on the platform (API admin.activity.list, kind "work": no sign-ins, refused attempts or
// automatic emails, which stay on the Activity log page): who did what, and when.
function RecentActivity() {
  const log = api.admin.activity.list.useQuery({ limit: 6, kind: "work" }, { staleTime: 30000 });
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
              <span className="rt-acc__avatar" aria-hidden="true">{(e.actor ? (e.actor.email ? e.actor.name : A.activity.deleted) : A.activity.system).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
              <div>
                <p>{e.actor ? <><strong>{e.actor.email ? e.actor.name : A.activity.deleted}</strong> {lowerFirst(actionLabel(e.action))}</> : <strong>{actionLabel(e.action)}</strong>}{e.target?.label && e.target.type !== "session" ? <> · <span className="rt-adm-muted">{e.target.label}</span></> : null}</p>
                <small>{formatWhen(Date.parse(e.at))}</small>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty inCard icon="activity" title="Nothing has happened yet" text={copy.activityNone} />
      )}
    </section>
  );
}

// The admin dashboard: the four numbers that say how today is going (the account dashboard's stats strip), the queues with their
// counts and how many are overdue (provider applications are real, API admin.providers.counts; the rest is DEMO) beside the real
// activity log's latest entries, then the sessions starting this week without joining instructions (the gap Hurak's learners
// complain about, DEMO and tagged so) and the latest real orders. The numbers on top and the money queues are real (API
// admin.orders.summary) for admins who can see orders.
export default function AdminDashboard() {
  const data = useAdmin();
  const me = useAdminAccess();
  const seesMoney = Boolean(me?.permissions?.includes("orders.view"));
  const providers = api.admin.providers.counts.useQuery();
  const courses = api.admin.courses.counts.useQuery();
  const money = api.admin.orders.summary.useQuery(undefined, { enabled: seesMoney });
  const latestOrders = api.admin.orders.list.useQuery({ limit: 5 }, { enabled: seesMoney });
  if (!data) return <DetailSkeleton />;
  const { now, changes } = data;
  const m = money.data;
  const open = changes.filter((c) => c.open);
  // real: orders and sales in the last 7 days, refunds to decide, payouts to approve
  const stats = [
    { icon: "icon-basket", value: m ? String(m.orders) : "–", label: copy.stats.orders },
    { icon: "icon-save-money", value: m ? formatPrice(m.sales) : "–", label: copy.stats.revenue },
    { icon: "icon-check", value: m ? String(m.refunds) : "–", label: copy.stats.refunds },
    { icon: "icon-bar-chart-2", value: m ? String(m.payoutsToApprove) : "–", label: copy.stats.payouts },
  ];
  const queues = [
    ...(m ? [{ key: "refunds", n: m.refunds, overdue: 0 }, { key: "disputes", n: m.disputes, overdue: m.disputesOverdue }, { key: "payouts", n: m.payoutsToApprove, overdue: 0 }] : []),
    { key: "applications", n: providers.data?.applications ?? 0, overdue: 0 },
    { key: "approvals", n: courses.data?.waiting ?? 0, overdue: courses.data?.overdue ?? 0 },
    // DEMO queues (lib/admin.js, lib/adminWork.js): development and the test copy only (lib/demo.js)
    ...(SHOW_DEMO ? [
      { key: "changes", n: open.length, overdue: open.filter((c) => c.due < now).length },
      { key: "requests", n: data.counts.requests, overdue: data.counts.requestsOverdue },
      { key: "credit", n: data.counts.credit, overdue: 0 },
      { key: "debt", n: data.counts.debt, overdue: 0 },
      { key: "candidates", n: data.counts.candidates, overdue: 0 },
    ] : []),
  ];
  // the same sessions as Sessions and venues > Next 7 days
  const soon = data.sessions.filter((s) => !s.cancelled && s.daysAway <= 7 && !s.joiningSent);

  return (
    <div className="rt-acc__stack">
      <Stats items={stats} label="Today" />

      <div className="rt-adm-dash">
        <div className="rt-adm-dash__col">
          <section className="rt-acc__card" aria-labelledby="rt-adm-queues-h">
            <h2 className="rt-acc__h2" id="rt-adm-queues-h">{copy.queues}</h2>
            <ul className="rt-adm-queues">
              {queues.map((q) => (
                <li key={q.key}>
                  <Link href={copy.queueItems[q.key].href} className={`rt-adm-queue${q.n ? "" : " is-clear"}`}>
                    <span className="rt-adm-queue__label">{copy.queueItems[q.key].label}</span>
                    {q.overdue > 0 && <AdminStatus kind="queue" status="overdue">{copy.overdueNote.replace("{n}", q.overdue)}</AdminStatus>}
                    <span className="rt-adm-queue__n rt-adm__count">{q.n}</span>
                    <i className="icon-chevron-right text-12" aria-hidden="true"></i>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {SHOW_DEMO && (
          <section className="rt-acc__card" aria-labelledby="rt-adm-risk-h">
            <div className="rt-acc__cardhead">
              <h2 className="rt-acc__h2" id="rt-adm-risk-h">{copy.atRisk}</h2>
              {demoTag}
              {/* in the card's header, as Activity log and All orders */}
              {soon.length > 0 && <Link href="/admin/sessions?tab=week" className="fb-textlink">{soon.length > 5 ? `All ${soon.length} sessions` : "Open sessions"}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>}
            </div>
            <p className="rt-acc__note rt-adm-cardnote">{copy.atRiskNote}</p>
            {soon.length ? (
              <ul className="rt-adm-list">
                {soon.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <div>
                      <span className="rt-adm-strong">{s.course}</span>
                      <small>{formatDate(s.date)} · {s.provider} · {s.city}</small>
                    </div>
                    <AdminStatus kind="queue" status="noJoining">{copy.noJoining}</AdminStatus>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty inCard icon="sessions" title="All set" text={copy.atRiskNone} />
            )}
          </section>
          )}

        </div>
        {/* what happened, then the latest orders: the right column balances the left (queues, sessions at risk) */}
        <div className="rt-adm-dash__col">
          <RecentActivity />
          {seesMoney && (
            <section className="rt-acc__card" aria-labelledby="rt-adm-latest-h">
              <div className="rt-acc__cardhead">
                <h2 className="rt-acc__h2" id="rt-adm-latest-h">{copy.recent}</h2>
                <Link href="/admin/orders" className="fb-textlink">{copy.allOrders}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
              </div>
              {latestOrders.data?.orders.length ? (
                <ul className="rt-adm-list">
                  {latestOrders.data.orders.map((o) => (
                    <li key={o.id}>
                      <div className="rt-adm-list__main">
                        <Link href={`/admin/orders/${o.ref}`} className="rt-adm-strong">{o.buyer.name}</Link>
                        <small title={`${o.course} · ${o.ref}`}>{o.course} · {o.ref}</small>
                      </div>
                      <div className="rt-adm-list__side">
                        <strong className="rt-adm-num-cell">{formatPrice(o.gross)}</strong>
                        <AdminStatus kind="order" status={o.status}>{A.orders.statuses[o.status]}</AdminStatus>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : latestOrders.isLoading ? null : (
                <Empty inCard icon="orders" title={A.orders.empty} text={A.orders.emptyText} />
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
