"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { useProvider } from "@/lib/providerWorkspace";
import { formatPrice } from "@/lib/format";
import { Empty, Loading, Search, ToolSelect, getQuery, setQuery } from "./providerParts";
import { RangeControl, downloadCsv, formatOrderDay, formatSigned, inRange, rangeBounds } from "./moneyParts";

// Every money movement on the account, newest first: sales, card fees and commission, refunds, disputes, cancellations and
// payouts. Search by reference, a type and a date range (kept in the address), the totals for what is shown, and a CSV of it.
const TYPE_OPTIONS = [{ value: "", label: "All types" }, ...Object.entries(pw.transactionTypes).map(([value, label]) => ({ value, label }))];

export default function ProviderTransactions() {
  const data = useProvider();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [range, setRange] = useState({ range: "all", from: "", to: "" });
  useEffect(() => {
    setQ(getQuery("q") || "");
    const t = getQuery("type");
    if (pw.transactionTypes[t]) setType(t);
    setRange({ range: getQuery("range") || "all", from: getQuery("from") || "", to: getQuery("to") || "" });
  }, []);
  if (!data) return <Loading rows={2} />;
  if (!data.transactions.length) return <Empty title="No transactions yet" text="Sales, fees, refunds and payouts are listed here as they happen." />;

  const bounds = rangeBounds(range.range, range.from, range.to);
  const needle = q.trim().toLowerCase();
  const list = data.transactions.filter((t) => (!type || t.type === type) && inRange(t.at, bounds) && (!needle || `${t.id} ${t.ref}`.toLowerCase().includes(needle)));
  const money = (filter) => list.filter(filter).reduce((s, t) => s + t.amount, 0);
  const totals = [
    { label: "Money in", value: formatPrice(money((t) => t.amount > 0)) },
    { label: "Fees, refunds and disputes", value: formatPrice(-money((t) => t.amount < 0 && t.type !== "payout")) },
    { label: "Paid to your bank", value: formatPrice(-money((t) => t.type === "payout")) },
  ];
  const setRangeQ = (r) => {
    setRange(r);
    setQuery("range", r.range === "all" ? "" : r.range);
    setQuery("from", r.range === "custom" ? r.from : "");
    setQuery("to", r.range === "custom" ? r.to : "");
  };
  const csv = () => downloadCsv("transactions.csv", [["Date", "Transaction", "Type", "Reference", "Description", "Amount (GBP)"], ...list.map((t) => [new Date(t.at).toISOString().slice(0, 10), t.id, pw.transactionTypes[t.type], t.ref, t.text, t.amount.toFixed(2)])]);
  const refLink = (t) => (t.type === "payout" ? "/provider/payouts" : `/provider/orders/${t.ref}`);

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Search value={q} onChange={(v) => { setQ(v); setQuery("q", v.trim()); }} label="Search by order or payout reference" />
        <div className="rt-adm-toolbar__end">
          <ToolSelect id="rt-pws-tx-type" label="Type" value={type} onChange={(v) => { setType(v); setQuery("type", v); }} options={TYPE_OPTIONS} />
          <RangeControl id="rt-pws-tx-range" {...range} value={range.range} onChange={setRangeQ} />
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={csv} disabled={!list.length}>Download CSV</button>
        </div>
      </div>
      <ul className="rt-pws-money__totals" aria-label="Totals for the transactions shown">
        {totals.map((t) => <li key={t.label} className="rt-acc__card"><span>{t.label}</span><strong>{t.value}</strong></li>)}
      </ul>
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "transaction" : "transactions"}`}</p>
      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead>
              <tr><th scope="col">Date</th><th scope="col">Transaction</th><th scope="col">Type</th><th scope="col">Reference</th><th scope="col">Description</th><th scope="col" className="rt-pws-money__right">Amount</th></tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td data-label="Date">{formatOrderDay(t.at)}</td>
                  <td data-label="Transaction">{t.id}</td>
                  <td data-label="Type">{pw.transactionTypes[t.type]}</td>
                  <td data-label="Reference"><Link href={refLink(t)}>{t.ref}</Link></td>
                  <td data-label="Description">{t.text}</td>
                  <td data-label="Amount" className={`rt-pws-money__num rt-pws-money__right${t.amount < 0 ? " -out" : t.amount > 0 ? " -in" : ""}`}>{formatSigned(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rt-acc__card rt-acc__empty">No transactions match. Try another type or date range.</p>
      )}
    </div>
  );
}
