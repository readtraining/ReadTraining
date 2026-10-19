"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { EmptyState, ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { courseHref } from "@/data/courseSlugs";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate, formatPrice } from "@/lib/format";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { DetailSkeleton, Pill, Said, formatWhen } from "./adminParts";
import { describedBy, field } from "./contentParts";
import { DISPUTE_TONE, DisputeForm, ORDER_TONE, REFUND_TONE, RefundDecision, RefundRequestForm, useMoneyRefresh } from "./moneyParts";

const copy = A.orders;
const d = copy.detail;
const L = A.ledger;

// One order (Part B, B4; API admin.orders.get): who booked what, where the money goes (fee, commission, provider's share, at the
// rates of the day it was booked), what has been given back and what is left, then refunds and disputes with their decisions,
// and the order's ledger. Ask for a refund, record a dispute (card payments) or cancel the booking from here; refunds and
// cancellations are recorded only until a payment provider is connected, and the screen says so.
export default function AdminOrder({ reference }) {
  const me = useAdminAccess();
  const perms = me?.permissions ?? [];
  const order = api.admin.orders.get.useQuery({ ref: reference }, { retry: false });
  const refunds = api.admin.refunds.list.useQuery({ status: "requested" });
  const [sheet, setSheet] = useState(null); // "refund" | "dispute" | "cancel"
  const [said, setSaid] = useState("");
  if (order.isLoading) return <DetailSkeleton />;
  if (order.error?.data?.code === "NOT_FOUND") return <EmptyState title={d.notFound} action={{ href: "/admin/orders", label: d.back }} />;
  if (order.error) return <ErrorState onRetry={() => order.refetch()} />;
  const o = order.data;
  const open = !["cancelled", "refunded"].includes(o.status);
  const done = (message) => {
    setSheet(null);
    setSaid(message);
  };
  const s = o.split;

  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <section className="rt-acc__card rt-adm-hero" aria-label="Order">
        <div>
          <div className="rt-adm-item__top">
            <Pill tone={ORDER_TONE[o.status]}>{copy.statuses[o.status]}</Pill>
            <span className="rt-adm-item__when">Booked {formatWhen(Date.parse(o.at))}{o.bookedBy ? ` · ${copy.staff.replace("{name}", o.bookedBy)}` : ""}</span>
          </div>
          <h1 className="rt-adm__h1 rt-adm-hero__name">{o.ref}</h1>
          <p className="rt-acc__note">{o.buyer.name} · {formatPrice(s.gross)} · {copy.methods[o.method]}</p>
        </div>
        {open && (
          <div className="rt-adm-hero__actions">
            {o.left > 0 && o.method !== "free" && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setSheet("refund")}>{d.requestRefund}</button>}
            {o.left > 0 && perms.includes("disputes") && ["card", "payment_link", "bnpl"].includes(o.method) && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setSheet("dispute")}>{d.openDispute}</button>}
            {perms.includes("refunds") && <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setSheet("cancel")}>{d.cancel}</button>}
          </div>
        )}
      </section>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-ord-split-h">
          <h2 className="rt-acc__h2" id="rt-ord-split-h">{d.split}</h2>
          <p className="rt-acc__note rt-adm-cardnote">{d.splitNote.replace("{fee}", o.rates.feePercent).replace("{commission}", o.rates.commissionPercent)}</p>
          <div className="rt-adm-split" aria-hidden="true">
            {s.gross > 0 && [["fee", s.fee], ["commission", s.commission], ["provider", s.provider]].map(([k, v]) => <span key={k} className={`-${k}`} style={{ flexGrow: v }}></span>)}
          </div>
          <dl className="rt-adm-dl">
            <div><dt>{d.gross}</dt><dd><strong>{formatPrice(s.gross)}</strong></dd></div>
            <div><dt><i className="rt-adm-key -fee" aria-hidden="true"></i>{d.fee}</dt><dd>{formatPrice(s.fee)}</dd></div>
            <div><dt><i className="rt-adm-key -commission" aria-hidden="true"></i>{d.commission}</dt><dd>{formatPrice(s.commission)}</dd></div>
            <div><dt><i className="rt-adm-key -provider" aria-hidden="true"></i>{d.provider}</dt><dd>{formatPrice(s.provider)}</dd></div>
            {o.given.gross > 0 && <div><dt>{d.given}</dt><dd>−{formatPrice(o.given.gross)}</dd></div>}
            <div><dt>{d.left}</dt><dd><strong>{formatPrice(o.left)}</strong></dd></div>
          </dl>
        </section>
        <section className="rt-acc__card" aria-labelledby="rt-ord-who-h">
          <h2 className="rt-acc__h2" id="rt-ord-who-h">{d.course}</h2>
          <dl className="rt-adm-dl">
            <div><dt>{d.course}</dt><dd><Link href={courseHref(o.course.id)} className="rt-adm-strong">{o.course.title}</Link>{o.course.startsOn && <small className="rt-adm-dl__sub">{formatDate(o.course.startsOn)}</small>}</dd></div>
            <div><dt>Places</dt><dd>{d.places.replace("{n}", o.quantity).replace("{price}", formatPrice(o.unit))}</dd></div>
            <div><dt>Provider</dt><dd><Link href={`/admin/providers/${o.provider.slug}`} className="rt-adm-strong">{o.provider.name}</Link></dd></div>
            <div><dt>{d.buyer}</dt><dd>{o.buyer.accountId ? <Link href={`/admin/learners/${o.buyer.accountId}`} className="rt-adm-strong">{o.buyer.name}</Link> : o.buyer.name}<small className="rt-adm-dl__sub">{o.buyer.email}{o.buyer.company ? ` · ${o.buyer.company}` : ""}</small></dd></div>
            {o.note && <div><dt>Note</dt><dd>{o.note}</dd></div>}
          </dl>
        </section>
      </div>

      <section className="rt-acc__card" aria-labelledby="rt-ord-rf-h">
        <h2 className="rt-acc__h2" id="rt-ord-rf-h">{d.refunds}</h2>
        {o.refunds.length ? (
          <ul className="rt-adm-list">
            {o.refunds.map((r) => (
              <li key={r.id}>
                <div>
                  <span className="rt-adm-strong">{formatPrice(r.amount)}</span> <Pill tone={REFUND_TONE[r.status]}>{A.refunds.statuses[r.status]}</Pill>
                  <small>{r.reason} · {A.refunds.by.replace("{name}", r.requestedBy || "an admin")}, {formatWhen(Date.parse(r.at))}</small>
                  {r.decidedBy && <small>{A.refunds.decidedBy.replace("{status}", A.refunds.statuses[r.status]).replace("{name}", r.decidedBy)}{r.decisionNote ? `: ${r.decisionNote}` : ""}</small>}
                </div>
                <div className="rt-adm-list__side"><RefundDecision refund={r} limitPence={refunds.data?.limitPence} onDone={setSaid} /></div>
              </li>
            ))}
          </ul>
        ) : <p className="rt-acc__note">{d.noRefunds}</p>}
        <p className="rt-acc__notice rt-adm-mt">{A.recordOnly}</p>
      </section>

      {o.disputes.length > 0 && (
        <section className="rt-acc__card" aria-labelledby="rt-ord-dp-h">
          <h2 className="rt-acc__h2" id="rt-ord-dp-h">{d.disputes}</h2>
          <ul className="rt-adm-list">
            {o.disputes.map((x) => (
              <li key={x.id}>
                <div><span className="rt-adm-strong">{formatPrice(x.amount)}</span> <Pill tone={DISPUTE_TONE[x.status]}>{A.disputes.statuses[x.status]}</Pill><small>{x.reason} · {A.disputes.columns.due}: {formatDate(x.evidenceDue)}</small></div>
              </li>
            ))}
          </ul>
          <Link href="/admin/disputes" className="fb-textlink rt-adm-mt">{A.disputes.title}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
        </section>
      )}

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-ord-lg-h">
        <h2 className="rt-acc__h2" id="rt-ord-lg-h">{d.ledger}</h2>
        <p className="rt-acc__note rt-adm-cardnote">{d.ledgerNote}</p>
        <LedgerTable entries={o.ledger} />
      </section>

      <Sheet open={sheet === "refund"} onClose={() => setSheet(null)} title={A.refunds.requestTitle} closeLabel="Close">
        {sheet === "refund" && <RefundRequestForm order={o} onDone={done} />}
      </Sheet>
      <Sheet open={sheet === "dispute"} onClose={() => setSheet(null)} title={A.disputes.openTitle} closeLabel="Close">
        {sheet === "dispute" && <DisputeForm order={o} onDone={done} />}
      </Sheet>
      <Sheet open={sheet === "cancel"} onClose={() => setSheet(null)} title={d.cancelTitle} closeLabel="Close">
        {sheet === "cancel" && <CancelForm order={o} onDone={done} />}
      </Sheet>
    </div>
  );
}

