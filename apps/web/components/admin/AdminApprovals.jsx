"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { admin as A } from "@/data/admin";
import { ago } from "@/lib/admin";
import { api } from "@/lib/trpc/react";
import { refreshCourses } from "@/app/admin/actions";
import { useAdminAccess } from "@/lib/adminContext";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { methodName } from "@/lib/taxonomy";
import { Tabs, getQuery, setQuery, Said, TableSkeleton } from "./adminParts";
import { EmptyState, ErrorState } from "@/components/states/States";
import { AdminDue, AdminStatus, AdminTag } from "./AdminStatus";

const copy = A.approvals;
const TABS = ["waiting", "changes", "decided"];
const DAY = 86400000;

// One inbox for what providers send for review (API admin.courses): new courses and changes to live courses, oldest first so
// nothing waits silently, each with its deadline. Review opens the course; a new course can also be approved or sent back here,
// a change approved or turned down. Sending back and turning down need a note, which the provider sees and is emailed (the site's
// pop-up, the first error focused). Waiting new courses can be ticked and approved together. Tabs and the type filter are kept in
// the address. Deciding needs the "approve" switch; the API also stops anyone deciding on what they sent themselves.
export default function AdminApprovals() {
  const me = useAdminAccess();
  const [tab, setTab] = useState("waiting");
  const [type, setType] = useState("all");
  const [picked, setPicked] = useState([]);
  const [asking, setAsking] = useState(null); // { item, decision }
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [said, setSaid] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const utils = api.useUtils();
  const query = api.admin.courses.queue.useQuery({ tab });
  const counts = api.admin.courses.counts.useQuery(undefined, { staleTime: 30000 }).data;
  const decide = api.admin.courses.decide.useMutation();
  const canDecide = Boolean(me?.permissions?.includes("approve"));

  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
    const ty = getQuery("type");
    if (ty && copy.types[ty]) setType(ty);
  }, []);
  if (query.isError) return <ErrorState title="We couldn't load the approvals." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!query.data) return <TableSkeleton />;

  const now = Date.now();
  const items = query.data.map((a) => ({ ...a, key: `${a.type}-${a.courseId}-${a.at}` }));
  const shown = items.filter((a) => type === "all" || a.type === type);
  const pickable = tab === "waiting" ? shown.filter((a) => a.type === "new" && a.providerStatus === "active" && !a.own) : [];
  const allPicked = pickable.length > 0 && pickable.every((a) => picked.includes(a.key));
  const refresh = () => {
    utils.admin.courses.queue.invalidate();
    utils.admin.courses.counts.invalidate();
    utils.admin.courses.get.invalidate();
    utils.admin.courses.list.invalidate();
  };

  const choose = (t) => {
    setTab(t);
    setPicked([]);
    setQuery("tab", t === "waiting" ? "" : t);
  };
  const chooseType = (t) => {
    setType(t);
    setPicked([]);
    setQuery("type", t === "all" ? "" : t);
  };
  const toggle = (key) => setPicked((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));
  const run = async (list, decision, message) => {
    setBusy(true);
    let done = 0;
    const failed = [];
    for (const it of list) {
      try {
        // a change is decided on the version listed (sent at it.at); one the provider changed since is refused
        await decide.mutateAsync({ courseId: it.courseId, decision, message, seen: it.type === "change" ? it.at : undefined });
        done += 1;
      } catch (e) {
        failed.push(`${it.title}: ${errorsFrom(e).general}`);
      }
    }
    setBusy(false);
    setPicked([]);
    refresh();
    if (done) refreshCourses().catch(() => {});
    const verb = { approve: "Approved", approveChange: "Change approved on", changes: "Asked for changes on", rejectChange: "Change turned down on" }[decision];
    setSaid([done ? (list.length === 1 ? `${verb}: ${list[0].title}` : `${verb} ${done} courses`) : "", ...failed].filter(Boolean).join(". "));
    return failed;
  };
  const open = (item, decision) => {
    setAsking({ item, decision });
    setReason("");
    setError("");
  };
  const send = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError(asking.decision === "rejectChange" ? "Enter why the change is not approved." : "Enter what the provider needs to change.");
      return focusFirstError(formRef.current);
    }
    const failed = await run([asking.item], asking.decision, reason.trim());
    if (!failed.length) setAsking(null);
    else setError(failed[0].split(": ").slice(1).join(": ") || "That didn’t work. Reload the page and try again.");
  };

  const tabs = TABS.map((t) => ({ key: t, label: copy.tabs[t], count: t === "decided" ? undefined : counts?.[t] }));
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
        {canDecide && pickable.length > 0 && (
          <div className="rt-adm-bulk">
            <label className="rt-bk__check" htmlFor="rt-adm-all">
              <input id="rt-adm-all" type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? [] : pickable.map((a) => a.key))} />
              <span>Select all new courses</span>
            </label>
            <button type="button" className="button -sm -purple-1 text-white" disabled={!picked.length || busy} onClick={() => run(pickable.filter((a) => picked.includes(a.key)), "approve")}>
              {picked.length ? `Approve selected (${picked.length})` : "Approve selected"}
            </button>
          </div>
        )}
      </div>
      <Said text={said} />

      {shown.length ? (
        <ul className="rt-adm-items">
          {shown.map((a) => {
            const at = a.at ? new Date(a.at).getTime() : now;
            const providerReady = a.providerStatus === "active";
            return (
              <li key={a.key} className={`rt-acc__card rt-adm-item${picked.includes(a.key) ? " is-picked" : ""}`}>
                {canDecide && tab === "waiting" && a.type === "new" && providerReady && !a.own && (
                  <label className="rt-adm-item__pick" htmlFor={`rt-adm-p-${a.key}`}>
                    <input id={`rt-adm-p-${a.key}`} type="checkbox" checked={picked.includes(a.key)} onChange={() => toggle(a.key)} />
                    <span className="rt-sr">Select {a.title}</span>
                  </label>
                )}
                <div className="rt-adm-item__body">
                  <div className="rt-adm-item__top">
                    <AdminTag>{copy.types[a.type]}</AdminTag>
                    {tab === "decided" && a.outcome && <AdminStatus kind="decision" status={a.outcome}>{copy.outcomes[a.outcome]}</AdminStatus>}
                    {tab === "waiting" && a.own && <AdminTag>{copy.ownQueue}</AdminTag>}
                    <span className="rt-adm-item__when">{tab === "waiting" ? "Sent" : "Decided"} {ago(at, now).replace(/^Just/, "just")}</span>
                    {tab === "waiting" && <AdminDue due={at + copy.dueDays * DAY} now={now} />}
                  </div>
                  <h3 className="rt-acc__h3"><Link href={`/admin/catalogue/${a.courseId}`} className="rt-adm-strong">{a.title}</Link></h3>
                  <p className="rt-acc__note">{[a.provider, methodName(a.method), a.parent ? `on the shared page ${a.parent}` : ""].filter(Boolean).join(" · ")}</p>
                  {tab === "waiting" && a.type === "new" && !providerReady && <p className="rt-adm-item__reason">{copy.providerNotActive}</p>}
                  {a.note && <p className="rt-adm-item__reason"><strong>Note to the provider:</strong> {a.note}</p>}
                  {canDecide && tab === "waiting" && a.own && <p className="rt-adm-item__reason">{a.soleApprover ? copy.ownQueueSole : copy.ownBlocked}</p>}
                </div>
                <div className="rt-adm-item__actions">
                  <Link href={`/admin/catalogue/${a.courseId}`} className="button -sm -outline-purple-1 text-purple-1">{copy.review}</Link>
                  {canDecide && tab === "waiting" && a.type === "new" && !a.own && (
                    <>
                      {providerReady && <button type="button" className="button -sm -purple-1 text-white" disabled={busy} onClick={() => run([a], "approve")}>{copy.approve}</button>}
                      <button type="button" className="rt-cd__link" disabled={busy} onClick={() => open(a, "changes")}>{copy.requestChanges}</button>
                    </>
                  )}
                  {canDecide && tab === "waiting" && a.type === "change" && !a.own && (
                    <>
                      <button type="button" className="button -sm -purple-1 text-white" disabled={busy} onClick={() => run([a], "approveChange")}>{copy.approveChange}</button>
                      <button type="button" className="rt-cd__link rt-adm-danger" disabled={busy} onClick={() => open(a, "rejectChange")}>{copy.rejectChange}</button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title={type === "all" ? copy.empty[tab] : "Nothing of this type here."} />
      )}

      <Sheet open={Boolean(asking)} onClose={() => setAsking(null)} title={asking ? `${asking.decision === "rejectChange" ? copy.rejectChange : copy.requestChanges}: ${asking.item.title}` : ""} closeLabel="Close">
        {asking && (
          <form className="rt-q__form rt-biz__sheetform" onSubmit={send} noValidate ref={formRef}>
            <p className="rt-acc__note">{asking.item.provider} · {copy.types[asking.item.type]}</p>
            <div className="rt-field">
              <label htmlFor="rt-adm-reason">{copy.reasonLabel}</label>
              {error && <p className="rt-q__err" id="rt-adm-reason-e"><span className="rt-sr">Error: </span>{error}</p>}
              <textarea id="rt-adm-reason" rows={5} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "rt-adm-reason-e" : undefined} />
            </div>
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy || undefined}>{asking.decision === "rejectChange" ? copy.rejectChange : copy.requestChanges}</button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
