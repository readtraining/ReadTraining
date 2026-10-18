"use client";

import React, { useEffect, useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { admin as A } from "@/data/admin";
import { ago, decideApproval, useAdmin } from "@/lib/admin";
import { focusFirstError } from "@/lib/focusFirstError";
import { Due, Pill, Tabs, getQuery, setQuery, Said } from "./adminParts";
import { EmptyState } from "@/components/states/States";

const copy = A.approvals;
const TABS = ["pending", "changes", "approved", "rejected"];
const TYPE_TONE = { offering: "ok", dates: "muted", price: "warn" };

// One inbox for what providers send for review (new course listings, new dates, price changes; DEMO until courses are real),
// oldest first so nothing waits silently, each with its deadline. Waiting items can be ticked and approved together (the plan's
// bulk approve). Provider applications are decided on the Providers page. "Ask for changes" and "Reject" need a reason, shown to the provider (the site's pop-up, GOV.UK field, the first
// error focused). Tabs and the type filter are kept in the address.
export default function AdminApprovals() {
  const data = useAdmin();
  const [tab, setTab] = useState("pending");
  const [type, setType] = useState("all");
  const [picked, setPicked] = useState([]);
  const [asking, setAsking] = useState(null); // { item, status }
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [said, setSaid] = useState("");
  const formRef = useRef(null);

  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
    const ty = getQuery("type");
    if (ty && copy.types[ty]) setType(ty);
  }, []);
  if (!data) return null;

  const { approvals, now } = data;
  const ofType = approvals.filter((a) => type === "all" || a.type === type);
  const shown = ofType.filter((a) => a.status === tab);
  if (tab !== "pending") shown.sort((a, b) => (b.decidedAt || 0) - (a.decidedAt || 0));
  const pickable = shown.filter((a) => a.status === "pending");
  const allPicked = pickable.length > 0 && pickable.every((a) => picked.includes(a.id));

  const choose = (t) => {
    setTab(t);
    setPicked([]);
    setQuery("tab", t === "pending" ? "" : t);
  };
  const chooseType = (t) => {
    setType(t);
    setPicked([]);
    setQuery("type", t === "all" ? "" : t);
  };
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const approve = (items) => {
    items.forEach((it) => decideApproval(it, "approved"));
    setPicked([]);
    setSaid(items.length === 1 ? `Approved: ${items[0].title}` : `Approved ${items.length} items`);
  };
  const open = (item, status) => {
    setAsking({ item, status });
    setReason("");
    setError("");
  };
  const send = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError(copy.reasonError);
      return focusFirstError(formRef.current);
    }
    decideApproval(asking.item, asking.status, reason.trim());
    setSaid(`${asking.status === "rejected" ? "Rejected" : "Asked for changes on"}: ${asking.item.title}`);
    setAsking(null);
  };

  const tabs = TABS.map((t) => ({ key: t, label: copy.tabs[t], count: ofType.filter((a) => a.status === t).length }));
  const types = [{ key: "all", label: copy.filterAll }, ...Object.entries(copy.types).map(([key, label]) => ({ key, label }))];

  return (
    <div className="rt-acc__stack">
      <Tabs tabs={tabs} value={tab} onChange={choose} label="Show approvals" />
      <div className="rt-adm-toolbar">
        <div className="rt-adm-seg" role="group" aria-label="Type">
          {types.map((t) => (
            <button key={t.key} type="button" className={type === t.key ? "is-on" : undefined} aria-pressed={type === t.key} onClick={() => chooseType(t.key)}>{t.label}</button>
          ))}
        </div>
        {tab === "pending" && pickable.length > 0 && (
          <div className="rt-adm-bulk">
            <label className="rt-bk__check" htmlFor="rt-adm-all">
              <input id="rt-adm-all" type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? [] : pickable.map((a) => a.id))} />
              <span>Select all</span>
            </label>
            <button type="button" className="button -sm -purple-1 text-white" disabled={!picked.length} onClick={() => approve(pickable.filter((a) => picked.includes(a.id)))}>
              {picked.length ? `Approve selected (${picked.length})` : "Approve selected"}
            </button>
          </div>
        )}
      </div>
      <Said text={said} />

      {shown.length ? (
        <ul className="rt-adm-items">
          {shown.map((a) => (
            <li key={a.id} className={`rt-acc__card rt-adm-item${picked.includes(a.id) ? " is-picked" : ""}`}>
              {a.status === "pending" && (
                <label className="rt-adm-item__pick" htmlFor={`rt-adm-p-${a.id}`}>
                  <input id={`rt-adm-p-${a.id}`} type="checkbox" checked={picked.includes(a.id)} onChange={() => toggle(a.id)} />
                  <span className="rt-sr">Select {a.title}</span>
                </label>
              )}
              <div className="rt-adm-item__body">
                <div className="rt-adm-item__top">
                  <Pill tone={TYPE_TONE[a.type]}>{copy.types[a.type]}</Pill>
                  <span className="rt-adm-item__when">Sent {ago(a.submitted, now)}</span>
                  {a.status === "pending" && <Due due={a.due} now={now} />}
                </div>
                <h3 className="rt-acc__h3">{a.title}</h3>
                <p className="rt-acc__note">
                  {a.provider} · {a.detail}
                </p>
                {a.reason && <p className="rt-adm-item__reason"><strong>Reason given:</strong> {a.reason}</p>}
              </div>
              {a.status === "pending" && (
                <div className="rt-adm-item__actions">
                  <button type="button" className="button -sm -purple-1 text-white" onClick={() => approve([a])}>{copy.approve}</button>
                  <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => open(a, "changes")}>{copy.requestChanges}</button>
                  <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => open(a, "rejected")}>{copy.reject}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={copy.empty} />
      )}

      <Sheet open={Boolean(asking)} onClose={() => setAsking(null)} title={asking ? `${asking.status === "rejected" ? copy.reject : copy.requestChanges}: ${asking.item.title}` : ""} closeLabel="Close">
        {asking && (
          <form className="rt-q__form rt-biz__sheetform" onSubmit={send} noValidate ref={formRef}>
            <p className="rt-acc__note">{asking.item.provider} · {copy.types[asking.item.type]}</p>
            <div className="rt-field">
              <label htmlFor="rt-adm-reason">{copy.reasonLabel}</label>
              {error && <p className="rt-q__err" id="rt-adm-reason-e"><span className="rt-sr">Error: </span>{error}</p>}
              <textarea id="rt-adm-reason" rows={4} maxLength={600} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "rt-adm-reason-e" : undefined} />
            </div>
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{asking.status === "rejected" ? copy.reject : copy.requestChanges}</button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
