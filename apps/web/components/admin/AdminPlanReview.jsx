"use client";

import React, { useEffect, useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { admin as A } from "@/data/admin";
import { api } from "@/lib/trpc/react";
import { refreshCourses } from "@/app/admin/actions";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { AdminTag } from "./AdminStatus";

const copy = A.approvals.plans;
const money = (pence) => formatPrice(pence / 100);

// One plan's packages, as a learner would see them (names, prices, features).
function Packages({ tiers, label }) {
  return (
    <section className="rt-adm-plan" aria-label={label}>
      <h3 className="rt-acc__h3">{label}</h3>
      <ul className={`rt-adm-plan__tiers -n${tiers.length}`}>
        {tiers.map((t) => (
          <li key={t.name} className={`rt-adm-plan__tier${t.popular ? " -popular" : ""}`}>
            <div className="rt-adm-plan__head">
              <strong>{t.name}</strong>
              {t.popular && <AdminTag>{copy.popular}</AdminTag>}
            </div>
            <p className="rt-adm-plan__price">
              {money(t.pricePence)}
              {t.savePence ? <small> · {copy.save} {money(t.savePence)} (was {money(t.pricePence + t.savePence)})</small> : null}
            </p>
            {t.tagline && <p className="rt-acc__note">{t.tagline}</p>}
            {t.features?.length ? (
              <ul className="rt-adm-plan__features">
                {t.features.map((f, i) => (
                  <li key={i} className={f.included ? "-yes" : "-no"}>
                    <i className={`icon-${f.included ? "check" : "close"}`} aria-hidden="true"></i>
                    <span>
                      <span className="rt-sr">{f.included ? "Included: " : "Not included: "}</span>
                      {f.title}
                      {f.description && <small>{f.description}</small>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rt-acc__note">{copy.noFeatures}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// A provider's price plan as our team checks it (API admin.plans.get): the packages waiting for a decision and, for a change to an
// approved plan, the ones learners see now, each with its price, "Save £", tagline, Most popular and features (✓ included, ✗ not);
// how many dates and courses use the plan. Approve makes the waiting packages live (the dates and courses on the plan take the
// cheapest as their price); Ask for changes needs a note the provider sees. Deciding on a plan you sent yourself needs a reason
// and is only for a sole approver (the API checks it again). `planId`: the plan to show, or null when closed.
export default function AdminPlanReview({ planId, canDecide, onClose, onDecided }) {
  const query = api.admin.plans.get.useQuery({ planId }, { enabled: Boolean(planId) });
  const decide = api.admin.plans.decide.useMutation();
  const [asking, setAsking] = useState(false); // the "Ask for changes" note is showing
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  useEffect(() => {
    setAsking(false);
    setMessage("");
    setReason("");
    setErrors({});
  }, [planId]);

  const p = query.data;
  const waiting = p?.status === "pending" && p.draft;
  const ownBlocked = p?.own && !p.soleApprover;
  const run = (decision) => {
    const errs = {};
    if (decision === "changes" && !message.trim()) errs.message = copy.messageMissing;
    if (p.own && reason.trim().length < 10) errs.ownReason = copy.reasonMissing;
    setErrors(errs);
    if (Object.keys(errs).length) return requestAnimationFrame(() => focusFirstError(formRef.current));
    decide.mutate(
      { planId: p.id, decision, message: decision === "changes" ? message.trim() : undefined, ownReason: p.own ? reason.trim() : undefined, seen: p.version },
      {
        onSuccess: (r) => {
          // an approval moves the prices of the dates and courses on the plan: the public pages catch up at once
          if (decision === "approve") refreshCourses().catch(() => {});
          // and whether the provider was told by email (as for courses)
          const told = r.outbox ? A.approvals.emailOutbox : r.emailed ? A.approvals.emailed : A.approvals.notEmailed;
          onDecided(`${decision === "approve" ? copy.approved : copy.sentBack}: ${p.name} (${p.provider.name}). ${told}`);
        },
        onError: (e) => {
          const { fields, general } = errorsFrom(e);
          setErrors({ ...fields, general: fields.message || fields.ownReason ? "" : general || "That didn’t work. Reload the page and try again." });
          requestAnimationFrame(() => focusFirstError(formRef.current));
        },
      },
    );
  };
  const used = p ? [p.used.dates ? `${p.used.dates} upcoming ${p.used.dates === 1 ? "date" : "dates"}` : "", p.used.courses ? `${p.used.courses} self-paced ${p.used.courses === 1 ? "course" : "courses"}` : ""].filter(Boolean).join(" and ") : "";

  return (
    <Sheet open={Boolean(planId)} onClose={onClose} title={p ? `${copy.title}: ${p.name}` : copy.title} closeLabel="Close" className="rt-adm-plansheet">
      {query.isError ? (
        <p className="rt-acc__notice -warn" role="alert">{errorsFrom(query.error).general || "We couldn't load this plan. Reload the page and try again."}</p>
      ) : !p ? (
        <p className="rt-acc__note">Loading…</p>
      ) : (
        <form className="rt-q__form rt-biz__sheetform" noValidate ref={formRef} onSubmit={(e) => e.preventDefault()}>
          <p className="rt-acc__note">
            {p.provider.name} · {p.tiers ? copy.change : copy.new} · {used ? `${copy.usedBy} ${used}` : copy.notUsed}
          </p>
          {errors.general && <p className="rt-acc__notice -warn" role="alert">{errors.general}</p>}
          {!waiting && <p className="rt-acc__notice">{p.status === "changes" ? copy.alreadySentBack : copy.nothingWaiting}</p>}
          {p.statusNote && p.status === "changes" && <p className="rt-adm-item__reason"><strong>{copy.noteSent}</strong> {p.statusNote}</p>}

          {waiting && <Packages tiers={p.draft} label={p.tiers ? copy.waitingChange : copy.waitingNew} />}
          {p.tiers && <Packages tiers={p.tiers} label={copy.live} />}

          {waiting && canDecide && ownBlocked && <p className="rt-adm-item__reason">{A.approvals.ownBlocked}</p>}
          {waiting && canDecide && !ownBlocked && (
            <>
              {p.own && (
                <div className="rt-field">
                  <label htmlFor="rt-adm-plan-own">{copy.reasonLabel}</label>
                  <p className="rt-acc__note">{A.approvals.ownSole}</p>
                  {errors.ownReason && <p className="rt-q__err" id="rt-adm-plan-own-e"><span className="rt-sr">Error: </span>{errors.ownReason}</p>}
                  <textarea id="rt-adm-plan-own" rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, ownReason: undefined })); }}
                    aria-invalid={errors.ownReason ? true : undefined} aria-describedby={errors.ownReason ? "rt-adm-plan-own-e" : undefined} />
                </div>
              )}
              {asking && (
                <div className="rt-field">
                  <label htmlFor="rt-adm-plan-msg">{copy.messageLabel}</label>
                  {errors.message && <p className="rt-q__err" id="rt-adm-plan-msg-e"><span className="rt-sr">Error: </span>{errors.message}</p>}
                  <textarea id="rt-adm-plan-msg" rows={4} maxLength={2000} value={message} onChange={(e) => { setMessage(e.target.value); setErrors((x) => ({ ...x, message: undefined })); }}
                    aria-invalid={errors.message ? true : undefined} aria-describedby={errors.message ? "rt-adm-plan-msg-e" : undefined} />
                </div>
              )}
              <div className="rt-pws-set__actions">
                {asking ? (
                  <>
                    <button type="button" className="button -md -purple-1 text-white" disabled={decide.isPending} aria-busy={decide.isPending || undefined} onClick={() => run("changes")}>{copy.sendBack}</button>
                    <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => { setAsking(false); setErrors({}); }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="button -md -purple-1 text-white" disabled={decide.isPending} aria-busy={decide.isPending || undefined} onClick={() => run("approve")}>{p.tiers ? A.approvals.approveChange : A.approvals.approve}</button>
                    <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => { setAsking(true); setErrors({}); requestAnimationFrame(() => document.getElementById("rt-adm-plan-msg")?.focus()); }}>{A.approvals.requestChanges}</button>
                  </>
                )}
              </div>
            </>
          )}
        </form>
      )}
    </Sheet>
  );
}
