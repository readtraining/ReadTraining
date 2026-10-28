"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BasketSteps from "@/components/basket/BasketSteps";
import Toast from "@/components/courses/Toast";
import { ErrorState } from "@/components/states/States";
import { pw } from "@/data/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { useProviderAccess } from "@/lib/providerAccess";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import ProviderChecklist from "./ProviderChecklist";
import { Loading, Pill, formatWhen } from "./providerParts";
import { Counter, Field, aria } from "./settingsForm";

const copy = pw.review;
const REPLY_MAX = 1000;

// Account review (/provider/review): where the provider's account stands with our team, as Stripe's "Actions required" page is
// to its banner. The status and the progress (applied, review, changes, approved); when changes are asked for, our team's message,
// where in the workspace each thing is changed, and "send for review" with an optional note; when suspended, the reason; while
// waiting, the getting-started list. Then the history, newest first. The status bar on every other page links here, and so does
// the "changes needed" email.
export default function ProviderReview() {
  const { organisationId } = useProviderAccess();
  const query = api.provider.profile.review.useQuery({ organisationId }, { enabled: Boolean(organisationId) });
  const [toast, setToast] = useState(null);
  if (query.isError) return <ErrorState title="We couldn't load your account review." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  const r = query.data;
  if (!r) return <Loading rows={3} />;
  const s = copy.statuses[r.status] || copy.statuses.pending;
  const askedBefore = r.events.some((e) => e.kind === "changes");
  // the steps: Changes only shows when our team has asked for some (now or before)
  const steps = copy.steps.filter((x) => x !== "Changes" || askedBefore || r.status === "changes_requested");
  const at = { pending: 1, changes_requested: steps.indexOf("Changes"), active: steps.length }[r.status];

  return (
    <div className="rt-acc__stack rt-pws-rev">
      <section className="rt-acc__card rt-pws-rev__status" aria-labelledby="rt-pws-rev-h">
        <div className="rt-pws-rev__meta">
          <Pill tone={s.tone}>{s.pill}</Pill>
          {r.statusChangedAt && <span>{copy.updated} {formatWhen(Date.parse(r.statusChangedAt))}</span>}
        </div>
        <h2 className="rt-acc__h2" id="rt-pws-rev-h">{s.title}</h2>
        <p className="rt-acc__note">{s.text}</p>
        {at !== undefined && <BasketSteps steps={steps} current={at} label={copy.stepsLabel} />}
      </section>

      {r.status === "changes_requested" && <Changes review={r} onSent={(m) => setToast({ message: m })} />}

      {r.status === "suspended" && (
        <section className="rt-acc__card" aria-labelledby="rt-pws-rev-why">
          <h2 className="rt-acc__h2" id="rt-pws-rev-why">{copy.suspended.reason}</h2>
          {r.statusNote && <p className="rt-pws-rev__quote">{r.statusNote}</p>}
          <div><Link href={copy.suspended.contact.href} className="button -md -purple-1 text-white">{copy.suspended.contact.label}</Link></div>
        </section>
      )}

      {r.status === "pending" && <ProviderChecklist heading={2} />}

      <History events={r.events} />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

// What our team asked for, where each thing is changed, and sending the account back for review.
function Changes({ review, onSent }) {
  const { organisationId, can } = useProviderAccess();
  const router = useRouter();
  const utils = api.useUtils();
  const resubmit = api.organisations.resubmit.useMutation();
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef(null);
  const canSend = can("provider.profile.edit"); // the rule organisations.resubmit checks
  const c = copy.send;

  const send = (e) => {
    e.preventDefault();
    if (reply.length > REPLY_MAX) {
      setError(`Keep your note to ${REPLY_MAX.toLocaleString("en-GB")} characters or fewer.`);
      return focusFirstError(formRef.current);
    }
    setError("");
    resubmit.mutate(
      { organisationId, reply: reply.trim() || undefined },
      {
        onSuccess: () => {
          onSent(c.sent);
          utils.provider.profile.review.invalidate({ organisationId });
          router.refresh(); // the workspace's status (the bar, the sidebar) comes from the server
        },
        onError: (err) => {
          const { fields, general } = errorsFrom(err);
          setError(fields.reply || general);
          focusFirstError(formRef.current);
        },
      },
    );
  };

  return (
    <>
      <section className="rt-acc__card" aria-labelledby="rt-pws-rev-asked">
        <h2 className="rt-acc__h2" id="rt-pws-rev-asked">{copy.asked.title}</h2>
        {review.statusNote && <p className="rt-pws-rev__quote">{review.statusNote}</p>}
        <h3 className="rt-adm-h3">{copy.asked.where}</h3>
        <ul className="rt-pws-rev__places">
          {copy.places.map((x) => (
            <li key={x.href}><Link href={x.href}><span>{x.label}</span><i className="icon-arrow-right text-10" aria-hidden="true"></i></Link></li>
          ))}
        </ul>
      </section>

      <section className="rt-acc__card" aria-labelledby="rt-pws-rev-send">
        <h2 className="rt-acc__h2" id="rt-pws-rev-send">{c.title}</h2>
        {canSend ? (
          <form className="rt-q__form rt-pws-rev__form" onSubmit={send} noValidate ref={formRef}>
            <Field id="rt-pws-reply" label={c.reply} hint={c.hint} error={error} count={<Counter value={reply} max={REPLY_MAX} />}>
              <textarea {...aria("rt-pws-reply", error, true)} rows={4} maxLength={REPLY_MAX} autoComplete="off" value={reply} onChange={(e) => setReply(e.target.value)} />
            </Field>
            <div className="rt-pws-rev__foot">
              <button type="submit" className="button -md -purple-1 text-white" disabled={resubmit.isPending} aria-busy={resubmit.isPending || undefined}>{resubmit.isPending ? c.busy : c.button}</button>
              <p className="rt-acc__note">{c.after}</p>
            </div>
          </form>
        ) : <p className="rt-acc__note">{c.onlyManagers}</p>}
      </section>
    </>
  );
}

// Everything that has happened to the account, newest first: who did it (our team is never named), when, and any message.
function History({ events }) {
  const h = copy.history;
  return (
    <section className="rt-acc__card" aria-labelledby="rt-pws-rev-hist">
      <h2 className="rt-acc__h2" id="rt-pws-rev-hist">{h.title}</h2>
      {events.length ? (
        <ol className="rt-pws-rev__history">
          {events.map((e, i) => (
            <li key={`${e.at}-${i}`} className={`rt-pws-rev__event${e.fromTeam ? " -team" : ""}`}>
              <span className="rt-pws-rev__dot" aria-hidden="true"></span>
              <div>
                <p className="rt-pws-rev__what">{copy.events[e.kind]}{e.kind === "renamed" && e.from && e.to ? `: ${e.from} → ${e.to}` : ""}</p>
                <p className="rt-pws-rev__when"><time dateTime={e.at}>{formatWhen(Date.parse(e.at))}</time> · {e.fromTeam ? copy.team : e.by || "Your team"}</p>
                {e.message && <p className="rt-pws-rev__quote">{e.message}</p>}
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="rt-acc__note">{h.empty}</p>}
    </section>
  );
}
