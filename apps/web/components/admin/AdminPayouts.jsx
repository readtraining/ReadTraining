"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { Choice } from "@/components/providerWorkspace/providerParts";
import { EmptyState, ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate, formatPrice } from "@/lib/format";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { Said, TableSkeleton, Tabs, formatWhen, useSort, SortTh, Pager, usePaging } from "./adminParts";
import { describedBy, field } from "./contentParts";
import { LedgerTable } from "./AdminOrder";
import { toPence, useMoneyRefresh } from "./moneyParts";
import DateField from "./DateField";
import { AdminStatus } from "./AdminStatus";

const P = A.payouts;
const L = A.ledger;
const OWED_SORT = { provider: (r) => r.name, balance: (r) => r.balance, held: (r) => r.held, waiting: (r) => r.waiting, payable: (r) => r.payable };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

// Payouts (Part B, B4; API admin.payouts): what each provider is owed up to a day (their ledger balance less holds and payouts
// already waiting), "Create payouts" for that day, then each payout's life: a second admin approves (never its maker), it can be
// held with a reason and released, and it is marked as sent once paid by bank transfer, which writes the ledger's payout entry.
export function AdminPayouts() {
  const me = useAdminAccess();
  const perms = me?.permissions ?? [];
  const [day, setDay] = useState(today());
  const [tab, setTab] = useState("draft");
  const [said, setSaid] = useState("");
  const [holding, setHolding] = useState(null);
  const [viewing, setViewing] = useState(null);
  const sorter = useSort();
  const owed = api.admin.payouts.preview.useQuery({ periodEnd: day });
  const list = api.admin.payouts.list.useQuery({ status: tab });
  const run = api.admin.payouts.run.useMutation();
  const approve = api.admin.payouts.approve.useMutation();
  const release = api.admin.payouts.release.useMutation();
  const sent = api.admin.payouts.markSent.useMutation();
  const refresh = useMoneyRefresh();
  const act = async (fn, message) => {
    try {
      await fn();
      await refresh();
      setSaid(message);
    } catch (err) {
      setSaid(errorsFrom(err).general);
    }
  };
  const c = P.columns;
  const payable = (owed.data ?? []).reduce((s, r) => s + r.payable, 0);

  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <p className="rt-acc__notice">{A.recordOnly}</p>

      <section className="rt-acc__card rt-biz__tablecard" aria-labelledby="rt-po-owed-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-po-owed-h">{P.owed}</h2>
          <div className="rt-adm-toolbar__end">
            <div className="rt-adm-labelled">
              <label htmlFor="rt-po-day">{P.upTo}</label>
              <DateField id="rt-po-day" compact max={today()} value={day} onChange={(v) => v && setDay(v)} />
            </div>
            {perms.includes("payouts") && <button type="button" className="button -md -purple-1 text-white" disabled={run.isPending || !payable} onClick={() => act(async () => { const r = await run.mutateAsync({ periodEnd: day }); if (!r.created) throw new Error(P.runNone); setTab("draft"); return r; }, P.runDone.replace("{n}", owed.data.filter((r) => r.payable > 0).length))}>{P.run}{payable ? ` (${formatPrice(payable)})` : ""}</button>}
          </div>
        </div>
        <p className="rt-acc__note rt-adm-cardnote">{P.owedNote}</p>
        {owed.error ? <ErrorState inCard onRetry={() => owed.refetch()} /> : owed.isLoading ? <TableSkeleton rows={3} /> : owed.data.length ? (
          <table className="rt-biz__table rt-adm-table">
            <thead><tr><SortTh label={c.provider} col="provider" sorter={sorter} /><SortTh label={c.balance} col="balance" sorter={sorter} numeric /><SortTh label={c.held} col="held" sorter={sorter} numeric /><SortTh label={c.waiting} col="waiting" sorter={sorter} numeric /><SortTh label={c.payable} col="payable" sorter={sorter} numeric /></tr></thead>
            <tbody>
              {sorter.apply(owed.data, OWED_SORT).map((r) => (
                <tr key={r.providerId}>
                  <td data-label={c.provider}><Link href={`/admin/providers/${r.slug}`} className="rt-adm-strong">{r.name}</Link>{r.status !== "active" && <small>{A.providers.statuses[r.status]}</small>}</td>
                  <td data-label={c.balance} className="rt-adm-num-cell">{formatPrice(r.balance)}</td>
                  <td data-label={c.held} className="rt-adm-num-cell">{r.held ? <>{formatPrice(r.held)}<small>{[r.heldRefunds && P.heldRefunds.replace("{n}", formatPrice(r.heldRefunds)), r.heldDisputes && P.heldDisputes.replace("{n}", formatPrice(r.heldDisputes))].filter(Boolean).join(" · ")}</small></> : "–"}</td>
                  <td data-label={c.waiting} className="rt-adm-num-cell">{r.waiting ? formatPrice(r.waiting) : "–"}</td>
                  <td data-label={c.payable} className="rt-adm-num-cell"><strong>{formatPrice(r.payable)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState inCard title={P.noOwed} />}
      </section>

      <Tabs tabs={Object.keys(P.tabs).map((key) => ({ key, label: P.tabs[key], count: list.data?.counts?.[key] }))} value={tab} onChange={setTab} label="Show payouts" />
      {list.error ? <ErrorState onRetry={() => list.refetch()} /> : list.isLoading ? <TableSkeleton rows={3} /> : list.data.payouts.length ? (
        <ul className="rt-adm-items">
          {list.data.payouts.map((w) => (
            <li key={w.id} className="rt-acc__card rt-adm-item">
              <div className="rt-adm-item__body">
                <div className="rt-adm-item__top">
                  <AdminStatus kind="payout" status={w.status}>{P.statuses[w.status]}</AdminStatus>
                  <span className="rt-adm-item__when">{w.ref} · {c.period} {formatDate(w.periodEnd)}</span>
                </div>
                <p className="rt-adm-strong rt-adm-review__title">{formatPrice(w.amount)} <span className="rt-adm-muted">to {w.provider}</span></p>
                <p className="rt-acc__note">
                  Created by {w.createdBy || "an admin"} {formatWhen(Date.parse(w.at))}
                  {w.approvedBy && ` · approved by ${w.approvedBy}`}
                  {w.sentBy && ` · marked as sent by ${w.sentBy} ${formatWhen(Date.parse(w.sentAt))}`}
                  {w.heldBack > 0 && ` · ${formatPrice(w.heldBack)} held back`}
                </p>
                {w.holdReason && <p className="rt-adm-item__block"><strong>Held:</strong> {w.holdReason}</p>}
                <button type="button" className="rt-cd__link" onClick={() => setViewing(w)}>{P.covers}</button>
              </div>
              <div className="rt-adm-item__actions">
                {w.status === "draft" && perms.includes("payouts") && (w.mine ? <p className="rt-adm-item__hint">{P.yours}</p> : <button type="button" className="button -sm -purple-1 text-white" onClick={() => act(() => approve.mutateAsync({ id: w.id }), P.approved)} disabled={approve.isPending}>{P.approve}</button>)}
                {w.status === "approved" && perms.includes("payouts") && <button type="button" className="button -sm -purple-1 text-white" onClick={() => act(() => sent.mutateAsync({ id: w.id }), P.sent)} disabled={sent.isPending}>{P.markSent}</button>}
                {(w.status === "draft" || w.status === "approved") && perms.includes("payouts") && <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setHolding(w)}>{P.hold}</button>}
                {w.status === "held" && perms.includes("payouts") && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => act(() => release.mutateAsync({ id: w.id }), P.released)} disabled={release.isPending}>{P.release}</button>}
                {w.status === "approved" && <p className="rt-adm-item__hint">{P.sentNote}</p>}
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState title={P.emptyTabs[tab][0]} text={P.emptyTabs[tab][1]} />}

      <Sheet open={Boolean(holding)} onClose={() => setHolding(null)} title={P.holdTitle} closeLabel="Close">
        {holding && <HoldForm payout={holding} onDone={(m) => { setHolding(null); setSaid(m); }} />}
      </Sheet>
      <Sheet open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing ? `${viewing.ref}: ${P.covers.toLowerCase()}` : ""} closeLabel="Close" className="rt-adm-widesheet">
        {viewing && <Covered id={viewing.id} />}
      </Sheet>
    </div>
  );
}

function HoldForm({ payout, onDone }) {
  const hold = api.admin.payouts.hold.useMutation();
  const refresh = useMoneyRefresh();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const ref = useRef(null);
  const submit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 3) {
      setError("Enter why the payout is held.");
      return focusFirstError(ref.current);
    }
    try {
      await hold.mutateAsync({ id: payout.id, reason: reason.trim() });
      await refresh();
      onDone(P.held);
    } catch (err) {
      setError(errorsFrom(err).general);
    }
  };
  return (
    <form className="rt-q__form rt-biz__sheetform" ref={ref} noValidate onSubmit={submit}>
      <p className="rt-adm-strong">{payout.ref} · {formatPrice(payout.amount)} to {payout.provider}</p>
      {field("rt-po-reason", P.holdReason, null, error, <textarea id="rt-po-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={describedBy("rt-po-reason", null, error)} />)}
      <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={hold.isPending}>{P.hold}</button>
    </form>
  );
}

function Covered({ id }) {
  const q = api.admin.payouts.get.useQuery({ id });
  if (q.isLoading) return <TableSkeleton rows={3} />;
  if (q.error) return <ErrorState inCard onRetry={() => q.refetch()} />;
  return <div className="rt-biz__tablecard"><LedgerTable entries={q.data.entries.map((e) => ({ ...e, orderRef: e.ref, fee: 0, commission: 0 }))} showOrder /></div>;
}

// Transactions (API admin.ledger): the whole ledger in numbered pages, newest or oldest first, by provider and type, with totals; "Adjust a balance" (the
// "adjustments" switch) adds an adjustment or a commission charge with a note.
export function AdminTransactions() {
  const me = useAdminAccess();
  const canAdjust = me?.permissions?.includes("adjustments");
  const [type, setType] = useState("all");
  const [providerId, setProviderId] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [said, setSaid] = useState("");
  const paging = usePaging({ key: "when", dir: -1 });
  const providers = api.admin.providers.list.useQuery({ limit: 100, sort: "name", dir: "asc" });
  const { sort, ...pageInput } = paging.input; // the ledger sorts by date only
  const list = api.admin.ledger.list.useQuery({ type: type === "all" ? undefined : type, providerId: providerId || undefined, ...pageInput }, { enabled: paging.ready, placeholderData: (prev) => prev });
  const entries = list.data?.entries ?? [];
  const totals = list.data?.totals;
  const pickType = (t) => {
    setType(t);
    paging.restart();
  };
  const pickProvider = (id) => {
    setProviderId(id);
    paging.restart();
  };
  const options = [{ value: "", label: L.allProviders }, ...(providers.data?.providers ?? []).map((p) => ({ value: p.id, label: p.name }))];
  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <div className="rt-adm-toolbar">
        <Tabs tabs={[{ key: "all", label: L.all }, ...Object.keys(L.types).map((key) => ({ key, label: L.types[key] }))]} value={type} onChange={pickType} label="Show transactions of this type" />
        <div className="rt-adm-toolbar__end">
          <div className="rt-adm-select"><FieldSelect id="rt-lg-provider" label={L.provider} value={providerId} onChange={pickProvider} options={options} compact /></div>
          {canAdjust && <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setAdjusting(true)}>{L.adjust}</button>}
        </div>
      </div>
      {totals && (
        <dl className="rt-adm-totals" aria-label={L.totals}>
          <div><dt>{L.columns.gross}</dt><dd>{formatPrice(totals.gross)}</dd></div>
          <div><dt>{L.columns.fee}</dt><dd>{formatPrice(totals.fee)}</dd></div>
          <div><dt>{L.columns.commission}</dt><dd>{formatPrice(totals.commission)}</dd></div>
          <div><dt>{L.columns.share}</dt><dd>{formatPrice(totals.provider)}</dd></div>
        </dl>
      )}
      {list.error ? <ErrorState onRetry={() => list.refetch()} /> : list.isPending ? <TableSkeleton /> : entries.length ? (
        <>
          <div className="rt-acc__card rt-biz__tablecard" aria-busy={list.isFetching}><LedgerTable entries={entries} showOrder sorter={paging.sorter} /></div>
          <Pager paging={paging} total={list.data.total} label="transactions" />
        </>
      ) : <EmptyState title={L.empty} />}

      <Sheet open={adjusting} onClose={() => setAdjusting(false)} title={L.adjustTitle} closeLabel="Close">
        {adjusting && <AdjustForm providers={options.slice(1)} onDone={(m) => { setAdjusting(false); setSaid(m); }} />}
      </Sheet>
    </div>
  );
}

function AdjustForm({ providers, onDone }) {
  const adjust = api.admin.ledger.adjust.useMutation();
  const refresh = useMoneyRefresh();
  const [v, setV] = useState({ providerId: "", type: "adjust", amount: "", note: "" });
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    const minus = v.amount.trim().startsWith("-");
    const pence = toPence(v.amount.trim().replace(/^-/, ""));
    if (!v.providerId) found.providerId = "Choose a provider.";
    if (!pence) found.amountPence = "Enter an amount in pounds and pence, like 15 or -12.50.";
    else if (minus && v.type === "charge") found.amountPence = "A charge is taken off the balance: enter it without a minus sign.";
    if (v.note.trim().length < 3) found.note = "Enter what this is for.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    try {
      await adjust.mutateAsync({ providerId: v.providerId, type: v.type, amountPence: minus ? -pence : pence, note: v.note.trim() });
      await refresh();
      onDone(L.adjusted);
    } catch (err) {
      setErrors(errorsFrom(err).fields);
      focusFirstError(ref.current);
    }
  };
  return (
    <form className="rt-q__form rt-biz__sheetform" ref={ref} noValidate onSubmit={submit}>
      {field("rt-adj-provider", L.provider, null, errors.providerId, <FieldSelect id="rt-adj-provider" label={L.provider} value={v.providerId} onChange={(id) => setV((x) => ({ ...x, providerId: id }))} options={providers} invalid={Boolean(errors.providerId)} describedBy={describedBy("rt-adj-provider", null, errors.providerId)} />)}
      <Choice name="rt-adj-type" legend={L.adjustType} value={v.type} onChange={(t) => setV((x) => ({ ...x, type: t }))} options={Object.keys(L.adjustTypes).map((k) => ({ value: k, label: L.adjustTypes[k] }))} />
      {field("rt-adj-amount", L.adjustAmount, L.adjustAmountHint, errors.amountPence, <input id="rt-adj-amount" type="text" inputMode="decimal" className="rt-adm-num" value={v.amount} onChange={(e) => setV((x) => ({ ...x, amount: e.target.value }))} aria-invalid={errors.amountPence ? true : undefined} aria-describedby={describedBy("rt-adj-amount", L.adjustAmountHint, errors.amountPence)} />)}
      {field("rt-adj-note", L.adjustNote, null, errors.note, <textarea id="rt-adj-note" rows={3} maxLength={500} value={v.note} onChange={(e) => setV((x) => ({ ...x, note: e.target.value }))} aria-invalid={errors.note ? true : undefined} aria-describedby={describedBy("rt-adj-note", null, errors.note)} />)}
      <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={adjust.isPending}>{L.adjust}</button>
    </form>
  );
}
