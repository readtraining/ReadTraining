"use client";

import React from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { DAY, customerName, useProvider } from "@/lib/providerWorkspace";
import { COURSE_TONE, Loading, ORDER_TONE, Pill, formatWhen } from "./providerParts";
import { Delta, Sparkline, money } from "./charts";
import { Seats, dayRange } from "./ProviderCohorts";

// Our dashboard (Hurak has none; everything on it opens the Hurak-style page it comes from). First what needs the provider today
// (refund requests, disputes, unpaid orders, reviews and questions to answer, new leads, cohorts with no tutor, courses sent back),
// then the last 30 days against the 30 before (revenue, enrolments, orders, rating), then the next cohorts, the latest orders and
// the courses by status.
const greet = (h) => (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");

export default function ProviderDashboard() {
  const data = useProvider();
  if (!data) return <Loading stats rows={3} />;

  const now = Date.now();
  const from = now - 30 * DAY;
  const prev = from - 30 * DAY;
  const sold = data.orders.filter((o) => o.money.gross > 0);
  const places = (o) => o.lines.reduce((n, l) => n + l.qty, 0);
  const sum = (a, b, f) => sold.filter((o) => o.at >= a && o.at < b).reduce((t, o) => t + f(o), 0);
  const count = (a, b) => sold.filter((o) => o.at >= a && o.at < b).length;
  const rating = (a, b) => {
    const r = data.reviews.filter((x) => x.at >= a && x.at < b);
    return r.length ? r.reduce((t, x) => t + x.rating, 0) / r.length : 0;
  };
  const weeks = Array.from({ length: 8 }, (_, i) => [now - (8 - i) * 7 * DAY, now - (7 - i) * 7 * DAY]);

  const refunds = data.refunds.filter((r) => r.status === "open");
  const disputes = data.orders.filter((o) => o.status === "dispute");
  const unpaid = data.orders.filter((o) => o.status === "incomplete");
  const upcoming = data.cohorts.filter((k) => k.status === "upcoming" && !k.cancelled).sort((a, b) => a.first.localeCompare(b.first));
  const noTutor = upcoming.filter((k) => !k.tutorId);
  const sentBack = data.courses.filter((c) => c.status === "changes");
  const todo = [
    ...refunds.map((r) => ({ key: r.id, tone: "warn", text: `Refund request: ${money(r.amount)} on order ${r.orderRef}`, href: `/provider/orders/${r.orderRef}`, cta: "Reply" })),
    ...disputes.map((o) => ({ key: o.ref, tone: "late", text: `Order ${o.ref} is in dispute. Send your evidence within 7 days.`, href: `/provider/orders/${o.ref}`, cta: "Send evidence" })),
    ...(unpaid.length ? [{ key: "unpaid", tone: "info", text: `${unpaid.length} ${unpaid.length === 1 ? "order is" : "orders are"} waiting for payment`, href: "/provider/orders?status=incomplete", cta: "View" }] : []),
    ...(data.counts.reviews ? [{ key: "reviews", tone: "info", text: `${data.counts.reviews} ${data.counts.reviews === 1 ? "review needs" : "reviews need"} a reply`, href: "/provider/performance?tab=reviews", cta: "Reply" }] : []),
    ...(data.counts.questions ? [{ key: "qa", tone: "info", text: `${data.counts.questions} learner ${data.counts.questions === 1 ? "question" : "questions"} to answer`, href: "/provider/settings?tab=qa", cta: "Answer" }] : []),
    ...(data.counts.leads ? [{ key: "leads", tone: "info", text: `${data.counts.leads} new ${data.counts.leads === 1 ? "lead" : "leads"}`, href: "/provider/performance?tab=leads", cta: "View" }] : []),
    ...noTutor.slice(0, 3).map((k) => ({ key: k.id, tone: "muted", text: `No tutor yet for ${k.course?.title}, ${dayRange(k.first, k.last)}`, href: `/provider/cohorts/${k.id}`, cta: "Assign" })),
    ...sentBack.map((c) => ({ key: c.id, tone: "late", text: `Changes requested on ${c.title || "a course"}`, href: `/provider/courses/${c.id}`, cta: "Edit" })),
  ];

  const kpis = [
    { label: "Revenue", value: money(sum(from, now + 1, (o) => o.money.gross)), now: sum(from, now + 1, (o) => o.money.gross), before: sum(prev, from, (o) => o.money.gross), spark: weeks.map(([a, b]) => sum(a, b, (o) => o.money.gross)), href: "/provider/performance" },
    { label: "Enrolments", value: String(sum(from, now + 1, places)), now: sum(from, now + 1, places), before: sum(prev, from, places), spark: weeks.map(([a, b]) => sum(a, b, places)), href: "/provider/performance" },
    { label: "Orders", value: String(count(from, now + 1)), now: count(from, now + 1), before: count(prev, from), spark: weeks.map(([a, b]) => count(a, b)), href: "/provider/orders" },
    { label: "Average rating", value: rating(0, now + 1) ? rating(0, now + 1).toFixed(1) : "—", now: rating(from, now + 1), before: rating(prev, from), spark: weeks.map(([a, b]) => rating(a, b)), href: "/provider/performance?tab=reviews" },
  ];
  const recent = [...data.orders].sort((a, b) => b.at - a.at).slice(0, 5);
  const statuses = Object.keys(pw.courseStatuses).map((k) => ({ k, n: data.courses.filter((c) => c.status === k).length }));
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/London" }).format(now));

  return (
    <div className="rt-acc__stack rt-dash">
      <section className="rt-dash__hello" aria-labelledby="rt-dash-hi">
        <div>
          <h2 className="rt-dash__hi" id="rt-dash-hi">{greet(hour)}, {data.me.name.split(" ")[0]}</h2>
          <p className="rt-dash__sub">{todo.length ? `${todo.length} ${todo.length === 1 ? "thing needs" : "things need"} you today.` : "You're all caught up."} {upcoming.length ? `Next cohort: ${upcoming[0].course?.title}, ${dayRange(upcoming[0].first, upcoming[0].last)}.` : ""}</p>
        </div>
        <div className="rt-dash__quick">
          <Link href="/provider/orders/new" className="button -sm -outline-purple-1 text-purple-1">Create order</Link>
          <Link href="/provider/cohorts?new=1" className="button -sm -outline-purple-1 text-purple-1">Create cohort</Link>
        </div>
      </section>

      <div className="rt-dash__grid">
        <section className="rt-acc__card rt-dash__todo" aria-labelledby="rt-dash-todo">
          <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-todo">Needs your attention</h2>{todo.length > 0 && <span className="rt-dash__n">{todo.length}</span>}</div>
          {todo.length ? (
            <ul className="rt-dash__list">
              {todo.slice(0, 7).map((t) => (
                <li key={t.key}>
                  <span className={`rt-dash__dot -${t.tone}`} aria-hidden="true"></span>
                  <span className="rt-dash__text">{t.text}</span>
                  <Link href={t.href} className="rt-dash__go">{t.cta}<span className="rt-sr">: {t.text}</span><i className="icon-arrow-right text-10" aria-hidden="true"></i></Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rt-dash__clear"><i className="icon-check text-16" aria-hidden="true"></i><p>Nothing waiting. New refund requests, reviews and questions will show here.</p></div>
          )}
        </section>

        <section className="rt-acc__card rt-dash__courses" aria-labelledby="rt-dash-courses">
          <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-courses">Your courses</h2><Link href="/provider/courses" className="rt-cd__link">All courses</Link></div>
          <ul className="rt-dash__status">
            {statuses.map(({ k, n }) => (
              <li key={k}>
                <Link href={`/provider/courses?status=${k}`}><Pill tone={COURSE_TONE[k]}>{pw.courseStatuses[k]}</Pill><b>{n}</b></Link>
              </li>
            ))}
          </ul>
          <Link href="/provider/courses/new" className="button -sm -purple-1 text-white rt-btn-block">New course</Link>
        </section>
      </div>

      <section aria-labelledby="rt-dash-30">
        <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-30">Last 30 days</h2><Link href="/provider/performance" className="rt-cd__link">Performance</Link></div>
        <ul className="rt-dash__kpis">
          {kpis.map((x) => (
            <li key={x.label}>
              <Link href={x.href} className="rt-dash__kpi">
                <span className="rt-dash__kpitop"><span>{x.label}</span><Delta now={x.now} before={x.before} label="vs the 30 days before" /></span>
                <strong>{x.value}</strong>
                <Sparkline values={x.spark} label={`${x.label}, last 8 weeks`} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="rt-dash__grid -even">
        <section className="rt-acc__card" aria-labelledby="rt-dash-next">
          <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-next">Coming up</h2><Link href="/provider/calendar" className="rt-cd__link">Calendar</Link></div>
          {upcoming.length ? (
            <ul className="rt-dash__cohorts">
              {upcoming.slice(0, 5).map((k) => (
                <li key={k.id}>
                  <span className={`rt-dash__date -c-${k.colour || "purple"}`} aria-hidden="true"><small>{new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${k.first}T00:00:00Z`))}</small><b>{Number(k.first.slice(8))}</b></span>
                  <span className="rt-dash__cmeta">
                    <Link href={`/provider/cohorts/${k.id}`} className="rt-adm-strong">{k.course?.title}</Link>
                    <small>{k.venue ? k.venue.name : "Online"} · {k.tutor ? k.tutor.name : "No tutor yet"}</small>
                  </span>
                  <Seats booked={k.booked} max={k.max} />
                </li>
              ))}
            </ul>
          ) : <p className="rt-acc__note">No cohorts coming up. <Link href="/provider/cohorts?new=1">Create one</Link>.</p>}
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-dash-orders">
          <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-orders">Latest orders</h2><Link href="/provider/orders" className="rt-cd__link">All orders</Link></div>
          <ul className="rt-dash__orders">
            {recent.map((o) => (
              <li key={o.ref}>
                <span className="rt-dash__avatar" aria-hidden="true">{`${o.customer.first[0] || ""}${o.customer.last[0] || ""}`.toUpperCase()}</span>
                <span className="rt-dash__cmeta">
                  <Link href={`/provider/orders/${o.ref}`} className="rt-adm-strong">{customerName(o.customer)}</Link>
                  <small>{o.ref} · {formatWhen(o.at)}</small>
                </span>
                <span className="rt-dash__amount"><b>{money(o.total)}</b><Pill tone={ORDER_TONE[o.status]}>{pw.orderStatuses[o.status]}</Pill></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
