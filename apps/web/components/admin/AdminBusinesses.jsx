"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminWork as W } from "@/data/adminWork";
import { useAdmin } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { Search, Tabs, getQuery, setQuery, useSort, SortTh, TableSkeleton } from "./adminParts";
import { EmptyState } from "@/components/states/States";
import { AdminStatus } from "./AdminStatus";

const copy = W.businesses;
const TABS = ["all", "credit", "overdue", "suspended"];

const BUSINESS_SORT = { name: (b) => b.name, places: (b) => b.places.bought, credit: (b) => b.credit, owed: (b) => b.owed, overdue: (b) => b.overdue };

// Business accounts (admin plan module 11): every company with its places used, credit facility, what it owes and how much is
// overdue. Tabs: all, eligible for credit (regular customers we can offer credit to, as on Hurak), overdue money, credit on hold (kept in the address); a search by company or contact.
export default function AdminBusinesses() {
  const data = useAdmin();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const sorter = useSort();
  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
  }, []);
  if (!data) return <TableSkeleton />;

  const inTab = (b, t) => (t === "credit" ? b.eligible : t === "overdue" ? b.overdue > 0 : t === "suspended" ? b.credit === "suspended" : true);
  const needle = q.trim().toLowerCase();
  const list = data.businesses.filter((b) => inTab(b, tab) && (!needle || `${b.name} ${b.contact} ${b.email}`.toLowerCase().includes(needle)));
  const tabs = TABS.map((t) => ({ key: t, label: copy.tabs[t], count: data.businesses.filter((b) => inTab(b, t)).length }));
  const c = copy.columns;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={tab} onChange={(t) => { setTab(t); setQuery("tab", t === "all" ? "" : t); }} label="Show business accounts" />
        <Search value={q} onChange={setQ} label={copy.search} />
      </div>
      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead><tr><SortTh label={c.name} col="name" sorter={sorter} /><SortTh label={c.places} col="places" sorter={sorter} numeric /><SortTh label={c.credit} col="credit" sorter={sorter} /><SortTh label={c.owed} col="owed" sorter={sorter} numeric /><SortTh label={c.overdue} col="overdue" sorter={sorter} numeric /></tr></thead>
            <tbody>
              {sorter.apply(list, BUSINESS_SORT).map((b) => (
                <tr key={b.slug}>
                  <td data-label={c.name}><Link href={`/admin/businesses/${b.slug}`} className="rt-adm-strong">{b.name}</Link><small>{b.contact} · {b.city}</small></td>
                  <td data-label={c.places}>{b.places.assigned} of {b.places.bought}<small>{b.places.bought - b.places.assigned} not assigned</small></td>
                  <td data-label={c.credit}><AdminStatus kind="credit" status={b.credit}>{copy.credit[b.credit]}</AdminStatus>{b.limit > 0 && <small>Limit {formatPrice(b.limit)}</small>}{b.eligible && <small>Eligible for credit</small>}</td>
                  <td data-label={c.owed}>{formatPrice(b.owed)}</td>
                  <td data-label={c.overdue}>{b.overdue > 0 ? <span className="rt-adm-money-late">{formatPrice(b.overdue)}</span> : <span className="rt-acc__note">None</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="No business accounts here." />}
    </div>
  );
}
