"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { admin as A } from "@/data/admin";
import { useAdmin } from "@/lib/admin";
import { formatDate, formatPrice } from "@/lib/format";
import { Pill, Search, Tabs, getQuery, setQuery } from "./adminParts";

const copy = A.orders;
const TABS = ["all", "upcoming", "completed", "cancelled"];
export const MONEY_TONE = { paid: "info", delivered: "warn", transferred: "ok", paidout: "ok", reversed: "muted" };

// Every order, newest first: tabs (kept in the address), a search by reference, name, email or company, and the table (cards on
// phones) with the course and its date, the total, how it was paid and where the money is (Paid > Delivered > Transferred >
// Paid out, or Reversed), explained once above the table.
export default function AdminOrders() {
  const data = useAdmin();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
    const s = getQuery("q");
    if (s) setQ(s);
  }, []);
  if (!data) return null;

  const needle = q.trim().toLowerCase();
  const matches = (o) => !needle || `${o.ref} ${o.buyer.name} ${o.buyer.email} ${o.buyer.company || ""}`.toLowerCase().includes(needle);
  const list = data.orders.filter((o) => (tab === "all" || o.state === tab) && matches(o)).sort((a, b) => b.booked - a.booked);
  const tabs = TABS.map((t) => ({ key: t, label: copy.tabs[t], count: data.orders.filter((o) => t === "all" || o.state === t).length }));
  const c = copy.columns;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={tab} onChange={(t) => { setTab(t); setQuery("tab", t === "all" ? "" : t); }} label="Show orders" />
        <Search value={q} onChange={(v) => { setQ(v); setQuery("q", v.trim()); }} label={copy.search} />
      </div>
      <p className="rt-acc__note rt-adm-help"><i className="icon-wall-clock text-12" aria-hidden="true"></i> {copy.moneyHelp}</p>
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "order" : "orders"}`}</p>
      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead>
              <tr><th scope="col">{c.ref}</th><th scope="col">{c.buyer}</th><th scope="col">{c.course}</th><th scope="col">{c.total}</th><th scope="col">{c.payment}</th><th scope="col">{c.state}</th></tr>
            </thead>
            <tbody>
              {list.map((o) => {
                const l = o.lines[0];
                return (
                  <tr key={o.ref}>
                    <td data-label={c.ref}><Link href={`/admin/orders/${o.ref}`} className="rt-adm-strong">{o.ref}</Link></td>
                    <td data-label={c.buyer}>{o.buyer.name}<small>{o.buyer.company || o.buyer.email}</small></td>
                    <td data-label={c.course}>{l.title}<small>{formatDate(l.date)} · {l.provider}</small></td>
                    <td data-label={c.total}>{formatPrice(o.total)}{l.qty > 1 && <small>{l.qty} delegates</small>}</td>
                    <td data-label={c.payment}>{copy.methods[o.method]}</td>
                    <td data-label={c.state}><Pill tone={MONEY_TONE[l.money]}>{copy.money[l.money]}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rt-acc__card rt-acc__empty">No orders match.</p>
      )}
    </div>
  );
}
