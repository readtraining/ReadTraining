"use client";

import React, { useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { admin as A } from "@/data/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { describedBy, field } from "./contentParts";

// Shared parts of the money screens (Part B, B4): the status tones, the refund decision (with the limit and own-request rules
// shown before anyone clicks), and the forms to ask for a refund and to record a dispute. All real (API admin.refunds /
// admin.disputes); every change reads the money lists again.

export const ORDER_TONE = { paid: "ok", part_refunded: "warn", refunded: "muted", cancelled: "muted" };
export const REFUND_TONE = { requested: "warn", approved: "ok", declined: "muted" };
export const DISPUTE_TONE = { open: "late", won: "ok", lost: "muted" };
export const PAYOUT_TONE = { draft: "warn", approved: "info", held: "late", sent: "ok" };

// pounds typed in a box → whole pence, or null
export const toPence = (v) => (/^\d+(\.\d{1,2})?$/.test(String(v).trim()) ? Math.round(Number(v) * 100) : null);

// after any money change: every list, the order, the badges and the activity log read again
export function useMoneyRefresh() {
  const utils = api.useUtils();
  return () => Promise.all([utils.admin.orders.invalidate(), utils.admin.refunds.invalidate(), utils.admin.disputes.invalidate(), utils.admin.payouts.invalidate(), utils.admin.ledger.invalidate(), utils.admin.activity.list.invalidate()]);
}

// What this admin may do with a refund request: decide it, or why not (their own request, above their limit, no switch).
export function useRefundRule() {
  const me = useAdminAccess();
  const can = me?.permissions?.includes("refunds");
  const full = me?.preset === "full";
  return (r, limitPence) => {
    if (!can) return { ok: false };
    if (r.mine) return { ok: false, why: A.refunds.own };
    if (!full && limitPence !== null && limitPence !== undefined && Math.round(r.amount * 100) > limitPence) return { ok: false, why: A.refunds.overLimit };
    return { ok: true };
  };
}

// Approve / Decline for one request; Decline asks for the reason in a sheet.
export function RefundDecision({ refund, limitPence, onDone }) {
  const rule = useRefundRule()(refund, limitPence);
  const decide = api.admin.refunds.decide.useMutation();
  const refresh = useMoneyRefresh();
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const ref = useRef(null);
  const c = A.refunds;
  const go = async (decision) => {
    setError("");
    if (decision === "decline" && !note.trim()) {
      setError("Enter why the refund is declined.");
      return focusFirstError(ref.current);
    }
    try {
      await decide.mutateAsync({ id: refund.id, decision, note: decision === "decline" ? note.trim() : undefined });
      await refresh();
      setDeclining(false);
      onDone(decision === "approve" ? c.approved : c.declined);
    } catch (err) {
      const { fields, general } = errorsFrom(err);
      if (decision === "decline") setError(fields.note || general);
      else onDone(general);
    }
  };
  if (refund.status !== "requested") return null;
  if (!rule.ok) return rule.why ? <p className="rt-adm-item__hint">{rule.why}</p> : null;
  return (
    <>
      <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setDeclining(true)}>{c.decline}</button>
      <button type="button" className="button -sm -purple-1 text-white" onClick={() => go("approve")} disabled={decide.isPending}>{c.approve} {formatPrice(refund.amount)}</button>
      <Sheet open={declining} onClose={() => setDeclining(false)} title={c.declineTitle} closeLabel="Close">
        <form className="rt-q__form rt-biz__sheetform" ref={ref} noValidate onSubmit={(e) => { e.preventDefault(); go("decline"); }}>
          {field("rt-rf-note", c.declineReason, c.declineHint, error, <textarea id="rt-rf-note" rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={describedBy("rt-rf-note", c.declineHint, error)} />)}
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={decide.isPending}>{c.decline}</button>
        </form>
      </Sheet>
    </>
  );
}

