"use client";

import React, { useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { Said, TableSkeleton, Tabs, Empty } from "./adminParts";
import { AdminDue } from "./AdminStatus";

const c = A.closures;
// "9 November 2026", in UK time (as the emails say it)
const on = (iso) => (iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(new Date(iso)) : "");

// Closure requests (API admin.closures; the "suspend" switch): everyone who asked to close their account, the open ones nearest
// their one-month deadline first. Each opens the person's record, and Close account carries the request out.
export function AdminClosures() {
  const [tab, setTab] = useState("open");
  const [said, setSaid] = useState("");
  const [closing, setClosing] = useState(null); // the request being confirmed
  const list = api.admin.closures.list.useQuery({ status: tab });
  const now = Date.now();
  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <Tabs tabs={Object.keys(c.tabs).map((key) => ({ key, label: c.tabs[key], count: list.data?.counts?.[key] }))} value={tab} onChange={setTab} label="Show closure requests" />
      {list.error ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <TableSkeleton rows={3} />
      ) : list.data.requests.length ? (
        <ul className="rt-adm-items">
          {list.data.requests.map((r) => (
            <li key={r.id} className="rt-acc__card rt-adm-item">
              <div className="rt-adm-item__body">
                <div className="rt-adm-item__top">
                  {r.status === "open" && <AdminDue due={Date.parse(r.dueAt)} now={now} />}
                  <span className="rt-adm-item__when">{c.asked.replace("{date}", on(r.requestedAt))}</span>
                </div>
                <p className="rt-adm-strong rt-adm-review__title">{r.name || r.email}</p>
                {r.name && <p className="rt-acc__note">{r.email}</p>}
                {r.status === "open" && (
                  <>
                    <p className="rt-acc__note">{c.deadline.replace("{date}", on(r.dueAt))}</p>
                    <p className="rt-adm-item__reason">{r.reason ? `${c.reason}: ${r.reason}` : c.noReason}</p>
                    {!r.accountExists && <p className="rt-acc__note">{c.gone}</p>}
                  </>
                )}
                {r.status === "done" && <p className="rt-acc__note">{(r.closedBy ? c.closedOn.replace("{name}", r.closedBy) : c.closedOnNoName).replace("{date}", on(r.closedAt))}</p>}
                {r.status === "withdrawn" && <p className="rt-acc__note">{c.withdrawnOn.replace("{date}", on(r.closedAt))}</p>}
              </div>
              {r.status === "open" && (
                <div className="rt-adm-item__actions">
                  {r.accountExists && <Link href={`/admin/learners/${r.userId}`} className="button -sm -outline-purple-1 text-purple-1">{c.open}</Link>}
                  <button type="button" className="button -sm -purple-1 text-white" onClick={() => setClosing(r)}>{c.close}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty title={c.emptyTabs[tab][0]} text={c.emptyTabs[tab][1]} />
      )}
      <CloseAccountSheet request={closing} onClose={() => setClosing(null)} onDone={() => setSaid(c.closed)} />
    </div>
  );
}

// The "are you sure?" step for closing an account, from this list or the learner's record. `request`: { id, name, email }.
export function CloseAccountSheet({ request, onClose, onDone }) {
  const utils = api.useUtils();
  const close = api.admin.closures.close.useMutation();
  const [error, setError] = useState("");
  const shut = () => {
    setError("");
    onClose();
  };
  const confirm = async () => {
    setError("");
    try {
      await close.mutateAsync({ id: request.id });
      await Promise.all([utils.admin.closures.invalidate(), utils.admin.students.list.invalidate(), utils.admin.activity.list.invalidate()]);
      onDone();
      shut();
    } catch (err) {
      setError(errorsFrom(err).general);
    }
  };
  return (
    <Sheet open={Boolean(request)} onClose={shut} title={request ? c.sheet.title.replace("{name}", request.name || request.email) : ""} closeLabel="Close">
      {request && (
        <div className="rt-q__form rt-biz__sheetform">
          {c.sheet.what.map((w) => <p key={w} className="rt-acc__note">{w}</p>)}
          {error && <p className="rt-q__err rt-acc__formerr" role="alert">{error}</p>}
          <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={confirm} disabled={close.isPending} aria-busy={close.isPending}>{close.isPending ? c.sheet.closing : c.sheet.confirm}</button>
          <button type="button" className="button -md -outline-purple-1 text-purple-1 rt-btn-block" onClick={shut}>{c.sheet.cancel}</button>
        </div>
      )}
    </Sheet>
  );
}
