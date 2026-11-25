"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sheet from "@/components/testPrep/runner/Sheet";
import { ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatDate } from "@/lib/format";
import { api } from "@/lib/trpc/react";
import { errorsFrom, errorText } from "@/lib/useMe";
import { formatWhen, Said, DetailSkeleton, Empty, actionLabel, PageLink, RowMenu, Req } from "./adminParts";
import { RateForm, formatRate } from "./commissionParts";
import { AdminStatus } from "./AdminStatus";
import { waysLabel } from "@/lib/courseModes";
import TextArea from "@/components/forms/TextArea";
import FormattedText from "@/components/forms/FormattedText";

const copy = A.providers;
const d = copy.detail;
const roles = A.learners.detail.roles;
// the decisions each status allows, in the order the buttons show
const NEXT = { pending: ["approve", "changes", "reject"], changes_requested: ["approve", "reject"], active: ["suspend"], suspended: ["reinstate"], rejected: [] };
const SWITCH = { approve: "approve", changes: "approve", reject: "approve", suspend: "suspend", reinstate: "suspend" };
const PRIMARY = new Set(["approve", "reinstate"]);
export const DANGER = new Set(["reject", "suspend"]);

// The decisions an admin can make on a provider now (this page and the Providers list's row menu): its status's next steps
// that the admin's switches allow, without approval decisions on an account they opened themselves unless they are the only
// approver (`ownRequest`, `soleApprover`).
// Whether the admin can delete this provider: only one that wasn't approved (rejected), with the approve switch; the API also
// refuses one holding records (orders, payouts, reviews...).
export const canDelete = (p, me) => p.status === "rejected" && Boolean(me?.permissions?.includes("approve"));

export function decisionsFor(p, me) {
  const allowed = NEXT[p.status].filter((k) => me?.permissions?.includes(SWITCH[k]));
  return p.ownRequest && !p.soleApprover ? allowed.filter((k) => SWITCH[k] !== "approve") : allowed;
}