// "Ask for a refund" on an order: amount (up to what is left) and reason.
export function RefundRequestForm({ order, onDone }) {
  const request = api.admin.refunds.request.useMutation();
  const refresh = useMoneyRefresh();
  const [v, setV] = useState({ amount: order.left.toFixed(2), reason: "" });
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  const c = A.refunds;
  const hint = c.amountHint.replace("{left}", formatPrice(order.left));
  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    const pence = toPence(v.amount);
    if (!pence || pence <= 0) found.amountPence = "Enter an amount in pounds and pence, like 50 or 12.50.";
    else if (pence > Math.round(order.left * 100)) found.amountPence = `Enter ${formatPrice(order.left)} or less.`;
    if (v.reason.trim().length < 3) found.reason = "Enter why the refund is asked for.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    try {
      await request.mutateAsync({ orderId: order.id, amountPence: pence, reason: v.reason.trim() });
      await refresh();
      onDone(c.requested);
    } catch (err) {
      setErrors(errorsFrom(err).fields);
      focusFirstError(ref.current);
    }
  };
  return (
    <form className="rt-q__form rt-biz__sheetform" ref={ref} noValidate onSubmit={submit}>
      {field("rt-rf-amount", c.amount, hint, errors.amountPence, <input id="rt-rf-amount" type="text" inputMode="decimal" className="rt-adm-num" value={v.amount} onChange={(e) => setV((x) => ({ ...x, amount: e.target.value }))} aria-invalid={errors.amountPence ? true : undefined} aria-describedby={describedBy("rt-rf-amount", hint, errors.amountPence)} />)}
      {field("rt-rf-reason", c.reason, null, errors.reason, <textarea id="rt-rf-reason" rows={4} maxLength={500} value={v.reason} onChange={(e) => setV((x) => ({ ...x, reason: e.target.value }))} aria-invalid={errors.reason ? true : undefined} aria-describedby={describedBy("rt-rf-reason", null, errors.reason)} />)}
      <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={request.isPending}>{c.requestTitle}</button>
    </form>
  );
}

// "Record a dispute" on a card order: amount, what the card holder says, and the evidence deadline.
export function DisputeForm({ order, onDone }) {
  const open = api.admin.disputes.open.useMutation();
  const refresh = useMoneyRefresh();
  const [v, setV] = useState({ amount: order.left.toFixed(2), reason: "", due: "" });
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  const c = A.disputes;
  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    const pence = toPence(v.amount);
    if (!pence || pence <= 0) found.amountPence = "Enter an amount in pounds and pence.";
    else if (pence > Math.round(order.left * 100)) found.amountPence = `Enter ${formatPrice(order.left)} or less.`;
    if (v.reason.trim().length < 3) found.reason = "Enter what the dispute is about.";
    if (!v.due) found.evidenceDue = "Enter the date the evidence is due.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    try {
      await open.mutateAsync({ orderId: order.id, amountPence: pence, reason: v.reason.trim(), evidenceDue: v.due });
      await refresh();
      onDone(c.opened);
    } catch (err) {
      setErrors(errorsFrom(err).fields);
      focusFirstError(ref.current);
    }
  };
  return (
    <form className="rt-q__form rt-biz__sheetform" ref={ref} noValidate onSubmit={submit}>
      {field("rt-dp-amount", c.amount, null, errors.amountPence, <input id="rt-dp-amount" type="text" inputMode="decimal" className="rt-adm-num" value={v.amount} onChange={(e) => setV((x) => ({ ...x, amount: e.target.value }))} aria-invalid={errors.amountPence ? true : undefined} aria-describedby={describedBy("rt-dp-amount", null, errors.amountPence)} />)}
      {field("rt-dp-reason", c.reason, null, errors.reason, <textarea id="rt-dp-reason" rows={3} maxLength={500} value={v.reason} onChange={(e) => setV((x) => ({ ...x, reason: e.target.value }))} aria-invalid={errors.reason ? true : undefined} aria-describedby={describedBy("rt-dp-reason", null, errors.reason)} />)}
      {field("rt-dp-due", c.due, c.dueHint, errors.evidenceDue, <input id="rt-dp-due" type="date" value={v.due} onChange={(e) => setV((x) => ({ ...x, due: e.target.value }))} aria-invalid={errors.evidenceDue ? true : undefined} aria-describedby={describedBy("rt-dp-due", c.dueHint, errors.evidenceDue)} />)}
      <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={open.isPending}>{c.openTitle}</button>
    </form>
  );
}
