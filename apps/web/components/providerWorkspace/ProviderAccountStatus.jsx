"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { useWorkspace } from "@/lib/workspaceContext";

const copy = pw.accountStatus;
const CAN_RESUBMIT = ["owner", "admin", "marketing"]; // provider.profile.edit

// The provider account's status from the ReadTraining team, at the top of every workspace page: waiting for review, changes
// asked for (the team's message, and "send for review" with an optional note), or suspended (with the reason). Nothing when
// the account is active.
export default function ProviderAccountStatus() {
  const workspace = useWorkspace();
  const router = useRouter();
  const resubmit = api.organisations.resubmit.useMutation();
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const status = workspace?.status;
  if (!copy[status]) return null;
  const c = copy[status];

  const send = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await resubmit.mutateAsync({ organisationId: workspace.id, reply: reply.trim() || undefined });
      setSent(true);
      router.refresh();
    } catch (err) {
      const { fields, general } = errorsFrom(err);
      setError(fields.reply || general);
    }
  };

  return (
    <section className={`rt-pws-status -${status}`} aria-labelledby="rt-pws-status-h">
      <h2 className="rt-pws-status__title" id="rt-pws-status-h">{c.title}</h2>
      <p className="rt-pws-status__text">{c.text}</p>
      {workspace.statusNote && status !== "pending" && <p className="rt-pws-status__note">{workspace.statusNote}</p>}
      {status === "changes_requested" && (sent ? (
        <p className="rt-pws-status__text" role="status">{c.sent}</p>
      ) : CAN_RESUBMIT.includes(workspace.role) ? (
        <form className="rt-pws-status__form" onSubmit={send} noValidate>
          <div className="rt-field">
            <label htmlFor="rt-pws-reply">{c.reply}</label>
            {error && <p className="rt-q__err" id="rt-pws-reply-e"><span className="rt-sr">Error: </span>{error}</p>}
            <textarea id="rt-pws-reply" rows={2} maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "rt-pws-reply-e" : undefined} />
          </div>
          <button type="submit" className="button -sm -purple-1 text-white" disabled={resubmit.isPending}>{c.send}</button>
        </form>
      ) : (
        <p className="rt-pws-status__text">{c.onlyManagers}</p>
      ))}
    </section>
  );
}
