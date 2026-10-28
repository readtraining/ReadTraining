"use client";

import React from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { DAY, customerName, useProvider } from "@/lib/providerWorkspace";
import { useMe } from "@/lib/useMe";
import { useProviderAccess } from "@/lib/providerAccess";
import { SHOW_DEMO } from "@/lib/demo";
import { COURSE_TONE, Loading, ORDER_TONE, Pill, formatWhen } from "./providerParts";
import { Delta, Sparkline, money } from "./charts";
import { Seats, dayRange, useSchedule } from "./ProviderCohorts";
import ProviderChecklist from "./ProviderChecklist";

// Our dashboard (Hurak has none; everything on it opens the Hurak-style page it comes from). Under the greeting, the getting-set-up
// checklist (ProviderChecklist) until every step is done. Then what needs the provider today
// (refund requests, disputes, unpaid orders, reviews and questions to answer, new leads, cohorts with no tutor, courses sent back),
// then the last 30 days against the 30 before (revenue, enrolments, orders, rating), then the next cohorts, the latest orders and
// the courses by status. Courses and cohorts come from the API; orders, refunds, reviews and leads are still DEMO records.
// orders, refunds, reviews and leads are still sample records (lib/providerWorkspace.js): their numbers carry the demo label, as the
// account and admin demo pages do (only where demo data is shown; the live site shows none)
const demoTag = SHOW_DEMO && <span className="rt-demo-tag" title="Sample orders and reviews for now. Real ones show here once booking goes live.">Demo data<span className="rt-sr">: sample orders and reviews for now</span></span>;