// One provider (API admin.providers.get): its status and the decisions it allows (approve, ask for changes, don't approve,
// suspend, reinstate; each confirmed in a pop-up, with a message where the provider needs one), why it has its status, its
// details, team and courses (each opening its admin page), its commission (its own rate or the platform default; changed with the "fees and commission" switch), and
// its activity. An admin doesn't decide on a provider account they opened themselves, unless no other admin can: a Full admin
// then decides with a reason, recorded as their own request (soleApprover, API lib/soleApprover.mts).
export default function AdminProvider({ slug }) {
  const me = useAdminAccess();
  const utils = api.useUtils();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const record = api.admin.providers.get.useQuery({ slug }, { retry: (n, e) => e?.data?.code !== "NOT_FOUND" && n < 2 });
  const activity = api.admin.activity.list.useQuery({ q: record.data?.id ?? "", limit: 8 }, { enabled: Boolean(record.data?.id) });
  const [deciding, setDeciding] = useState(null);
  const [said, setSaid] = useState("");
  const [warning, setWarning] = useState("");
  const [refreshing, setRefreshing] = useState(false); // a decision was saved: no buttons until the new status has loaded

  if (record.isLoading) return <DetailSkeleton />;
  if (record.error?.data?.code === "NOT_FOUND") return <Empty kind="missing" title={d.notFound} action={{ href: "/admin/providers", label: d.back }} />;
  if (record.error) return <ErrorState onRetry={() => record.refetch()} />;
  const p = record.data;
  const decisions = decisionsFor(p, me);
  // why an approver sees no decision on an application waiting here: they opened this provider account themselves (another admin
  // decides it); the sole approver gets the buttons, and the pop-up asks for the reason
  const blockedNote = (p.status === "pending" || p.status === "changes_requested") && !decisions.length && p.ownRequest && me?.permissions?.includes("approve") ? d.ownRequest : "";
  // the new status shows at once (from the decision's own answer), with the message the admin wrote, and says so; the record then
  // loads again in the background for the rest (its dates, the activity), the buttons waiting for it
  const decided = async (decision, { status, message, emailed, outbox }) => {
    utils.admin.providers.get.setData({ slug }, (old) => (old ? { ...old, status, statusNote: message || null, statusChangedAt: new Date().toISOString() } : old));
    setSaid(outbox ? `${d.done[decision]}. ${d.emailOutbox}` : d.done[decision]);
    setWarning(emailed || outbox ? "" : d.notEmailed);
    setRefreshing(true);
    utils.admin.activity.list.invalidate();
    await utils.admin.providers.invalidate().catch(() => {});
    setRefreshing(false);
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
          {!refreshing && decisions.map((k) => (
            <button key={k} type="button" className={PRIMARY.has(k) ? "button -md -purple-1 text-white" : DANGER.has(k) ? "button -md -outline-red-3 text-red-3" : "button -md -outline-purple-1 text-purple-1"} onClick={() => setDeciding(k)}>{d.actions[k]}</button>
          ))}
          {(p.status === "active" || p.status === "suspended") && d.edit.items.some((x) => x.needs.some((s) => me?.permissions?.includes(s))) && (
            <RowMenu label={`Edit ${p.name}`} trigger={<span aria-hidden="true">{d.edit.label}</span>} triggerClass="button -md -outline-purple-1 text-purple-1"
              items={d.edit.items.filter((x) => x.needs.some((s) => me?.permissions?.includes(s))).map((x) => ({ label: x.label, href: `/admin/providers/${p.slug}/${x.path}` }))} />
          )}
          {canDelete(p, me) && (
            <button type="button" className="button -md -outline-red-3 text-red-3" onClick={() => setDeleting(true)}>{d.remove.action}</button>
          )}
          {blockedNote && <p className="rt-adm-item__hint">{blockedNote}</p>}
          {p.status === "active" && <Link href={`/providers/${p.slug}`} className="button -md -outline-purple-1 text-purple-1" target="_blank">{d.publicProfile}<i className="icon-arrow-top-right text-12 rt-adm-ml" aria-hidden="true"></i></Link>}
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

      <div className="rt-adm-detail">
        <div className="rt-adm-detail__main">
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

          <ProfileCard profile={p.profile} name={p.name} />

          <section className="rt-acc__card" aria-labelledby="rt-adm-pt-h">
            <h2 className="rt-acc__h2" id="rt-adm-pt-h">{d.team}</h2>
            {p.team.length ? (
              <ul className="rt-adm-list">
                {p.team.map((m) => (
                  <li key={m.userId}>
                    <div><PageLink href={`/admin/learners/${m.userId}`} className="rt-adm-strong">{m.name}</PageLink><small>{m.email} · {roles[m.role] ?? m.role}</small></div>
                    {m.status !== "active" && <AdminStatus kind="provider" status="invited">Invited</AdminStatus>}
                  </li>
                ))}
              </ul>
            ) : <Empty inCard icon="team" title="No team members yet" text="People this provider adds to its team show here." />}
          </section>

          <section className="rt-acc__card" aria-labelledby="rt-adm-pcs-h">
            <div className="rt-acc__cardhead">
              <h2 className="rt-acc__h2" id="rt-adm-pcs-h">{d.courses}</h2>
              {p.courseCount > p.courses.length && <PageLink href={`/admin/catalogue?kind=provider&q=${encodeURIComponent(p.name)}`} className="fb-textlink">{d.coursesAll(p.courseCount)}</PageLink>}
            </div>
            {p.courses.length ? (
              <ul className="rt-adm-list">
                {p.courses.map((c) => (
                  <li key={c.id}>
                    <div><PageLink href={`/admin/catalogue/${c.id}`} className="rt-adm-strong">{c.title}</PageLink><small>Number {c.id}{waysLabel(c) ? ` · ${waysLabel(c)}` : ""}</small></div>
                    <span className="rt-adm-cellrow">
                      {c.pendingChange && <AdminStatus kind="course" status="pending">{A.catalogue.detail.change}</AdminStatus>}
                      <AdminStatus kind="course" status={c.status}>{A.catalogue.statuses[c.status]}</AdminStatus>
                    </span>
                  </li>
                ))}
              </ul>
            ) : <Empty inCard icon="catalogue" title="No courses yet" text={d.coursesNone} />}
          </section>
        </div>
        <aside className="rt-adm-detail__side">
          <CommissionCard provider={p} canChange={me?.permissions?.includes("finance.settings")} onSaved={(text) => { setSaid(text); utils.admin.providers.invalidate(); utils.admin.commission.invalidate(); utils.admin.activity.list.invalidate(); }} />
        </aside>
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
                  <span className="rt-adm-strong">{actionLabel(e.action)}</span>
                  <small>{e.actor ? `${e.actor.name} · ` : ""}{formatWhen(Date.parse(e.at))}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : activity.isLoading ? null : <p className="rt-acc__note">{d.noActivity}</p>}
      </section>


      <DecisionSheet provider={p} decision={deciding} onClose={() => setDeciding(null)} onDone={decided} />
      <DeleteProviderSheet provider={deleting ? p : null} onClose={() => setDeleting(false)} onDone={() => { utils.admin.providers.invalidate().catch(() => {}); router.replace("/admin/providers?tab=rejected"); }} />
    </div>
  );
}

