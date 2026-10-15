"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

// The provider workspace's charts, drawn in SVG on the design tokens (no chart library): a sparkline for KPI cards, an area
// chart with a hover / keyboard tooltip and an optional dashed previous-period line, a ranked bar list and the change badge.
// Every chart carries a hidden table of its numbers for screen readers.

export const money = (v) => formatPrice(v).replace(/\.00$/, "");

// "+12.4%" against the previous period; flat when there is nothing to compare with
export function Delta({ now, before, label = "vs previous period" }) {
  if (!before && !now) return <span className="rt-chart-delta -flat">No change<span className="rt-sr"> {label}</span></span>;
  if (!before) return <span className="rt-chart-delta -up">New<span className="rt-sr"> {label}</span></span>;
  const pct = ((now - before) / before) * 100;
  const dir = Math.abs(pct) < 0.05 ? "flat" : pct > 0 ? "up" : "down";
  return (
    <span className={`rt-chart-delta -${dir}`}>
      <span aria-hidden="true">{dir === "up" ? "↑" : dir === "down" ? "↓" : "→"}</span>
      {Math.abs(pct).toFixed(1)}%<span className="rt-sr"> {dir === "down" ? "down" : "up"} {label}</span>
    </span>
  );
}

// a smooth path through points (monotone cubic, so it never overshoots below zero)
function smooth(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  const d = [`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d.push(`C${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`);
  }
  return d.join(" ");
}

export function Sparkline({ values, label }) {
  const id = useId().replace(/:/g, "");
  const W = 120;
  const H = 36;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [values.length > 1 ? (i * W) / (values.length - 1) : W / 2, H - 3 - (v / max) * (H - 6)]);
  const line = smooth(pts);
  return (
    <svg className="rt-chart-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`sg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="rt-chart-stop-a" />
          <stop offset="100%" className="rt-chart-stop-b" />
        </linearGradient>
      </defs>
      {line && <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#sg${id})`} />}
      {line && <path d={line} className="rt-chart-spark__line" />}
    </svg>
  );
}

// points: [{ label, value, before?, day? }]; `isMoney` formats the axis and tooltip as pounds; `day` (the period's own figure
// when the line is a running total) shows in the tooltip too. Drawn at the box's real width so the text stays its true size.
export function AreaChart({ points, isMoney = false, label, compareLabel = "Previous period", dayLabel = "" }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState(null);
  const box = useRef(null);
  const [W, setW] = useState(760);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 560 ? 220 : 280;
  const pad = { l: 56, r: 20, t: 20, b: 34 };
  const fmt = (v) => (isMoney ? money(v) : String(Math.round(v)));
  const hasBefore = points.some((p) => p.before !== undefined);
  const { top, x, y } = useMemo(() => {
    const max = Math.max(1, ...points.map((p) => Math.max(p.value, p.before || 0)));
    const t = isMoney ? (() => { const step = 10 ** Math.floor(Math.log10(max)); return Math.ceil(max / step) * step; })() : Math.max(4, Math.ceil(max / 4) * 4);
    return {
      top: t,
      x: (i) => pad.l + (points.length > 1 ? (i * (W - pad.l - pad.r)) / (points.length - 1) : (W - pad.l - pad.r) / 2),
      y: (v) => pad.t + (H - pad.t - pad.b) * (1 - v / t),
    };
  }, [points, isMoney, W, H, pad.l, pad.r, pad.t, pad.b]);
  const now = points.map((p, i) => [x(i), y(p.value)]);
  const line = smooth(now);
  const before = hasBefore ? smooth(points.map((p, i) => [x(i), y(p.before || 0)])) : "";
  const every = Math.max(1, Math.ceil(points.length / Math.max(3, Math.floor(W / 110))));
  const h = hover === null ? null : points[hover];
  const pick = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    points.forEach((_, i) => { if (Math.abs(x(i) - vx) < Math.abs(x(best) - vx)) best = i; });
    setHover(best);
  };
  const keys = (e) => {
    if (!points.length) return;
    if (e.key === "ArrowRight") { e.preventDefault(); setHover((v) => (v === null ? 0 : Math.min(points.length - 1, v + 1))); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setHover((v) => (v === null ? points.length - 1 : Math.max(0, v - 1))); }
    if (e.key === "Escape") setHover(null);
  };

  return (
    <div className="rt-chart">
      {hasBefore && (
        <ul className="rt-chart__legend" aria-hidden="true">
          <li><span className="rt-chart__key -now"></span>{label}</li>
          <li><span className="rt-chart__key -before"></span>{compareLabel}</li>
        </ul>
      )}
      <div className="rt-chart__plot" ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} className="rt-chart__svg" tabIndex={0} role="img" aria-label={`${label} chart. Use the arrow keys to read each period.`}
          onPointerMove={pick} onPointerLeave={() => setHover(null)} onKeyDown={keys} onBlur={() => setHover(null)}>
          <defs>
            <linearGradient id={`ag${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="rt-chart-stop-a" />
              <stop offset="100%" className="rt-chart-stop-b" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={pad.l} x2={W - pad.r} y1={y(top * f)} y2={y(top * f)} className="rt-chart__grid" />
              <text x={pad.l - 10} y={y(top * f) + 4} className="rt-chart__axis" textAnchor="end">{fmt(top * f)}</text>
            </g>
          ))}
          {before && <path d={before} className="rt-chart__before" />}
          {line && <path d={`${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#ag${id})`} className="rt-chart__area" />}
          {line && <path d={line} className="rt-chart__line" pathLength="1" />}
          {points.map((p, i) => (i % every === 0 || i === points.length - 1) && <text key={`l${i}`} x={x(i)} y={H - 10} className="rt-chart__axis" textAnchor="middle">{p.label}</text>)}
          {h && (
            <g className="rt-chart__focus">
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} className="rt-chart__cross" />
              {hasBefore && <circle cx={x(hover)} cy={y(h.before || 0)} r="4" className="rt-chart__dot -before" />}
              <circle cx={x(hover)} cy={y(h.value)} r="5" className="rt-chart__dot" />
            </g>
          )}
        </svg>
        {h && (
          <div className={`rt-chart__tip${x(hover) > W * 0.66 ? " -left" : ""}`} style={{ "--rt-tip-x": `${(x(hover) / W) * 100}%` }} aria-live="polite">
            <b>{h.label}</b>
            <span><i className="rt-chart__key -now" aria-hidden="true"></i>{fmt(h.value)}</span>
            {h.day !== undefined && <span className="rt-chart__tipday">{fmt(h.day)} {dayLabel}</span>}
            {hasBefore && <span className="rt-chart__tipbefore"><i className="rt-chart__key -before" aria-hidden="true"></i>{fmt(h.before || 0)}</span>}
          </div>
        )}
      </div>
      <table className="rt-sr">
        <caption>{label} by period</caption>
        <thead><tr><th scope="col">Period</th><th scope="col">{label}</th>{hasBefore && <th scope="col">{compareLabel}</th>}</tr></thead>
        <tbody>{points.map((p, i) => <tr key={i}><td>{p.label}</td><td>{fmt(p.value)}</td>{hasBefore && <td>{fmt(p.before || 0)}</td>}</tr>)}</tbody>
      </table>
    </div>
  );
}

// rows: [{ key, label, value, href? }], longest bar first
export function BarList({ rows, isMoney = false, empty = "Nothing in this period." }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="rt-acc__note">{empty}</p>;
  return (
    <ul className="rt-chart-bars">
      {rows.map((r) => (
        <li key={r.key}>
          <span className="rt-chart-bars__bar" style={{ "--rt-bar": `${Math.max(2, (r.value / max) * 100)}%` }} aria-hidden="true"></span>
          <span className="rt-chart-bars__label">{r.href ? <Link href={r.href}>{r.label}</Link> : r.label}</span>
          <b className="rt-chart-bars__value">{isMoney ? money(r.value) : r.value}</b>
        </li>
      ))}
    </ul>
  );
}