// a ledger's rows (the order page and Transactions): signed amounts, from the provider's side
export function LedgerTable({ entries, showOrder = false }) {
  const c = L.columns;
  const sign = (n) => (n < 0 ? `−${formatPrice(-n)}` : formatPrice(n));
  return (
    <table className="rt-biz__table rt-adm-table rt-adm-ledger">
      <thead><tr><th scope="col">{c.when}</th><th scope="col">{c.type}</th>{showOrder && <th scope="col">{c.what}</th>}<th scope="col">{c.gross}</th><th scope="col">{c.fee}</th><th scope="col">{c.commission}</th><th scope="col">{c.share}</th></tr></thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id}>
            <td data-label={c.when}>{formatWhen(Date.parse(e.at))}{e.by && <small>{e.by}</small>}</td>
            <td data-label={c.type}><span className={`rt-adm-ltype -${e.type}`}>{L.types[e.type]}</span>{e.note && <small>{e.note}</small>}</td>
            {showOrder && <td data-label={c.what}>{e.orderRef ? <Link href={`/admin/orders/${e.orderRef}`} className="rt-adm-strong">{e.orderRef}</Link> : e.payoutRef || "–"}<small>{e.providerName}</small></td>}
            <td data-label={c.gross} className="rt-adm-num-cell">{e.gross ? sign(e.gross) : "–"}</td>
            <td data-label={c.fee} className="rt-adm-num-cell">{e.fee ? sign(e.fee) : "–"}</td>
            <td data-label={c.commission} className="rt-adm-num-cell">{e.commission ? sign(e.commission) : "–"}</td>
            <td data-label={c.share} className={`rt-adm-num-cell${e.provider < 0 ? " -minus" : ""}`}><strong>{sign(e.provider)}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CancelForm({ order, onDone }) {
  const cancel = api.admin.orders.cancel.useMutation();
  const refresh = useMoneyRefresh();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const ref = useRef(null);
  const submit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 3) {
      setError("Enter why the booking is cancelled.");
      return focusFirstError(ref.current);
    }
    try {
      await cancel.mutateAsync({ orderId: order.id, reason: reason.trim() });
      await refresh();
      onDone(d.cancelled);
    } catch (err) {
      const { fields, general } = errorsFrom(err);
      setError(fields.reason || (err?.data?.code === "FORBIDDEN" ? "Above your refund limit: a Full admin cancels this booking." : general));
      focusFirstError(ref.current);
    }
  };
  return (
    <form className="rt-q__form rt-biz__sheetform" ref={ref} noValidate onSubmit={submit}>
      <p className="rt-acc__note">{d.cancelText} {A.recordOnly}</p>
      <p className="rt-adm-strong">{order.ref} · {formatPrice(order.left)} left</p>
      {field("rt-cn-reason", d.cancelReason, null, error, <textarea id="rt-cn-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={describedBy("rt-cn-reason", null, error)} />)}
      <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={cancel.isPending}>{d.cancel}</button>
    </form>
  );
}