// Delete a provider that wasn't approved: what goes, then the button. The API checks it again and refuses one with records to
// keep (said here).
export function DeleteProviderSheet({ provider, onClose, onDone }) {
  const remove = api.admin.providers.remove.useMutation();
  const utils = api.useUtils();
  const r = d.remove;
  const [general, setGeneral] = useState("");
  const close = () => {
    setGeneral("");
    onClose();
  };
  const submit = async () => {
    setGeneral("");
    try {
      const res = await remove.mutateAsync({ organisationId: provider.id });
      utils.admin.activity.list.invalidate();
      close();
      onDone(res);
    } catch (err) {
      setGeneral(errorText(err));
    }
  };
  return (
    <Sheet open={Boolean(provider)} onClose={close} title={r.title} closeLabel="Close">
      {provider && (
        <div className="rt-q__form rt-biz__sheetform">
          <p className="rt-acc__note"><strong>{provider.name}</strong></p>
          <p className="rt-acc__note">{r.text}</p>
          {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
          <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={submit} disabled={remove.isPending}>{r.button}</button>
        </div>
      )}
    </Sheet>
  );
}

// What learners will see about the provider: its logo, headline, town and links, its biography, and the terms shown before
// booking (bold and bullet lists as on the public profile), so an application is decided on what goes public.
function ProfileCard({ profile: pr, name }) {
  const t = d.profile;
  const links = Object.entries(t.socials).filter(([k]) => pr.socials?.[k]);
  const block = (text, empty) => (text ? <FormattedText text={text} pClass="rt-adm-provider__note" ulClass="rt-adm-provider__note rt-adm-provider__list" /> : <p className="rt-adm-muted">{empty}</p>);
  return (
    <section className="rt-acc__card" aria-labelledby="rt-adm-pp-h">
      <h2 className="rt-acc__h2" id="rt-adm-pp-h">{t.title}</h2>
      <p className="rt-acc__note">{t.lead}</p>
      <div className="rt-adm-provider__head">
        {pr.logoUrl ? <img src={pr.logoUrl} alt={`${name} logo`} className="rt-adm-provider__logo" /> : <span className="rt-adm-provider__logo -none" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>}
        <div>
          <b>{pr.headline || <span className="rt-adm-muted">{t.noHeadline}</span>}</b>
          {(pr.city || links.length > 0) && (
            <small>
              {pr.city}
              {pr.city && links.length > 0 && " · "}
              {links.map(([k, label], i) => <React.Fragment key={k}>{i > 0 && " · "}<a href={pr.socials[k]} target="_blank" rel="noopener noreferrer" className="rt-cd__link">{label}</a></React.Fragment>)}
            </small>
          )}
        </div>
      </div>
      <h3 className="rt-adm-h3">{t.bio}</h3>
      {block(pr.bio, t.noBio)}
      <h3 className="rt-adm-h3">{t.policy}</h3>
      {block(pr.cancellationPolicy, t.noPolicy)}
      <h3 className="rt-adm-h3">{t.terms}</h3>
      {block(pr.bookingTerms, t.noTerms)}
    </section>
  );
}

// The provider's commission: its rate, whether that's its own or the platform default, and (with the switch) the field to
// change it and "Use the platform default".
function CommissionCard({ provider: p, canChange, onSaved }) {
  const utils = api.useUtils();
  // the new rate shows at once, before the provider loads again
  const save = api.admin.providers.setCommission.useMutation({
    onSuccess: (_, { bps }) => utils.admin.providers.get.setData({ slug: p.slug }, (old) => (old ? { ...old, commissionBps: bps } : old)),
  });
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
          <RateForm id="rt-adm-pcom" label={<>{d.commissionLabel}<Req /></>} hint={d.commissionHint.replace("{rate}", def)} bps={rate} saving={save.isPending} save={(bps) => save.mutateAsync({ organisationId: p.id, bps })} onSaved={() => onSaved(d.commissionSaved)} />
          {own && <button type="button" className="rt-cd__link rt-adm-mt" onClick={async () => { await save.mutateAsync({ organisationId: p.id, bps: null }); onSaved(d.commissionSaved); }} disabled={save.isPending}>{d.useDefault}</button>}
        </>
      ) : null}
    </section>
  );
}

