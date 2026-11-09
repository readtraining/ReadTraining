"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { api } from "@/lib/trpc/react";
import { Empty, Pager, Search, Tabs, TableSkeleton, formatWhen, useSort, SortTh, usePaging } from "./adminParts";
import { AdminStatus, AdminTag } from "./AdminStatus";

const copy = A.emails;
const AUDIENCES = ["all", "Learner", "Business", "Provider", "Admin", "Everyone"];
const AUDIENCE_LABEL = { all: "All", Learner: "Learners", Business: "Businesses", Provider: "Providers", Admin: "Admin team", Everyone: "Sign-in" };

const EMAIL_SORT = { name: (e) => e.name, audience: (e) => e.audience, status: (e) => e.status };

// Notifications & Email Templates (Part B, B3): every automated email (API admin.emails.list), filtered by who gets it, with
// when it is sent and whether it is sending today. A row opens the email's words (sign-in emails are listed but edited with
// the sign-in settings).
export default function AdminEmails() {
  const list = api.admin.emails.list.useQuery();
  const [who, setWho] = useState("all");
  const [q, setQ] = useState("");
  const sorter = useSort();
  const pages = usePaging({ key: "", dir: -1 }); // a page at a time, cut here (the list loads once)
  if (list.isLoading) return <TableSkeleton rows={8} />;
  if (list.error) return <ErrorState onRetry={() => list.refetch()} />;
  // search by the email's name, its subject or when it is sent
  const needle = q.trim().toLowerCase();
  const found = list.data.filter((e) => (who === "all" || e.audience === who) && (!needle || `${e.name} ${e.subject ?? ""} ${e.trigger}`.toLowerCase().includes(needle)));
  const rows = sorter.apply(found, EMAIL_SORT);
  const c = copy.columns;

  return (
    <div className="rt-acc__stack">
      <Tabs tabs={AUDIENCES.map((key) => ({ key, label: AUDIENCE_LABEL[key], count: key === "all" ? list.data.length : list.data.filter((e) => e.audience === key).length }))} value={who} onChange={(k) => { setWho(k); pages.restart(); }} label="Show emails sent to" />
      <div className="rt-adm-toolbar">
        <Search value={q} onChange={(v) => { setQ(v); pages.restart(); }} label={copy.search} />
      </div>
      {rows.length ? (
      <div className="rt-acc__card rt-biz__tablecard">
        <table className="rt-biz__table rt-adm-table">
          <thead><tr><SortTh label={c.name} col="name" sorter={sorter} /><SortTh label={c.audience} col="audience" sorter={sorter} /><th scope="col">{c.trigger}</th><SortTh label={c.status} col="status" sorter={sorter} /></tr></thead>
          <tbody>
            {rows.slice((pages.page - 1) * pages.limit, pages.page * pages.limit).map((e) => (
              <tr key={e.key}>
                <td data-label={c.name}>
                  {e.status === "auth" ? <span className="rt-adm-strong">{e.name}</span> : <Link href={`/admin/emails/${e.key}`} className="rt-adm-strong">{e.name}</Link>}
                  <small>{e.changedAt ? `${copy.changed} ${formatWhen(Date.parse(e.changedAt))}` : e.subject}</small>
                </td>
                <td data-label={c.audience}>{e.audience}</td>
                <td data-label={c.trigger} className="rt-adm-emails__when">{e.trigger}</td>
                <td data-label={c.status}><span title={copy.statusNotes[e.status]}>{e.status === "live" ? <AdminStatus kind="email" status="live">{copy.statuses[e.status]}</AdminStatus> : <AdminTag>{copy.statuses[e.status]}</AdminTag>}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager paging={pages} total={rows.length} label="emails" />
      </div>
      ) : <Empty kind="none" title={copy.none} />}
      <p className="rt-acc__note">{copy.statusNotes.later} {copy.statusNotes.auth}</p>
    </div>
  );
}
