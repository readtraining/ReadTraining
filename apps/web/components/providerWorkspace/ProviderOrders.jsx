"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { bookedBy, customerName, useProvider } from "@/lib/providerWorkspace";
import { formatPrice } from "@/lib/format";
import CataloguePagination from "@/components/courses/CataloguePagination";
import { Loading, ORDER_TONE, Pill, RowMenu, ToolSelect, getQuery, setQuery } from "./providerParts";
import { formatOrderDay } from "./moneyParts";
import { EmptyState } from "@/components/states/States";

const PER_PAGE = 10;
const FIELDS = [
  { key: "no", label: "Order no", placeholder: "eg. 24871" },
  { key: "first", label: "First name", placeholder: "First name" },
  { key: "last", label: "Last name", placeholder: "Last name" },
  { key: "email", label: "Email", placeholder: "Email" },
];
const CHANNELS = [{ value: "", label: "All sales channels" }, ...Object.entries(pw.channels).map(([value, label]) => ({ value, label }))];
const STATUSES = [{ value: "", label: "All statuses" }, ...Object.entries(pw.orderStatuses).map(([value, label]) => ({ value, label }))];

// Orders, as Hurak's: search by order number, first name, last name and email, filter by sales channel and status (all kept in
// the address), newest first, 10 a page. Columns: order no, customer name and email, sales channel, who booked it, status, amount,
// payment method, date, and the actions (view the order, its first cohort). "Create order" adds one by hand.
export default function ProviderOrders() {
  const data = useProvider();
  const [f, setF] = useState({ no: "", first: "", last: "", email: "" });
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    setF({ no: getQuery("no") || "", first: getQuery("first") || "", last: getQuery("last") || "", email: getQuery("email") || "" });
    const c = getQuery("channel");
    if (pw.channels[c]) setChannel(c);
    const s = getQuery("status");
    if (pw.orderStatuses[s]) setStatus(s);
  }, []);
  useEffect(() => setPage(1), [f, channel, status]);
  if (!data) return <Loading rows={2} />;

  if (!data.orders.length) {
    return <EmptyState title="No orders yet" text="Bookings from ReadTraining, your website and the orders you add yourself appear here." action={{ href: "/provider/orders/new", label: "Create order" }} />;
  }

  const has = (v, needle) => !needle.trim() || String(v || "").toLowerCase().includes(needle.trim().toLowerCase());
  const list = data.orders
    .filter((o) => has(o.ref, f.no) && has(o.customer.first, f.first) && has(o.customer.last, f.last) && has(o.customer.email, f.email))
    .filter((o) => (!channel || o.channel === channel) && (!status || o.status === status))
    .sort((a, b) => b.at - a.at);
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const at = Math.min(page, pages);
  const rows = list.slice((at - 1) * PER_PAGE, at * PER_PAGE);
  // the course on each order (the first, with how many more), and which orders have an open refund request
  const courseOf = (o) => data.byId.course[o.lines[0]?.courseId]?.title || "Course removed";
  const refundAsked = new Set(data.refunds.filter((r) => r.status === "open").map((r) => r.orderRef));
  const filtered = Boolean(Object.values(f).some((v) => v.trim()) || channel || status);
  const setField = (k, v) => { setF((x) => ({ ...x, [k]: v })); setQuery(k, v.trim()); };
  const clear = () => {
    setF({ no: "", first: "", last: "", email: "" });
    setChannel("");
    setStatus("");
    ["no", "first", "last", "email", "channel", "status"].forEach((k) => setQuery(k, ""));
  };

  return (
    <div className="rt-acc__stack">
      <div className="rt-acc__card rt-pws-ord__search" role="search" aria-label="Find orders">
        {FIELDS.map((x) => (
          <div className="rt-field" key={x.key}>
            <label htmlFor={`rt-ord-${x.key}`}>{x.label}</label>
            <input id={`rt-ord-${x.key}`} type={x.key === "email" ? "email" : "text"} inputMode={x.key === "no" ? "numeric" : undefined} value={f[x.key]} placeholder={x.placeholder} onChange={(e) => setField(x.key, e.target.value)} autoComplete="off" spellCheck={false} />
          </div>
        ))}
        <div className="rt-pws-ord__searchfoot">
          <ToolSelect id="rt-ord-channel" label="Sales channel" value={channel} onChange={(v) => { setChannel(v); setQuery("channel", v); }} options={CHANNELS} />
          <ToolSelect id="rt-ord-status" label="Status" value={status} onChange={(v) => { setStatus(v); setQuery("status", v); }} options={STATUSES} />
          {filtered && <button type="button" className="rt-cd__link" onClick={clear}>Clear filters</button>}
        </div>
      </div>

      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "order" : "orders"}`}</p>
      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table rt-pws-ord__table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">Course</th>
                <th scope="col">Channel</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="rt-sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const k = o.lines.map((l) => l.cohortId).find(Boolean);
                return (
                  <tr key={o.ref}>
                    <td data-label="Order"><Link href={`/provider/orders/${o.ref}`} className="rt-adm-strong">{o.ref}</Link><small>{formatOrderDay(o.at)}</small></td>
                    <td data-label="Customer">{customerName(o.customer)}<small>{o.customer.email}</small></td>
                    <td data-label="Course">{courseOf(o)}{o.lines.length > 1 && <small>+ {o.lines.length - 1} more</small>}</td>
                    <td data-label="Channel">{pw.channels[o.channel]}<small>{bookedBy(o)}</small></td>
                    <td data-label="Amount"><span className="rt-pws-money__num">{formatPrice(o.total)}</span><small>{pw.paymentMethods[o.payment]}</small></td>
                    <td data-label="Status"><Pill tone={ORDER_TONE[o.status]}>{pw.orderStatuses[o.status]}</Pill>{refundAsked.has(o.ref) && <small className="rt-pws-ord__flag">Refund requested</small>}</td>
                    <td data-label="Actions">
                      <RowMenu label={`Actions for order ${o.ref}`} items={[
                        { label: "Order details", href: `/provider/orders/${o.ref}` },
                        ...(k ? [{ label: "View cohort", href: `/provider/cohorts/${k}` }] : []),
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pages > 1 && <div className="rt-pws-coh__pages"><CataloguePagination page={at} totalPages={pages} hrefFor={(p) => `?page=${p}`} onNavigate={setPage} /></div>}
        </div>
      ) : (
        <EmptyState title="No orders match these filters." action={{ label: "Clear filters", onClick: clear }} />
      )}
    </div>
  );
}