// The pop-up for one decision: what happens, a message when the provider needs one (required), then the button. From the
// Providers list (`provider.owner` given), an application's decision also shows who applied, with its full application a link away.
export function DecisionSheet({ provider, decision, onClose, onDone }) {
  const decide = api.admin.providers.decide.useMutation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  // their own provider account (as the only admin who can decide it): a reason is needed
  const own = Boolean(decision && provider.ownRequest && SWITCH[decision] === "approve");
  const [general, setGeneral] = useState("");
  const ref = useRef(null);
  const close = () => {
    setMessage("");
    setError("");
    setReason("");
    setReasonError("");
    setGeneral("");
    onClose();
  };
  const sheet = decision ? d.sheets[decision] : null;
  const submit = async (e) => {
    e.preventDefault();
    setGeneral("");
    const msgError = sheet.label && !message.trim() ? (decision === "changes" ? "Enter what the provider needs to change." : decision === "reject" ? "Enter why the provider is not approved." : "Enter why the provider is suspended.") : "";
    const ownError = own && reason.trim().length < 10 ? A.own.error : "";
    setError(msgError);
    setReasonError(ownError);
    if (msgError || ownError) return focusFirstError(ref.current);
    try {
      const res = await decide.mutateAsync({ organisationId: provider.id, decision, message: sheet.label ? message.trim() : undefined, ownReason: own ? reason.trim() : undefined });
      onDone(decision, { ...res, message: sheet.label ? message.trim() : "" });
      close();
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      if (fields.message || (own && fields.ownReason)) {
        setError(fields.message || "");
        setReasonError(fields.ownReason || "");
        focusFirstError(ref.current);
      } else setGeneral(g || Object.values(fields)[0]);
    }
  };
  return (
    <Sheet open={Boolean(decision)} onClose={close} title={sheet?.title ?? ""} closeLabel="Close">
      {sheet && (
        <form className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate ref={ref}>
          <p className="rt-acc__note"><strong>{provider.name}</strong></p>
          {provider.owner && SWITCH[decision] === "approve" && (
            <p className="rt-acc__note">
              {provider.owner.name} · {provider.owner.email} · signed up {formatWhen(Date.parse(provider.appliedAt))}<br />
              <Link href={`/admin/providers/${provider.slug}`} className="rt-cd__link" target="_blank" rel="noopener noreferrer">{d.fullApplication}<i className="icon-arrow-top-right text-12 rt-adm-ml" aria-hidden="true"></i></Link>
            </p>
          )}
          <p className="rt-acc__note">{sheet.text}</p>
          {sheet.label && (
            <div className="rt-field">
              <label htmlFor="rt-adm-pmsg">{sheet.label}<Req /></label>
              <small className="rt-field__hint" id="rt-adm-pmsg-hint">{sheet.hint}</small>
              {error && <p className="rt-q__err" id="rt-adm-pmsg-e"><span className="rt-sr">Error: </span>{error}</p>}
              <TextArea id="rt-adm-pmsg" rows={4} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={`rt-adm-pmsg-hint${error ? " rt-adm-pmsg-e" : ""}`} />
            </div>
          )}
          {own && (
            <div className="rt-field">
              <label htmlFor="rt-adm-pown">{A.own.label}<Req /></label>
              <small className="rt-field__hint" id="rt-adm-pown-hint">{A.own.hint}</small>
              {reasonError && <p className="rt-q__err" id="rt-adm-pown-e"><span className="rt-sr">Error: </span>{reasonError}</p>}
              <TextArea id="rt-adm-pown" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={reasonError ? true : undefined} aria-describedby={`rt-adm-pown-hint${reasonError ? " rt-adm-pown-e" : ""}`} />
            </div>
          )}
          {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={decide.isPending}>{sheet.button}</button>
        </form>
      )}
    </Sheet>
  );
}
