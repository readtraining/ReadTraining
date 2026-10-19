"use client";

import React, { useEffect, useState } from "react";
import { admin as A } from "@/data/admin";
import { actOnChange, ago, useAdmin } from "@/lib/admin";
import { formatDate, formatPrice } from "@/lib/format";
import { Due, Pill, Tabs, formatWhen, getQuery, setQuery, Said, TableSkeleton } from "./adminParts";
import { EmptyState } from "@/components/states/States";

const copy = A.changes;
const TYPE_TONE = { cancel: "warn", date: "info", dispute: "late" };
const STATUS_TONE = { provider: "warn", approved: "info", evidence: "late", refunded: "ok", moved: "ok", rejected: "muted", won: "ok", lost: "muted" };
// what can be done next, by type and status
const NEXT = {
  "cancel:provider": ["approve", "decline"],
  "date:provider": ["move", "decline"],
  "cancel:approved": ["refundCard", "refundWallet"],
  "dispute:evidence": ["evidence", "won", "lost"],
};

// Cancellations, date changes and card disputes in one queue: Open (oldest deadline first) and Done. Each request shows its
// order, customer, course, provider and amount, why it was raised, its deadline, and only the actions its state allows
// (a cancellation: provider approved > refund to card or to wallet, wallet only when the customer chose it; a date change:
// confirm the new date; a dispute: evidence sent > won or lost). Each action updates the order's timeline.
export default function AdminChanges() {
  const data = useAdmin();
  const [tab, setTab] = useState("open");
  const [said, setSaid] = useState("");
  useEffect(() => {
    if (getQuery("tab") === "done") setTab("done");
  }, []);
  if (!data) return <TableSkeleton />;

  const { changes, now } = data;
  const open = changes.filter((c) => c.open).sort((a, b) => a.due - b.due);
  const done = changes.filter((c) => !c.open).sort((a, b) => (b.closedAt || b.raised) - (a.closedAt || a.raised));
  const list = tab === "open" ? open : done;
  const act = (c, action) => {
    actOnChange(c, action);
    setSaid(`${copy.actions[action]}: ${c.ref}`);
  };

  return (
    <div className="rt-acc__stack">
      <Tabs tabs={[{ key: "open", label: copy.tabs.open, count: open.length }, { key: "done", label: copy.tabs.done, count: done.length }]} value={tab} onChange={(t) => { setTab(t); setQuery("tab", t === "done" ? t : ""); }} label="Show requests" />
      <Said text={said} />
      {list.length ? (
        <ul className="rt-adm-items">
          {list.map((c) => {
            const next = (c.open && NEXT[`${c.type}:${c.status}`]) || [];
            return (
              <li key={c.id} className="rt-acc__card rt-adm-item">
                <div className="rt-adm-item__body">
                  <div className="rt-adm-item__top">
                    <Pill tone={TYPE_TONE[c.type]}>{copy.types[c.type]}</Pill>
                    <Pill tone={STATUS_TONE[c.status]}>{copy.statuses[c.status]}{c.outcome ? ` (${c.outcome})` : ""}</Pill>
                    <span className="rt-adm-item__when">Raised {ago(c.raised, now)}</span>
                    {c.open && <Due due={c.due} now={now} />}
                  </div>
                  <h3 className="rt-acc__h3">{c.ref} · {c.buyer.name}</h3>
                  <p className="rt-acc__note">{c.course} · {formatDate(c.date)} · {c.provider} · {formatPrice(c.amount)}</p>
                  <p className="rt-adm-item__reason"><strong>Reason:</strong> {c.reason}</p>
                  {c.type === "dispute" && c.evidenceSent && c.open && <p className="rt-acc__note">Evidence sent. Waiting for the card issuer.</p>}
                  {!c.open && c.closedAt && <p className="rt-acc__note">Closed {formatWhen(c.closedAt)}</p>}
                </div>
                {next.length > 0 && (
                  <div className="rt-adm-item__actions">
                    {next.filter((a) => !(a === "evidence" && c.evidenceSent)).map((a, i) => (
                      <button key={a} type="button" className={a === "decline" || a === "lost" ? "rt-cd__link rt-adm-danger" : i === 0 ? "button -sm -purple-1 text-white" : "button -sm -outline-purple-1 text-purple-1"} onClick={() => act(c, a)}>{copy.actions[a]}</button>
                    ))}
                    {next.includes("refundWallet") && <small className="rt-adm-item__hint">{copy.walletNote}</small>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title={copy.empty} />
      )}
    </div>
  );
}
