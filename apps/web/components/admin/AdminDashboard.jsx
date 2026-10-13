"use client";

import React from "react";
import Link from "next/link";
import { admin as A } from "@/data/admin";
import { docState, useAdmin } from "@/lib/admin";
import { formatDate, formatPrice } from "@/lib/format";
import { Pill } from "./adminParts";
import { MONEY_TONE } from "./AdminOrders";

const copy = A.dashboard;
const DAY = 86400000;

// The admin dashboard: the four numbers that say how today is going (the account dashboard's stats strip), the queues with their
// counts and how many are overdue, the sessions starting this week without joining instructions (the gap Hurak's learners
// complain about), and the latest orders.
export default function AdminDashboard() {
  const data = useAdmin();
  if (!data) return null;
  const { now, orders, approvals, changes, providers } = data;
  const week = orders.filter((o) => o.booked > now - 7 * DAY && o.state !== "cancelled");
  const pending = approvals.filter((a) => a.status === "pending");
  const open = changes.filter((c) => c.open);
  const docs = providers.filter((p) => p.listed && p.documents.some((d) => docState(d, now) !== "ok"));
  const stats = [
    { icon: "icon-basket", value: String(week.length), label: copy.stats.orders },
    { icon: "icon-save-money", value: formatPrice(week.reduce((s, o) => s + o.total, 0)), label: copy.stats.revenue },
    { icon: "icon-check", value: String(pending.length + open.length), label: copy.stats.pending },
    { icon: "icon-wall-clock", value: String(data.counts.overdue), label: copy.stats.overdue },
  ];
  const queues = [
    { key: "approvals", n: pending.length, overdue: pending.filter((a) => a.due < now).length },
    { key: "applications", n: data.counts.applications, overdue: 0 },
    { key: "changes", n: open.length, overdue: open.filter((c) => c.due < now).length },
    { key: "documents", n: docs.length, overdue: 0 },
  ];
  // the same sessions as Sessions and venues > Next 7 days
  const soon = data.sessions.filter((s) => !s.cancelled && s.daysAway <= 7 && !s.joiningSent);
  const latest = [...orders].sort((a, b) => b.booked - a.booked).slice(0, 6);

  return (
    <div className="rt-acc__stack">
      <ul className="rt-tps__keyfacts rt-acc__stats" aria-label="Today">
        {stats.map((s) => (
          <li key={s.label} className="rt-tps__keyfact">
            <span className="rt-benefit__icon" aria-hidden="true"><i className={`${s.icon} text-16`}></i></span>
            <span className="rt-tps__keyfact-text"><strong>{s.value}</strong><span className="rt-sr">, </span><span>{s.label}</span></span>
          </li>
        ))}
      </ul>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-queues-h">
          <h2 className="rt-acc__h2" id="rt-adm-queues-h">{copy.queues}</h2>
          <ul className="rt-adm-queues">
            {queues.map((q) => (
              <li key={q.key}>
                <Link href={copy.queueItems[q.key].href} className="rt-adm-queue">
                  <span className="rt-adm-queue__n">{q.n}</span>
                  <span className="rt-adm-queue__label">{copy.queueItems[q.key].label}</span>
                  {q.overdue > 0 && <Pill tone="late">{copy.overdueNote.replace("{n}", q.overdue)}</Pill>}
                  <i className="icon-chevron-right text-12" aria-hidden="true"></i>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-adm-risk-h">
          <h2 className="rt-acc__h2" id="rt-adm-risk-h">{copy.atRisk}</h2>
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
            <p className="rt-acc__empty">{copy.atRiskNone}</p>
          )}
          {soon.length > 0 && <Link href="/admin/sessions?tab=week" className="fb-textlink rt-adm-mt">{soon.length > 5 ? `All ${soon.length} sessions` : "Open sessions"}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>}
        </section>
      </div>

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-adm-latest-h">
        <div className="rt-acc__cardhead rt-adm-cardhead">
          <h2 className="rt-acc__h2" id="rt-adm-latest-h">{copy.recent}</h2>
          <Link href="/admin/orders" className="fb-textlink">{copy.allOrders}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
        </div>
        <table className="rt-biz__table rt-adm-table">
          <thead>
            <tr><th scope="col">{A.orders.columns.ref}</th><th scope="col">{A.orders.columns.buyer}</th><th scope="col">{A.orders.columns.course}</th><th scope="col">{A.orders.columns.total}</th><th scope="col">{A.orders.columns.state}</th></tr>
          </thead>
          <tbody>
            {latest.map((o) => (
              <tr key={o.ref}>
                <td data-label={A.orders.columns.ref}><Link href={`/admin/orders/${o.ref}`} className="rt-adm-strong">{o.ref}</Link></td>
                <td data-label={A.orders.columns.buyer}>{o.buyer.name}{o.buyer.company && <small>{o.buyer.company}</small>}</td>
                <td data-label={A.orders.columns.course}>{o.lines[0].title}<small>{formatDate(o.lines[0].date)}</small></td>
                <td data-label={A.orders.columns.total}>{formatPrice(o.total)}</td>
                <td data-label={A.orders.columns.state}><Pill tone={MONEY_TONE[o.lines[0].money]}>{A.orders.money[o.lines[0].money]}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
