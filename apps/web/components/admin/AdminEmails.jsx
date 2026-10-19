"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { api } from "@/lib/trpc/react";
import { Pill, Tabs, TableSkeleton, formatWhen } from "./adminParts";

const copy = A.emails;
const TONE = { live: "ok", later: "muted", auth: "info" };
const AUDIENCES = ["all", "Learner", "Provider", "Everyone"];
const AUDIENCE_LABEL = { all: "All", Learner: "Learners", Provider: "Providers", Everyone: "Sign-in" };

// Notifications & Email Templates (Part B, B3): every automated email (API admin.emails.list), filtered by who gets it, with
// when it is sent and whether it is sending today. A row opens the email's words (sign-in emails are listed but edited with
// the sign-in settings).
export default function AdminEmails() {
  const list = api.admin.emails.list.useQuery();
  const [who, setWho] = useState("all");
  if (list.isLoading) return <TableSkeleton rows={8} />;
  if (list.error) return <ErrorState onRetry={() => list.refetch()} />;
  const rows = list.data.filter((e) => who === "all" || e.audience === who);
  const c = copy.columns;

  return (
    <div className="rt-acc__stack">
      <Tabs tabs={AUDIENCES.map((key) => ({ key, label: AUDIENCE_LABEL[key], count: key === "all" ? list.data.length : list.data.filter((e) => e.audience === key).length }))} value={who} onChange={setWho} label="Show emails sent to" />
      <div className="rt-acc__card rt-biz__tablecard">
        <table className="rt-biz__table rt-adm-table">
          <thead><tr><th scope="col">{c.name}</th><th scope="col">{c.audience}</th><th scope="col">{c.trigger}</th><th scope="col">{c.status}</th></tr></thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.key}>
                <td data-label={c.name}>
                  {e.status === "auth" ? <span className="rt-adm-strong">{e.name}</span> : <Link href={`/admin/emails/${e.key}`} className="rt-adm-strong">{e.name}</Link>}
                  <small>{e.changedAt ? `${copy.changed} ${formatWhen(Date.parse(e.changedAt))}` : e.subject}</small>
                </td>
                <td data-label={c.audience}>{e.audience}</td>
                <td data-label={c.trigger} className="rt-adm-emails__when">{e.trigger}</td>
                <td data-label={c.status}><span title={copy.statusNotes[e.status]}><Pill tone={TONE[e.status]}>{copy.statuses[e.status]}</Pill></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rt-acc__note">{copy.statusNotes.later} {copy.statusNotes.auth}</p>
    </div>
  );
}
