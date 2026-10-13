"use client";

import React from "react";
import { pw } from "@/data/providerWorkspace";
import { ToolSelect } from "./providerParts";

// Shared by the sales pages (orders, transactions, payouts, learners): the date range picker with its custom from/to dates,
// the test a record's time passes, and the CSV download.

const RANGE_OPTIONS = [...pw.ranges.map((r) => ({ value: r.key, label: r.label })), { value: "custom", label: "Custom dates" }];

// [from, to] in ms for a range key; null means no limit
export function rangeBounds(key, from, to, now = Date.now()) {
  const d = new Date(now);
  const r = pw.ranges.find((x) => x.key === key);
  if (key === "all" || !key) return [null, null];
  if (r?.days) return [now - r.days * 86400000, null];
  if (key === "month") return [Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1), null];
  if (key === "year") return [Date.UTC(d.getUTCFullYear(), 0, 1), null];
  if (key === "custom") return [from ? Date.parse(`${from}T00:00:00Z`) : null, to ? Date.parse(`${to}T23:59:59Z`) : null];
  return [null, null];
}
export const inRange = (ms, [a, b]) => (a === null || ms >= a) && (b === null || ms <= b);

// The range select; "Custom dates" shows two date fields.
export function RangeControl({ id, value, from, to, onChange }) {
  return (
    <div className="rt-pws-money__range">
      <ToolSelect id={id} label="Dates" value={value} onChange={(v) => onChange({ range: v, from, to })} options={RANGE_OPTIONS} />
      {value === "custom" && (
        <div className="rt-pws-money__dates">
          <div className="rt-field rt-adm-select -inline">
            <label htmlFor={`${id}-from`} className="rt-sr">From</label>
            <input id={`${id}-from`} type="date" value={from} max={to || undefined} onChange={(e) => onChange({ range: value, from: e.target.value, to })} autoComplete="off" />
          </div>
          <span className="rt-adm-muted" aria-hidden="true">to</span>
          <div className="rt-field rt-adm-select -inline">
            <label htmlFor={`${id}-to`} className="rt-sr">To</label>
            <input id={`${id}-to`} type="date" value={to} min={from || undefined} onChange={(e) => onChange({ range: value, from, to: e.target.value })} autoComplete="off" />
          </div>
        </div>
      )}
    </div>
  );
}

// rows: arrays of cells; the first row is the header
export function downloadCsv(name, rows) {
  const cell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const signed = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", signDisplay: "exceptZero" });
export const formatSigned = (n) => signed.format(Number(n) || 0);
const dayTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
export const formatOrderDay = (ms) => dayTime.format(new Date(ms));