const greet = (h) => (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");

export default function ProviderDashboard() {
  const { person, data: meData } = useMe();
  const data = useProvider();
  const schedule = useSchedule("upcoming");
  const access = useProviderAccess();
  if (!data || !schedule.cohorts.data || !schedule.courses.data) return <Loading stats rows={3} />;
  const courses = schedule.courses.data;
  // the team list is for roles that see every date; a tutor sees only the dates they teach, so those are theirs
  const tutorName = (id) => (schedule.may.team ? schedule.tutors.data?.find((t) => t.userId === id)?.name : id && "You");

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
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = schedule.cohorts.data.filter((k) => !k.cancelledAt && k.startsOn > today);
  const noTutor = upcoming.filter((k) => !k.tutorUserId);
  const sentBack = courses.filter((c) => c.status === "changes");
  const todo = [
    ...refunds.map((r) => ({ key: r.id, tone: "warn", text: `Refund request: ${money(r.amount)} on order ${r.orderRef}`, href: `/provider/orders/${r.orderRef}`, cta: "Reply" })),
    ...disputes.map((o) => ({ key: o.ref, tone: "late", text: `Order ${o.ref} is in dispute. Send your evidence within 7 days.`, href: `/provider/orders/${o.ref}`, cta: "Send evidence" })),
    ...(unpaid.length ? [{ key: "unpaid", tone: "info", text: `${unpaid.length} ${unpaid.length === 1 ? "order is" : "orders are"} waiting for payment`, href: "/provider/orders?status=incomplete", cta: "View" }] : []),
    ...(data.counts.reviews ? [{ key: "reviews", tone: "info", text: `${data.counts.reviews} ${data.counts.reviews === 1 ? "review needs" : "reviews need"} a reply`, href: "/provider/performance?tab=reviews", cta: "Reply" }] : []),
    ...(data.counts.questions ? [{ key: "qa", tone: "info", text: `${data.counts.questions} learner ${data.counts.questions === 1 ? "question" : "questions"} to answer`, href: "/provider/settings?tab=qa", cta: "Answer" }] : []),
    ...(data.counts.leads ? [{ key: "leads", tone: "info", text: `${data.counts.leads} new ${data.counts.leads === 1 ? "lead" : "leads"}`, href: "/provider/performance?tab=leads", cta: "View" }] : []),
    ...noTutor.slice(0, 3).map((k) => ({ key: k.id, tone: "muted", text: `No tutor yet for ${k.courseTitle}, ${dayRange(k.startsOn, k.endsOn)}`, href: `/provider/cohorts/${k.id}`, cta: "Assign" })),
    ...sentBack.map((c) => ({ key: c.id, tone: "late", text: `Changes requested on ${c.title}`, href: `/provider/courses/${c.id}`, cta: "Edit" })),
  ];

  const kpis = [
    { label: "Revenue", value: money(sum(from, now + 1, (o) => o.money.gross)), now: sum(from, now + 1, (o) => o.money.gross), before: sum(prev, from, (o) => o.money.gross), spark: weeks.map(([a, b]) => sum(a, b, (o) => o.money.gross)), href: "/provider/performance" },
    { label: "Enrolments", value: String(sum(from, now + 1, places)), now: sum(from, now + 1, places), before: sum(prev, from, places), spark: weeks.map(([a, b]) => sum(a, b, places)), href: "/provider/performance" },
    { label: "Orders", value: String(count(from, now + 1)), now: count(from, now + 1), before: count(prev, from), spark: weeks.map(([a, b]) => count(a, b)), href: "/provider/orders" },
    { label: "Average rating", value: rating(0, now + 1) ? rating(0, now + 1).toFixed(1) : "—", now: rating(from, now + 1), before: rating(prev, from), spark: weeks.map(([a, b]) => rating(a, b)), href: "/provider/performance?tab=reviews" },
  ];
  const recent = [...data.orders].sort((a, b) => b.at - a.at).slice(0, 5);
  const statuses = Object.keys(pw.courseStatuses).map((k) => ({ k, n: courses.filter((c) => c.status === k).length }));
  // the visitor's own clock (a provider in Lahore at 2:51pm sees "Good afternoon"), and the signed-in person's own first name
  const hour = new Date(now).getHours();
  const firstName = meData?.profile?.firstName || person?.name?.split(" ")[0] || "";

  return (
    <div className="rt-acc__stack rt-dash">
      <section className="rt-dash__hello" aria-labelledby="rt-dash-hi">
        <div>
          <h2 className="rt-dash__hi" id="rt-dash-hi">{greet(hour)}{firstName ? `, ${firstName}` : ""}</h2>
          <p className="rt-dash__sub">{todo.length ? `${todo.length} ${todo.length === 1 ? "thing needs" : "things need"} you today.` : "You're all caught up."} {upcoming.length ? `Next cohort: ${upcoming[0].courseTitle}, ${dayRange(upcoming[0].startsOn, upcoming[0].endsOn)}.` : ""}</p>
        </div>
        <div className="rt-dash__quick">
          {access.can("provider.orders.create") && <Link href="/provider/orders/new" className="button -sm -outline-purple-1 text-purple-1">Create order</Link>}
          {access.can("provider.cohorts.edit") && <Link href="/provider/cohorts?new=1" className="button -sm -outline-purple-1 text-purple-1">Create cohort</Link>}
        </div>
      </section>

      <ProviderChecklist />

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

        {schedule.may.courses && (
          <section className="rt-acc__card rt-dash__courses" aria-labelledby="rt-dash-courses">
            <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-courses">Your courses</h2><Link href="/provider/courses" className="rt-cd__link">All courses</Link></div>
            <ul className="rt-dash__status">
              {statuses.map(({ k, n }) => (
                <li key={k}>
                  <Link href={`/provider/courses?status=${k}`}><Pill tone={COURSE_TONE[k]}>{pw.courseStatuses[k]}</Pill><b>{n}</b></Link>
                </li>
              ))}
            </ul>
            {access.can("provider.courses.edit") && <Link href="/provider/courses/new" className="button -sm -purple-1 text-white rt-btn-block">New course</Link>}
          </section>
        )}
      </div>

      <section aria-labelledby="rt-dash-30">
        <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-30">Last 30 days {demoTag}</h2><Link href="/provider/performance" className="rt-cd__link">Performance</Link></div>
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
        {schedule.may.dates && <section className="rt-acc__card" aria-labelledby="rt-dash-next">
          <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-next">Coming up</h2><Link href="/provider/calendar" className="rt-cd__link">Calendar</Link></div>
          {upcoming.length ? (
            <ul className="rt-dash__cohorts">
              {upcoming.slice(0, 5).map((k) => (
                <li key={k.id}>
                  <span className={`rt-dash__date -c-${k.method === "live-online" ? "blue" : "purple"}`} aria-hidden="true"><small>{new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${k.startsOn}T00:00:00Z`))}</small><b>{Number(k.startsOn.slice(8))}</b></span>
                  <span className="rt-dash__cmeta">
                    <Link href={`/provider/cohorts/${k.id}`} className="rt-adm-strong">{k.courseTitle}</Link>
                    <small>{k.venue ? k.venue.name : "Online"} · {tutorName(k.tutorUserId) || "No tutor yet"}</small>
                  </span>
                  <Seats booked={0} max={k.capacity} />
                </li>
              ))}
            </ul>
          ) : <p className="rt-acc__note">No cohorts coming up.{access.can("provider.cohorts.edit") && <> <Link href="/provider/cohorts?new=1">Create one</Link>.</>}</p>}
        </section>}

        <section className="rt-acc__card" aria-labelledby="rt-dash-orders">
          <div className="rt-dash__head"><h2 className="rt-dash__title" id="rt-dash-orders">Latest orders {demoTag}</h2><Link href="/provider/orders" className="rt-cd__link">All orders</Link></div>
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
