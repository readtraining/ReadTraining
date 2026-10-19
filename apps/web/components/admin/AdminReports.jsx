"use client";

import React, { useState } from "react";
import { EmptyState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { useAdmin } from "@/lib/admin";
import { modeLabel } from "@/lib/courseModes";
import { formatPrice } from "@/lib/format";
import { api } from "@/lib/trpc/react";
import { Said, Stats, TableSkeleton, Tabs } from "./adminParts";

const copy = A.reports;
const DAY = 86400000;
const RANGES = Object.keys(copy.ranges).map(Number);
const GROUPS = Object.keys(copy.groups);
const round = (n) => Math.round(n * 100) / 100;
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

// Reports (Part B, B3): sales over a date range, broken down by provider, category, location or delivery method, with the weekly
// trend and a CSV download. DEMO: worked out from the demo orders (lib/admin.js) until bookings are real; the commission uses the
// real default rate (API admin.commission.get) on each booking's net amount after the card fee, as payouts will.
export default function AdminReports() {
  const data = useAdmin();
  const rate = api.admin.commission.get.useQuery();
  const [range, setRange] = useState(30);
  const [by, setBy] = useState("provider");
  const [said, setSaid] = useState("");
  if (!data || rate.isLoading) return <TableSkeleton rows={6} />;

  const { now, orders, catalogue, fees } = data;
  const share = (rate.data?.defaultBps ?? 3000) / 10000;
  const commissionOf = (amount) => round(amount * (1 - fees.card / 100) * share);
  const from = now - range * DAY;
  // one row per booked line in the range (cancelled orders don't count as sales)
  const lines = orders
    .filter((o) => o.booked >= from && o.state !== "cancelled")
    .flatMap((o) => o.lines.map((l) => ({ booked: o.booked, ref: o.ref, amount: round(l.unit * l.qty), line: l })));
  const keyOf = {
    provider: (x) => x.line.provider,
    category: (x) => catalogue.find((c) => c.id === x.line.courseId)?.category ?? "Other",
    city: (x) => x.line.city,
    method: (x) => modeLabel(x.line.mode) ?? x.line.mode,
  }[by];
  const sales = round(lines.reduce((s, x) => s + x.amount, 0));
  const orderCount = new Set(lines.map((x) => x.ref)).size;
  const groups = Object.values(
    lines.reduce((acc, x) => {
      const k = keyOf(x);
      const g = (acc[k] ||= { name: k, orders: new Set(), sales: 0 });
      g.orders.add(x.ref);
      g.sales = round(g.sales + x.amount);
      return acc;
    }, {}),
  )
    .map((g) => ({ ...g, orders: g.orders.size, commission: commissionOf(g.sales) }))
    .sort((a, b) => b.sales - a.sales);
  // the trend: days for a week, weeks otherwise (newest last)
  const step = range === 7 ? DAY : 7 * DAY;
  const count = Math.min(12, Math.ceil(range / (step / DAY)));
  const buckets = Array.from({ length: count }, (_, i) => {
    const end = now - (count - 1 - i) * step;
    const start = end - step;
    return { label: dayFmt.format(new Date(range === 7 ? end : start + DAY)), sales: round(lines.filter((x) => x.booked > start && x.booked <= end).reduce((s, x) => s + x.amount, 0)) };
  });
  const top = Math.max(...buckets.map((b) => b.sales), 1);

  const download = () => {
    const rows = [[copy.groups[by], copy.columns.orders, copy.columns.sales, copy.columns.commission], ...groups.map((g) => [g.name, g.orders, g.sales.toFixed(2), g.commission.toFixed(2)])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `readtraining-sales-by-${by}-last-${range}-days.csv` });
    a.click();
    URL.revokeObjectURL(url);
    setSaid(copy.exported);
  };

  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <div className="rt-adm-toolbar">
        <Tabs tabs={RANGES.map((key) => ({ key, label: copy.ranges[key] }))} value={range} onChange={setRange} label={copy.range} />
        <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={download} disabled={!groups.length}>{copy.export}</button>
      </div>
      <Stats
        label={copy.ranges[range]}
        items={[
          { icon: "icon-save-money", value: formatPrice(sales), label: copy.totals.sales },
          { icon: "icon-bar-chart-2", value: formatPrice(commissionOf(sales)), label: copy.totals.commission },
          { icon: "icon-basket", value: String(orderCount), label: copy.totals.orders },
          { icon: "icon-coupon", value: formatPrice(orderCount ? round(sales / orderCount) : 0), label: copy.totals.average },
        ]}
      />

      <section className="rt-acc__card" aria-labelledby="rt-adm-trend-h">
        <h2 className="rt-acc__h2" id="rt-adm-trend-h">{range === 7 ? "Sales by day" : copy.chart}</h2>
        <ol className="rt-adm-bars">
          {buckets.map((b) => (
            <li key={b.label}>
              <span className="rt-adm-bars__val">{b.sales ? formatPrice(b.sales).replace(/\.\d\d$/, "") : ""}</span>
              <span className="rt-adm-bars__bar" style={{ height: `${Math.max(2, (b.sales / top) * 100)}%` }} aria-hidden="true"></span>
              <span className="rt-adm-bars__label">{b.label}<span className="rt-sr">: {formatPrice(b.sales)}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-adm-break-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-adm-break-h">{copy.by}</h2>
          <Tabs tabs={GROUPS.map((key) => ({ key, label: copy.groups[key] }))} value={by} onChange={setBy} label={copy.by} />
        </div>
        {groups.length ? (
          <table className="rt-biz__table rt-adm-table">
            <thead><tr><th scope="col">{copy.groups[by]}</th><th scope="col">{copy.columns.orders}</th><th scope="col">{copy.columns.sales}</th><th scope="col">{copy.columns.commission}</th><th scope="col">{copy.columns.share}</th></tr></thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.name}>
                  <td data-label={copy.groups[by]}><span className="rt-adm-strong">{g.name}</span></td>
                  <td data-label={copy.columns.orders}>{g.orders}</td>
                  <td data-label={copy.columns.sales}>{formatPrice(g.sales)}</td>
                  <td data-label={copy.columns.commission}>{formatPrice(g.commission)}</td>
                  <td data-label={copy.columns.share}>
                    <span className="rt-adm-share"><span style={{ width: `${(g.sales / sales) * 100}%` }} aria-hidden="true"></span></span>
                    <small>{Math.round((g.sales / sales) * 100)}%</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState inCard title={copy.none} />
        )}
        <p className="rt-acc__note rt-adm-mt">{copy.commissionNote}</p>
      </section>
    </div>
  );
}
