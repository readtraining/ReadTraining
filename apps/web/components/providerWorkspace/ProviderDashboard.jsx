"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { DAY, isoDay, timeRange, useProvider } from "@/lib/providerWorkspace";
import { formatPrice } from "@/lib/format";
import Toast from "@/components/courses/Toast";
import { Loading, Stats, Tabs, ToolSelect, getQuery, setQuery, shortDay } from "./providerParts";
import { RANGE_OPTIONS, Stars, buckets, isRange, rangeStart } from "./insightParts";

// The orders chart's views: what each one counts and how its value is worked out
const CHART = [
  { key: "revenue", label: "Revenue", match: (o) => o.money.gross > 0, value: (o) => o.money.gross, money: true },
  { key: "incomplete", label: "Incomplete", match: (o) => o.status === "incomplete", value: (o) => o.total, money: true },
  { key: "cancelled", label: "Cancelled", match: (o) => o.status === "cancelled", value: (o) => o.total, money: true },
  { key: "refunded", label: "Refunded", match: (o) => o.refunded > 0, value: (o) => o.refunded, money: true },
  { key: "disputes", label: "Disputes", match: (o) => o.status === "dispute" || o.status === "lost", value: (o) => o.total, money: true },
];
const NEEDS = {
  refunds: { label: "Refund requests to answer", href: "/provider/refunds" },
  reviews: { label: "Reviews to reply to", href: "/provider/performance?tab=reviews" },
  questions: { label: "Learner questions to answer", href: "/provider/settings?tab=qa" },
  leads: { label: "New enquiries", href: "/provider/performance?tab=leads" },
  disputes: { label: "Card disputes open", href: "/provider/orders?status=dispute" },
  incomplete: { label: "Orders waiting for payment", href: "/provider/orders?status=incomplete" },
};

