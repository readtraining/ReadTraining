"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { customerName, useProvider } from "@/lib/providerWorkspace";
import { formatPrice } from "@/lib/format";
import { Empty, Loading, ORDER_TONE, Pill, Search, Tabs, ToolSelect, getQuery, setQuery } from "./providerParts";
import { RangeControl, formatOrderDay, inRange, rangeBounds } from "./moneyParts";

const STATUS_KEYS = ["all", ...Object.keys(pw.orderStatuses)];
const CHANNEL_OPTIONS = [{ value: "", label: "All channels" }, ...Object.entries(pw.channels).map(([value, label]) => ({ value, label }))];

// Every order, newest first: a search by reference, customer name or email; status tabs with counts; the channel (ReadTraining,
// your website, added by you) and a date range. All kept in the address so a view can be shared. Statuses with no orders are
// left out of the tabs so the row stays short.
export default function ProviderOrders() {
  const data = useProvider();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("");
  const [range, setRange] = useState({ range: "all", from: "", to: "" });
  useEffect(() => {
    setQ(getQuery("q") || "");
    const s = getQuery("status");
    if (STATUS_KEYS.includes(s)) setStatus(s);
    const c = getQuery("channel");
    if (pw.channels[c]) setChannel(c);
    setRange({ range: getQuery("range") || "all", from: getQuery("from") || "", to: getQuery("to") || "" });
  }, []);
  if (!data) return <Loading rows={2} />;

  if (!data.orders.length) {
    return <Empty title="No orders yet" text="Bookings from ReadTraining, your website and the orders you add yourself appear here." action={{ href: "/provider/orders/new", label: "New order" }} />;
  }

  const bounds = rangeBounds(range.range, range.from, range.to);
  const needle = q.trim().toLowerCase();
  const base = data.orders.filter((o) => (!channel || o.channel === channel) && inRange(o.at, bounds) && (!needle || `${o.ref} ${customerName(o.customer)} ${o.customer.email} ${o.customer.company || ""}`.toLowerCase().includes(needle)));
  const list = base.filter((o) => status === "all" || o.status === status).sort((a, b) => b.at - a.at);
  const tabs = STATUS_KEYS.map((k) => ({ key: k, label: k === "all" ? "All" : pw.orderStatuses[k], count: base.filter((o) => k === "all" || o.status === k).length })).filter((t) => t.key === "all" || t.count > 0 || t.key === status);
  const setRangeQ = (r) => {
    setRange(r);
    setQuery("range", r.range === "all" ? "" : r.range);
    setQuery("from", r.range === "custom" ? r.from : "");
    setQuery("to", r.range === "custom" ? r.to : "");
  };

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Search value={q} onChange={(v) => { setQ(v); setQuery("q", v.trim()); }} label="Search by order number, name or email" />
        <div className="rt-adm-toolbar__end">
          <ToolSelect id="rt-pws-ord-channel" label="Channel" value={channel} onChange={(v) => { setChannel(v); setQuery("channel", v); }} options={CHANNEL_OPTIONS} />
          <RangeControl id="rt-pws-ord-range" {...range} value={range.range} onChange={setRangeQ} />
        </div>
      </div>
      <Tabs tabs={tabs} value={status} onChange={(k) => { setStatus(k); setQuery("status", k === "all" ? "" : k); }} label="Show orders" />
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "order" : "orders"}`}</p>
      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead>
              <tr><th scope="col">Order</th><th scope="col">Date</th><th scope="col">Customer</th><th scope="col">Course</th><th scope="col">Total</th><th scope="col">Channel</th><th scope="col">Status</th></tr>
            </thead>
            <tbody>
              {list.map((o) => {
                const l = o.lines[0];
                const places = o.lines.reduce((t, x) => t + x.qty, 0);
                return (
                  <tr key={o.ref}>
                    <td data-label="Order"><Link href={`/provider/orders/${o.ref}`} className="rt-adm-strong">{o.ref}</Link></td>
                    <td data-label="Date">{formatOrderDay(o.at)}</td>
                    <td data-label="Customer">{customerName(o.customer)}<small>{o.customer.company || o.customer.email}</small></td>
                    <td data-label="Course">{data.byId.course[l.courseId]?.title || "Course removed"}<small>{o.lines.length > 1 ? `and ${o.lines.length - 1} more · ` : ""}{places} {places === 1 ? "place" : "places"}</small></td>
                    <td data-label="Total" className="rt-pws-money__num">{formatPrice(o.total)}</td>
                    <td data-label="Channel">{pw.channels[o.channel]}</td>
                    <td data-label="Status"><Pill tone={ORDER_TONE[o.status]}>{pw.orderStatuses[o.status]}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rt-acc__card rt-acc__empty">No orders match. Try another search or date range.</p>
      )}
    </div>
  );
}
