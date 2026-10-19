"use client";

import React, { useState } from "react";
import Link from "next/link";
import { EmptyState, ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { formatDate, formatPrice } from "@/lib/format";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { Pill, Said, TableSkeleton, Tabs, formatWhen } from "./adminParts";
import { DISPUTE_TONE, REFUND_TONE, RefundDecision, useMoneyRefresh } from "./moneyParts";

// Refunds (Part B, B4; API admin.refunds): every refund asked for, the ones to decide first. Each shows the order, who asked and
// why; Approve and Decline appear only where this admin may decide (not their own request, within their limit), and say why
// not otherwise. Approving records the refund in the ledger; no money moves until a payment provider is connected.
export function AdminRefunds() {
  const [tab, setTab] = useState("requested");
  const [said, setSaid] = useState("");
  const list = api.admin.refunds.list.useQuery({ status: tab });
  const c = A.refunds;
  const limit = list.data?.limitPence;
  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <div className="rt-adm-toolbar">
        <Tabs tabs={Object.keys(c.tabs).map((key) => ({ key, label: c.tabs[key], count: list.data?.counts?.[key] }))} value={tab} onChange={setTab} label="Show refunds" />
        {list.data && <p className="rt-acc__note">{limit === null ? c.noLimit : c.yourLimit.replace("{limit}", formatPrice((limit ?? 0) / 100))}</p>}
      </div>
      <p className="rt-acc__notice">{A.recordOnly}</p>
      {list.error ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <TableSkeleton rows={4} />
      ) : list.data.refunds.length ? (
        <ul className="rt-adm-items">
          {list.data.refunds.map((r) => (
            <li key={r.id} className="rt-acc__card rt-adm-item">
              <div className="rt-adm-item__body">
                <div className="rt-adm-item__top">
                  <Pill tone={REFUND_TONE[r.status]}>{c.statuses[r.status]}</Pill>
                  <span className="rt-adm-item__when">{c.by.replace("{name}", r.requestedBy || "an admin")} · {formatWhen(Date.parse(r.at))}</span>
                </div>
                <p className="rt-adm-strong rt-adm-review__title">{formatPrice(r.amount)} <span className="rt-adm-muted">of {formatPrice(r.order.gross)}</span></p>
                <p className="rt-acc__note"><Link href={`/admin/orders/${r.order.ref}`} className="rt-adm-strong">{r.order.ref}</Link> · {r.order.buyer} · {r.order.course} · {r.provider}</p>
                <p className="rt-adm-item__reason">{r.reason}</p>
                {r.decidedBy && <p className="rt-acc__note">{c.decidedBy.replace("{status}", c.statuses[r.status]).replace("{name}", r.decidedBy)}{r.decisionNote ? `: ${r.decisionNote}` : ""}</p>}
              </div>
              <div className="rt-adm-item__actions"><RefundDecision refund={r} limitPence={limit} onDone={setSaid} /></div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={c.emptyTabs[tab][0]} text={c.emptyTabs[tab][1]} />
      )}
    </div>
  );
}

// Disputes (API admin.disputes): open ones first, by evidence deadline; won or lost with the "disputes" switch. Lost reverses the
// amount in the ledger.
export function AdminDisputes() {
  const me = useAdminAccess();
  const canManage = me?.permissions?.includes("disputes");
  const [tab, setTab] = useState("open");
  const [said, setSaid] = useState("");
  const list = api.admin.disputes.list.useQuery({ status: tab });
  const close = api.admin.disputes.close.useMutation();
  const refresh = useMoneyRefresh();
  const c = A.disputes;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  const decide = async (x, outcome) => {
    try {
      await close.mutateAsync({ id: x.id, outcome });
      await refresh();
      setSaid(outcome === "won" ? c.wonDone : c.lostDone);
    } catch (err) {
      setSaid(errorsFrom(err).general);
    }
  };
  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <Tabs tabs={Object.keys(c.tabs).map((key) => ({ key, label: c.tabs[key], count: list.data?.counts?.[key] }))} value={tab} onChange={setTab} label="Show disputes" />
      {list.error ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <TableSkeleton rows={3} />
      ) : list.data.disputes.length ? (
        <ul className="rt-adm-items">
          {list.data.disputes.map((x) => (
            <li key={x.id} className="rt-acc__card rt-adm-item">
              <div className="rt-adm-item__body">
                <div className="rt-adm-item__top">
                  <Pill tone={DISPUTE_TONE[x.status]}>{c.statuses[x.status]}</Pill>
                  {x.status === "open" && <span className={`rt-adm-due -${x.evidenceDue < today ? "late" : "warn"}`}>{c.columns.due}: {formatDate(x.evidenceDue)}</span>}
                </div>
                <p className="rt-adm-strong rt-adm-review__title">{formatPrice(x.amount)}</p>
                <p className="rt-acc__note"><Link href={`/admin/orders/${x.order.ref}`} className="rt-adm-strong">{x.order.ref}</Link> · {x.order.buyer} · {x.order.course} · {x.provider}</p>
                <p className="rt-adm-item__reason">{x.reason}</p>
                {x.status === "lost" && <p className="rt-acc__note">{c.lostNote}</p>}
              </div>
              {canManage && x.status === "open" && (
                <div className="rt-adm-item__actions">
                  <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => decide(x, "lost")} disabled={close.isPending}>{c.lost}</button>
                  <button type="button" className="button -sm -purple-1 text-white" onClick={() => decide(x, "won")} disabled={close.isPending}>{c.won}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={c.emptyTabs[tab][0]} text={c.emptyTabs[tab][1]} />
      )}
    </div>
  );
}