// The provider's home: this month in four numbers, the set-up checklist until it is done, the orders chart, what needs them
// today, the next sessions, the latest reviews and their public profile.
export default function ProviderDashboard() {
  const data = useProvider();
  const [view, setView] = useState("revenue");
  const [range, setRange] = useState("30");
  const [toast, setToast] = useState(null);
  const done = useCallback(() => setToast(null), []);
  useEffect(() => {
    const v = getQuery("chart");
    if (CHART.some((c) => c.key === v)) setView(v);
    const r = getQuery("range");
    if (isRange(r)) setRange(r);
  }, []);
  if (!data) return <Loading stats rows={3} />;

  const now = Date.now();
  const monthStart = rangeStart("month", now);
  const orderAt = Object.fromEntries(data.orders.map((o) => [o.ref, o.at]));
  const rated = data.reviews.filter((r) => r.rating);
  const avg = rated.length ? rated.reduce((t, r) => t + r.rating, 0) / rated.length : 0;
  const stats = [
    { icon: "icon-save-money", value: formatPrice(data.orders.filter((o) => o.at >= monthStart).reduce((t, o) => t + o.money.gross, 0)), label: "Revenue this month" },
    { icon: "icon-person-2", value: String(data.enrolments.filter((e) => orderAt[e.orderRef] >= monthStart).length), label: "Enrolments this month" },
    { icon: "icon-calendar", value: String(data.cohorts.filter((k) => k.status === "upcoming").length), label: "Upcoming cohorts" },
    { icon: "icon-star", value: avg ? avg.toFixed(1) : "No reviews", label: avg ? `Average rating from ${rated.length} reviews` : "Average rating" },
  ];

  // checklist
  const steps = pw.checklist.map((s) => ({ ...s, done: data.checklist[s.key] }));
  const doneCount = steps.filter((s) => s.done).length;

  // chart
  const earliest = Math.min(...data.orders.map((o) => o.at), now);
  const start = rangeStart(range, now, earliest);
  const inRange = data.orders.filter((o) => o.at >= start && o.at <= now);
  const tabs = CHART.map((c) => {
    const list = inRange.filter(c.match);
    return { key: c.key, label: c.label, count: list.length, total: list.reduce((t, o) => t + c.value(o), 0) };
  });
  const cur = CHART.find((c) => c.key === view);
  const curTab = tabs.find((t) => t.key === view);
  const bars = buckets(start, now).map((b) => {
    const list = inRange.filter((o) => o.at >= b.from && o.at < b.to && cur.match(o));
    return { ...b, n: list.length, value: list.reduce((t, o) => t + cur.value(o), 0) };
  });
  const peak = Math.max(...bars.map((b) => b.value), 0);
  const tick = Math.max(1, Math.ceil(bars.length / 6));

  // needs you
  const needs = {
    ...data.counts,
    disputes: data.orders.filter((o) => o.status === "dispute").length,
    incomplete: data.orders.filter((o) => o.status === "incomplete").length,
  };
  const needList = Object.keys(NEEDS).filter((k) => needs[k] > 0);

  // next sessions
  const today = data.today;
  const sessions = data.cohorts
    .filter((k) => !k.cancelled)
    .flatMap((k) => k.sessions.map((s, i) => ({ k, s, i })))
    .filter((x) => x.s.date >= today)
    .sort((a, b) => (a.s.date + a.s.from).localeCompare(b.s.date + b.s.from))
    .slice(0, 5);

  const reviews = [...data.reviews].sort((a, b) => b.at - a.at).slice(0, 3);
  const profilePath = `/providers/${data.org.slug}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${profilePath}`);
      setToast({ message: "Profile link copied" });
    } catch {
      setToast({ message: "Couldn't copy the link. Select it and copy it instead." });
    }
  };

  return (
    <div className="rt-acc__stack">
      <Stats items={stats} label="This month" />

      {!data.org.payout.connected && (
        <section className="rt-acc__card rt-pws-dash__banner" aria-labelledby="rt-pws-pay-h">
          <span className="rt-benefit__icon" aria-hidden="true"><i className="icon-save-money text-16"></i></span>
          <div>
            <h2 className="rt-acc__h2" id="rt-pws-pay-h">Add your bank details to get paid</h2>
            <p className="rt-acc__note">We pay what you earn from bookings on the {pw.fee.payoutDay}th of each month. Without a payout account, your earnings wait with us.</p>
          </div>
          <Link href="/provider/settings?tab=payouts" className="button -md -purple-1 text-white">Add bank details</Link>
        </section>
      )}

      {doneCount < steps.length && (
        <section className="rt-acc__card" aria-labelledby="rt-pws-check-h">
          <div className="rt-pws-dash__checkhead">
            <div>
              <h2 className="rt-acc__h2" id="rt-pws-check-h">Your checklist</h2>
              <p className="rt-acc__note">Four steps to start selling. {doneCount} of {steps.length} done.</p>
            </div>
            <span className="rt-adm-bar rt-pws-dash__progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label="Checklist progress">
              <span style={{ width: `${(doneCount / steps.length) * 100}%` }}></span>
            </span>
          </div>
          <ol className="rt-pws-dash__steps">
            {steps.map((s, i) => (
              <li key={s.key} className={s.done ? "is-done" : ""}>
                <span className="rt-pws-dash__stepn" aria-hidden="true">{s.done ? <i className="icon-check text-12"></i> : i + 1}</span>
                <div className="rt-pws-dash__steptext">
                  <b>{s.title}</b>
                  <small>{s.done ? "Done" : s.text}</small>
                </div>
                {!s.done && <Link href={s.href} className="button -sm -outline-purple-1 text-purple-1">{s.cta}</Link>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="rt-acc__card" aria-labelledby="rt-pws-chart-h">
        <div className="rt-pws-dash__charthead">
          <h2 className="rt-acc__h2" id="rt-pws-chart-h">Orders</h2>
          <ToolSelect id="rt-pws-range" label="Date range" value={range} onChange={(v) => { setRange(v); setQuery("range", v === "30" ? "" : v); }} options={RANGE_OPTIONS} />
        </div>
        <Tabs tabs={tabs.map((t) => ({ key: t.key, label: `${t.label} ${formatPrice(t.total)}`, count: t.count }))} value={view} onChange={(v) => { setView(v); setQuery("chart", v === "revenue" ? "" : v); }} label="Show orders by" />
        <p className="rt-sr" aria-live="polite">{`${cur.label}: ${formatPrice(curTab.total)} from ${curTab.count} ${curTab.count === 1 ? "order" : "orders"}`}</p>
        {curTab.count ? (
          <figure className="rt-pws-dash__chart">
            <div className="rt-pws-dash__bars" aria-hidden="true">
              {bars.map((b, i) => (
                <div key={b.from} className="rt-pws-dash__barcol" title={`${b.label}: ${formatPrice(b.value)} (${b.n})`}>
                  <span className="rt-pws-dash__bar" style={{ height: `${peak ? Math.max(b.value ? 4 : 0, (b.value / peak) * 100) : 0}%` }}></span>
                  <small className={i % tick === 0 ? "" : "is-hidden"}>{b.label}</small>
                </div>
              ))}
            </div>
            <figcaption className="rt-acc__note">{cur.label} by {now - start > 62 * DAY ? "month" : "day"}. Highest: {formatPrice(peak)}.</figcaption>
            <table className="rt-sr">
              <caption>{cur.label} by period</caption>
              <thead><tr><th scope="col">Period</th><th scope="col">Value</th><th scope="col">Orders</th></tr></thead>
              <tbody>{bars.filter((b) => b.n).map((b) => <tr key={b.from}><td>{b.label}</td><td>{formatPrice(b.value)}</td><td>{b.n}</td></tr>)}</tbody>
            </table>
          </figure>
        ) : (
          <p className="rt-acc__empty rt-pws-dash__nochart">No {cur.label.toLowerCase()} orders in this period.</p>
        )}
      </section>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-pws-needs-h">
          <h2 className="rt-acc__h2" id="rt-pws-needs-h">Needs you</h2>
          {needList.length ? (
            <ul className="rt-adm-queues">
              {needList.map((k) => (
                <li key={k}>
                  <Link href={NEEDS[k].href} className="rt-adm-queue">
                    <span className="rt-adm-queue__n">{needs[k]}</span>
                    <span className="rt-adm-queue__label">{NEEDS[k].label}</span>
                    <i className="icon-chevron-right text-12" aria-hidden="true"></i>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rt-acc__empty">Nothing needs you right now.</p>
          )}
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-pws-next-h">
          <h2 className="rt-acc__h2" id="rt-pws-next-h">Next sessions</h2>
          {sessions.length ? (
            <ul className="rt-adm-list">
              {sessions.map(({ k, s, i }) => (
                <li key={`${k.id}-${i}`}>
                  <div>
                    <Link href={`/provider/cohorts/${k.id}`} className="rt-adm-strong">{k.course?.title || "Course"}</Link>
                    <small>{shortDay(s.date)} · {timeRange(s)} · {k.venue ? k.venue.city : "Online"}{k.sessions.length > 1 ? ` · Day ${i + 1} of ${k.sessions.length}` : ""}</small>
                  </div>
                  <span className="rt-adm-muted">{k.booked} of {k.max} booked</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rt-acc__empty">No sessions coming up.</p>
          )}
          <Link href="/provider/calendar" className="fb-textlink rt-adm-mt">Open the calendar<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
        </section>
      </div>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-pws-rev-h">
          <h2 className="rt-acc__h2" id="rt-pws-rev-h">Latest reviews</h2>
          {reviews.length ? (
            <ul className="rt-adm-notes rt-pws-dash__reviews">
              {reviews.map((r) => (
                <li key={r.id}>
                  <div className="rt-pws-dash__revtop"><Stars rating={r.rating} /><span className="rt-adm-muted">{data.byId.course[r.courseId]?.title}</span></div>
                  {r.text ? <p>{r.text}</p> : <p className="rt-adm-muted">No comment, rating only.</p>}
                  <small>{r.name} · {shortDay(isoDay(r.at))}{r.reply ? " · Replied" : ""}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rt-acc__empty">Reviews have not been written yet.</p>
          )}
          <Link href="/provider/performance?tab=reviews" className="fb-textlink rt-adm-mt">All reviews<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-pws-prof-h">
          <h2 className="rt-acc__h2" id="rt-pws-prof-h">Your public profile</h2>
          <div className="rt-pws-dash__profile">
            <span className="rt-pws__orgmark" aria-hidden="true">{data.org.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
            <div>
              <b>{data.org.name}</b>
              <small>{data.org.headline || "Add a headline so learners know what you teach."}</small>
            </div>
          </div>
          <p className="rt-acc__note rt-pws-dash__url">{profilePath}</p>
          <p className="rt-acc__note">Your public page goes live with your first approved course.</p>
          <div className="rt-adm-cellrow">
            <Link href="/provider/settings?tab=profile" className="button -sm -outline-purple-1 text-purple-1">Edit profile</Link>
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={copyLink}>Copy profile link</button>
          </div>
        </section>
      </div>

      <Toast toast={toast} onDone={done} />
    </div>
  );
}
