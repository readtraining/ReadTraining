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
import { formatWhen, Said, DetailSkeleton } from "./adminParts";
import { RateForm, formatRate } from "./commissionParts";
import { AdminStatus } from "./AdminStatus";

const copy = A.providers;
const d = copy.detail;
const roles = A.learners.detail.roles;
// the decisions each status allows, in the order the buttons show
const NEXT = { pending: ["approve", "changes", "reject"], changes_requested: ["approve", "reject"], active: ["suspend"], suspended: ["reinstate"], rejected: [] };
const SWITCH = { approve: "approve", changes: "approve", reject: "approve", suspend: "suspend", reinstate: "suspend" };
const PRIMARY = new Set(["approve", "reinstate"]);
const DANGER = new Set(["reject", "suspend"]);

// One provider (API admin.providers.get): its status and the decisions it allows (approve, ask for changes, don't approve,
// suspend, reinstate; each confirmed in a pop-up, with a message where the provider needs one), why it has its status, its
// details and team, its commission (its own rate or the platform default; changed with the "fees and commission" switch), and
// its activity. An admin never decides on a provider account they opened themselves.
export default function AdminProvider({ slug }) {
  const me = useAdminAccess();
  const utils = api.useUtils();
  const record = api.admin.providers.get.useQuery({ slug }, { retry: (n, e) => e?.data?.code !== "NOT_FOUND" && n < 2 });
  const activity = api.admin.activity.list.useQuery({ q: record.data?.id ?? "", limit: 8 }, { enabled: Boolean(record.data?.id) });
  const [deciding, setDeciding] = useState(null);
  const [said, setSaid] = useState("");
  const [warning, setWarning] = useState("");

  if (record.isLoading) return <DetailSkeleton />;
  if (record.error?.data?.code === "NOT_FOUND") return <EmptyState title={d.notFound} action={{ href: "/admin/providers", label: d.back }} />;
  if (record.error) return <ErrorState onRetry={() => record.refetch()} />;
  const p = record.data;
  const allowed = NEXT[p.status].filter((k) => me?.permissions?.includes(SWITCH[k]));
  const decisions = p.ownRequest ? allowed.filter((k) => SWITCH[k] !== "approve") : allowed;
  const blockedNote = NEXT[p.status].length && !decisions.length ? (p.ownRequest && NEXT[p.status].some((k) => SWITCH[k] === "approve") ? d.ownRequest : d.noSwitch) : "";
  const decided = (decision, emailed) => {
    setSaid(d.done[decision]);
    setWarning(emailed ? "" : d.notEmailed);
    utils.admin.providers.invalidate();
    utils.admin.activity.list.invalidate();
  };
  const f = d.fields;
  const lastReply = p.status === "pending" && activity.data?.entries.find((e) => e.action === "provider.resubmitted");

  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      {warning && <p className="rt-adm-item__block" role="alert">{warning}</p>}

      <section className="rt-acc__card rt-adm-hero" aria-label="Status">
        <div>
          <div className="rt-adm-item__top"><AdminStatus kind="provider" status={p.status}>{copy.statuses[p.status]}</AdminStatus></div>
          <h1 className="rt-adm__h1 rt-adm-hero__name">{p.name}</h1>
          <p className="rt-acc__note">Signed up {formatWhen(Date.parse(p.appliedAt))}{p.statusChangedAt ? ` · status changed ${formatWhen(Date.parse(p.statusChangedAt))}` : ""}</p>
        </div>
        <div className="rt-adm-hero__actions">
          {decisions.map((k) => (
            <button key={k} type="button" className={PRIMARY.has(k) ? "button -sm -purple-1 text-white" : DANGER.has(k) ? "rt-cd__link rt-adm-danger" : "button -sm -outline-purple-1 text-purple-1"} onClick={() => setDeciding(k)}>{d.actions[k]}</button>
          ))}
          {blockedNote && <p className="rt-acc__notice">{blockedNote}</p>}
          {!["rejected", "suspended"].includes(p.status) && <Link href={`/providers/${p.slug}`} className="fb-textlink">{d.publicProfile}<i className="icon-arrow-top-right text-12" aria-hidden="true"></i></Link>}
        </div>
      </section>

      {p.statusNote && d.noteFor[p.status] && (
        <section className="rt-acc__card" aria-labelledby="rt-adm-pn-h">
          <h2 className="rt-acc__h2" id="rt-adm-pn-h">{d.noteFor[p.status]}</h2>
          <p className="rt-adm-provider__note">{p.statusNote}</p>
        </section>
      )}
      {lastReply && (
        <section className="rt-acc__card" aria-labelledby="rt-adm-pr-h">
          <h2 className="rt-acc__h2" id="rt-adm-pr-h">{d.waiting}</h2>
          {lastReply.metadata.reply && <p className="rt-adm-provider__note">{lastReply.metadata.reply}</p>}
          <p className="rt-acc__note">{lastReply.actor?.name} · {formatWhen(Date.parse(lastReply.at))}</p>
        </section>
      )}

      <div className="rt-adm-grid2">
        <section className="rt-acc__card" aria-labelledby="rt-adm-pd-h">
          <h2 className="rt-acc__h2" id="rt-adm-pd-h">{d.details}</h2>
          <dl className="rt-adm-dl">
            <div><dt>{f.name}</dt><dd>{p.name}</dd></div>
            <div><dt>{f.address}</dt><dd>/providers/{p.slug}</dd></div>
            <div><dt>{f.phone}</dt><dd>{p.mobile || <span className="rt-adm-muted">–</span>}</dd></div>
            <div><dt>{f.terms}</dt><dd>{p.termsAcceptedAt ? d.termsAccepted.replace("{v}", p.termsVersion || "").replace("{date}", formatDate(p.termsAcceptedAt.slice(0, 10))) : <span className="rt-adm-muted">{d.termsMissing}</span>}</dd></div>
            <div><dt>{f.applied}</dt><dd>{formatWhen(Date.parse(p.appliedAt))}</dd></div>
          </dl>
        </section>

        <CommissionCard provider={p} canChange={me?.permissions?.includes("finance.settings")} onSaved={(text) => { setSaid(text); utils.admin.providers.invalidate(); utils.admin.commission.invalidate(); utils.admin.activity.list.invalidate(); }} />

        <section className="rt-acc__card" aria-labelledby="rt-adm-pt-h">
          <h2 className="rt-acc__h2" id="rt-adm-pt-h">{d.team}</h2>
          <ul className="rt-adm-list">
            {p.team.map((m) => (
              <li key={m.userId}>
                <div><Link href={`/admin/learners/${m.userId}`} className="rt-adm-strong">{m.name}</Link><small>{m.email} · {roles[m.role] ?? m.role}</small></div>
                {m.status !== "active" && <AdminStatus kind="provider" status="invited">Invited</AdminStatus>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rt-acc__card" aria-labelledby="rt-adm-pa-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-adm-pa-h">{d.activity}</h2>
          <Link href={`/admin/activity?q=${p.id}`} className="fb-textlink">{d.allActivity}</Link>
        </div>
        {activity.data?.entries.length ? (
          <ul className="rt-adm-list">
            {activity.data.entries.map((e) => (
              <li key={e.id}>
                <div>
                  <span className="rt-adm-strong">{A.activity.actions[e.action] ?? e.action}</span>
                  <small>{e.actor ? `${e.actor.name} · ` : ""}{formatWhen(Date.parse(e.at))}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : activity.isLoading ? null : <p className="rt-acc__note">{d.noActivity}</p>}
      </section>

      <p className="rt-acc__note rt-adm-help">{d.later}</p>

      <DecisionSheet provider={p} decision={deciding} onClose={() => setDeciding(null)} onDone={decided} />
    </div>
  );
}

// The provider's commission: its rate, whether that's its own or the platform default, and (with the switch) the field to
// change it and "Use the platform default".
function CommissionCard({ provider: p, canChange, onSaved }) {
  const save = api.admin.providers.setCommission.useMutation();
  const def = formatRate(p.defaultCommissionBps);
  const rate = p.commissionBps ?? p.defaultCommissionBps;
  const own = p.commissionBps !== null;
  return (
    <section className="rt-acc__card" aria-labelledby="rt-adm-pc-h">
      <div className="rt-acc__cardhead">
        <h2 className="rt-acc__h2" id="rt-adm-pc-h">{d.commission}</h2>
        <strong className="rt-adm-price">{formatRate(rate)}</strong>
      </div>
      <p className="rt-acc__note">{(own ? d.hasOwn : d.usesDefault).replace("{rate}", def)}</p>
      {canChange ? (
        <>
          <RateForm id="rt-adm-pcom" label={d.commissionLabel} hint={d.commissionHint.replace("{rate}", def)} bps={rate} saving={save.isPending} save={(bps) => save.mutateAsync({ organisationId: p.id, bps })} onSaved={() => onSaved(d.commissionSaved)} />
          {own && <button type="button" className="rt-cd__link rt-adm-mt" onClick={async () => { await save.mutateAsync({ organisationId: p.id, bps: null }); onSaved(d.commissionSaved); }} disabled={save.isPending}>{d.useDefault}</button>}
        </>
      ) : <p className="rt-acc__notice rt-adm-mt">{d.commissionReadOnly}</p>}
    </section>
  );
}

// The pop-up for one decision: what happens, a message when the provider needs one (required), then the button.
function DecisionSheet({ provider, decision, onClose, onDone }) {
  const decide = api.admin.providers.decide.useMutation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [general, setGeneral] = useState("");
  const ref = useRef(null);
  const close = () => {
    setMessage("");
    setError("");
    setGeneral("");
    onClose();
  };
  const sheet = decision ? d.sheets[decision] : null;
  const submit = async (e) => {
    e.preventDefault();
    setGeneral("");
    if (sheet.label && !message.trim()) {
      setError(decision === "changes" ? "Enter what the provider needs to change." : decision === "reject" ? "Enter why the provider is not approved." : "Enter why the provider is suspended.");
      return focusFirstError(ref.current);
    }
    setError("");
    try {
      const res = await decide.mutateAsync({ organisationId: provider.id, decision, message: sheet.label ? message.trim() : undefined });
      onDone(decision, res.emailed);
      close();
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      if (fields.message) {
        setError(fields.message);
        focusFirstError(ref.current);
      } else setGeneral(g);
    }
  };
  return (
    <Sheet open={Boolean(decision)} onClose={close} title={sheet?.title ?? ""} closeLabel="Close">
      {sheet && (
        <form className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate ref={ref}>
          <p className="rt-acc__note"><strong>{provider.name}</strong></p>
          <p className="rt-acc__note">{sheet.text}</p>
          {sheet.label && (
            <div className="rt-field">
              <label htmlFor="rt-adm-pmsg">{sheet.label}</label>
              <small className="rt-field__hint" id="rt-adm-pmsg-hint">{sheet.hint}</small>
              {error && <p className="rt-q__err" id="rt-adm-pmsg-e"><span className="rt-sr">Error: </span>{error}</p>}
              <textarea id="rt-adm-pmsg" rows={4} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={`rt-adm-pmsg-hint${error ? " rt-adm-pmsg-e" : ""}`} />
            </div>
          )}
          {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={decide.isPending}>{sheet.button}</button>
        </form>
      )}
    </Sheet>
  );
}
