"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { EmptyState, ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate } from "@/lib/format";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { Pill, formatWhen } from "./adminParts";
import { STATE_TONE } from "./AdminLearnerList";

const copy = A.learners;
const d = copy.detail;
const when = (iso) => (iso ? formatWhen(Date.parse(iso)) : <span className="rt-adm-muted">{d.notYet}</span>);
const given = (v) => v || <span className="rt-adm-muted">{d.missing}</span>;

// One learner's record (API admin.students.get): who they are, how they sign in, their provider and business accounts and
// their latest activity. Admins with the "suspend" switch can block or unblock the account (with a reason, kept in the log);
// with "export" they can download everything held about the person. Bookings, wallet and certificates join when they are real.
export default function AdminLearner({ id }) {
  const me = useAdminAccess();
  const utils = api.useUtils();
  const record = api.admin.students.get.useQuery({ userId: id }, { retry: (n, e) => e?.data?.code !== "NOT_FOUND" && n < 2 });
  const activity = api.admin.activity.list.useQuery({ q: id, limit: 8 });
  const exporter = api.admin.students.export.useMutation();
  const [sheet, setSheet] = useState(null); // "block" | "unblock"
  const [said, setSaid] = useState("");

  if (record.isLoading) return null;
  if (record.error?.data?.code === "NOT_FOUND" || record.error?.data?.code === "BAD_REQUEST") return <EmptyState title={d.notFound} action={{ href: "/admin/learners", label: d.back }} />;
  if (record.error) return <ErrorState onRetry={() => record.refetch()} />;
  const l = record.data;
  const can = (p) => me?.permissions?.includes(p);
  const mine = me?.id === l.id;
  const changed = (text) => {
    setSaid(text);
    utils.admin.students.get.invalidate({ userId: id });
    utils.admin.students.list.invalidate();
    utils.admin.activity.list.invalidate();
  };
  const download = async () => {
    try {
      const file = await exporter.mutateAsync({ userId: id });
      const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${l.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-data.json`;
      a.click();
      URL.revokeObjectURL(url);
      changed(d.exported);
    } catch (error) {
      setSaid(errorsFrom(error).general);
    }
  };
  const f = d.fields;
  const sf = d.signInFields;

  return (
    <div className="rt-acc__stack">
      <Link href="/admin/learners" className="fb-textlink rt-adm-back"><i className="icon-arrow-left text-12" aria-hidden="true"></i>{d.back}</Link>
      <p className="rt-sr" aria-live="polite">{said}</p>

      <section className="rt-acc__card rt-adm-hero" aria-label={d.profile}>
        <div className="rt-adm-learner__who">
          {l.photoUrl ? <img src={l.photoUrl} alt="" className="rt-adm-learner__photo" /> : <span className="rt-acc__avatar rt-adm-learner__photo" aria-hidden="true">{l.name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>}
          <div>
            <div className="rt-adm-item__top">
              <Pill tone={STATE_TONE[l.status]}>{copy.states[l.status]}</Pill>
              {l.admin && <Pill tone="info">{d.adminAccess}: {A.presets[l.admin]}</Pill>}
            </div>
            <h2 className="rt-acc__h2 rt-adm-hero__name">{l.name}</h2>
            <p className="rt-acc__note">{l.email} · Joined {formatDate(l.joinedAt.slice(0, 10))}</p>
          </div>
        </div>
      </section>

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-lp-h">
          <h2 className="rt-acc__h2" id="rt-adm-lp-h">{d.profile}</h2>
          <dl className="rt-adm-dl">
            <div><dt>{f.email}</dt><dd>{l.email}</dd></div>
            <div><dt>{f.phone}</dt><dd>{given(l.phone)}</dd></div>
            <div><dt>{f.dateOfBirth}</dt><dd>{given(l.dateOfBirth && formatDate(l.dateOfBirth))}</dd></div>
            <div><dt>{f.address}</dt><dd>{given(l.address.join(", "))}</dd></div>
            <div><dt>{f.marketing}</dt><dd>{l.marketingOptIn ? `${d.marketingOn}${l.marketingOptInAt ? `, ${formatDate(l.marketingOptInAt.slice(0, 10))}` : ""}` : d.marketingOff}</dd></div>
          </dl>
        </section>

        <section className="rt-acc__card" aria-labelledby="rt-adm-ls-h">
          <h2 className="rt-acc__h2" id="rt-adm-ls-h">{d.signIn}</h2>
          <dl className="rt-adm-dl">
            <div><dt>{sf.joined}</dt><dd>{when(l.joinedAt)}</dd></div>
            <div><dt>{sf.confirmed}</dt><dd>{when(l.confirmedAt)}</dd></div>
            <div><dt>{sf.last}</dt><dd>{when(l.lastSignInAt)}</dd></div>
            <div><dt>{sf.methods}</dt><dd>{given(l.signInMethods.map((m) => d.methods[m] ?? m).join(", "))}</dd></div>
            <div><dt>{sf.twoStep}</dt><dd>{l.twoStep ? "On" : "Off"}</dd></div>
          </dl>
        </section>
      </div>

      <section className="rt-acc__card" aria-labelledby="rt-adm-lo-h">
        <h2 className="rt-acc__h2" id="rt-adm-lo-h">{d.accounts}</h2>
        {l.organisations.length ? (
          <ul className="rt-adm-list">
            {l.organisations.map((o) => (
              <li key={o.id}>
                <div><span className="rt-adm-strong">{o.name}</span><small>{d.orgTypes[o.type]} · {d.roles[o.role] ?? o.role}{o.jobTitle ? ` (${o.jobTitle})` : ""} · since {formatDate(o.joinedAt.slice(0, 10))}</small></div>
                <Pill tone={o.status === "active" ? "ok" : o.status === "suspended" || o.status === "rejected" ? "late" : "warn"}>{d.orgStatuses[o.status] ?? o.status}</Pill>
              </li>
            ))}
          </ul>
        ) : <p className="rt-acc__note">{d.noAccounts}</p>}
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-adm-la-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-adm-la-h">{d.activity}</h2>
          <Link href={`/admin/activity?q=${l.id}`} className="fb-textlink">{d.allActivity}</Link>
        </div>
        {activity.data?.entries.length ? (
          <ul className="rt-adm-list">
            {activity.data.entries.map((e) => (
              <li key={e.id}>
                <div>
                  <span className="rt-adm-strong">{A.activity.actions[e.action] ?? e.action}</span>
                  <small>{e.actor && e.actor.id !== l.id ? `By ${e.actor.name} · ` : ""}{formatWhen(Date.parse(e.at))}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : activity.isLoading ? null : <p className="rt-acc__note">{d.noActivity}</p>}
      </section>

      <p className="rt-acc__note rt-adm-help">{d.later}</p>

      {(can("export") || can("suspend")) && (
        <section className="rt-acc__card" aria-labelledby="rt-adm-pr-h">
          <h2 className="rt-acc__h2" id="rt-adm-pr-h">{d.privacy}</h2>
          <div className="rt-adm-privacy">
            {can("export") && (
              <div>
                <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={download} disabled={exporter.isPending}>{d.exportData}</button>
                <p className="rt-acc__note">{d.exportNote}</p>
              </div>
            )}
            {can("suspend") && (
              <div>
                {mine ? <p className="rt-acc__notice">{d.selfNote}</p> : l.admin ? <p className="rt-acc__notice">{d.adminNote}</p> : l.status === "blocked" ? (
                  <>
                    <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setSheet("unblock")}>{d.unblock}</button>
                    <p className="rt-acc__note">{d.unblockNote}</p>
                  </>
                ) : (
                  <>
                    <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setSheet("block")}>{d.block}</button>
                    <p className="rt-acc__note">{d.blockNote}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <BlockSheet learner={l} kind={sheet} onClose={() => setSheet(null)} onDone={changed} />
    </div>
  );
}

// Block (a reason is required) or unblock, then the record reads again.
function BlockSheet({ learner, kind, onClose, onDone }) {
  const block = api.admin.students.block.useMutation();
  const unblock = api.admin.students.unblock.useMutation();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [general, setGeneral] = useState("");
  const ref = useRef(null);
  const close = () => {
    setReason("");
    setError("");
    setGeneral("");
    onClose();
  };
  const blocking = kind === "block";
  const submit = async (e) => {
    e.preventDefault();
    setGeneral("");
    if (blocking && !reason.trim()) {
      setError("Enter why this account is being blocked.");
      return focusFirstError(ref.current);
    }
    setError("");
    try {
      if (blocking) await block.mutateAsync({ userId: learner.id, reason: reason.trim() });
      else await unblock.mutateAsync({ userId: learner.id });
      onDone(blocking ? d.blocked : d.unblocked);
      close();
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      if (fields.reason) {
        setError(fields.reason);
        focusFirstError(ref.current);
      } else setGeneral(g);
    }
  };
  return (
    <Sheet open={Boolean(kind)} onClose={close} title={`${blocking ? d.block : d.unblock}: ${learner.name}`} closeLabel="Close">
      {kind && (
        <form className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate ref={ref}>
          <p className="rt-acc__note">{blocking ? d.blockNote : d.unblockNote}</p>
          {blocking && (
            <div className="rt-field">
              <label htmlFor="rt-adm-block-reason">{d.blockReason}</label>
              <small className="rt-field__hint" id="rt-adm-block-reason-hint">{d.blockReasonHint}</small>
              {error && <p className="rt-q__err" id="rt-adm-block-reason-e"><span className="rt-sr">Error: </span>{error}</p>}
              <textarea id="rt-adm-block-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={`rt-adm-block-reason-hint${error ? " rt-adm-block-reason-e" : ""}`} />
            </div>
          )}
          {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={block.isPending || unblock.isPending}>{blocking ? d.block : d.unblock}</button>
        </form>
      )}
    </Sheet>
  );
}
