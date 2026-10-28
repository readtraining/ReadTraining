"use client";

import React from "react";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { useWorkspace } from "@/lib/workspaceContext";

const copy = pw.checklist;
// who can do each step (the shared permission table), so a step's link shows only to someone who can follow it
const NEEDS = { approved: "provider.profile.edit", profile: "provider.profile.edit", policy: "provider.terms.edit", course: "provider.courses.edit", date: "provider.cohorts.edit" };

// Getting set up to sell (Hurak's provider checklist, in our design): approval, the public profile, the cancellation policy, a
// first course and a first date, each worked out from the real records, with how many are done. Shown on the dashboard to the
// people who set the account up (and on the Account review page while waiting), until every step is done. `heading` picks the
// heading level for where it sits.
export default function ProviderChecklist({ heading = 2 }) {
  const workspace = useWorkspace();
  const { organisationId, can } = useProviderAccess();
  const shown = can("provider.profile.edit") || can("provider.courses.edit");
  const on = { enabled: Boolean(organisationId) && shown };
  const profile = api.provider.profile.get.useQuery({ organisationId }, on);
  const courses = api.provider.courses.list.useQuery({ organisationId }, { enabled: on.enabled && can("provider.courses.view") });
  const dates = api.provider.cohorts.list.useQuery({ organisationId, when: "all" }, { enabled: on.enabled && can("provider.cohorts.view") });
  if (!shown) return null;
  if (!profile.data || courses.isLoading || dates.isLoading) {
    return profile.isError ? null : <span className="rt-pws-skel__block -check" aria-hidden="true"></span>;
  }

  const p = profile.data;
  const list = courses.data || [];
  const status = workspace?.status;
  const done = {
    approved: status === "active",
    profile: Boolean(p.headline && p.bio && p.logoUrl),
    policy: Boolean(p.cancellationPolicy),
    course: list.length > 0,
    date: (dates.data || []).length > 0 || list.some((c) => c.method === "self-paced"),
  };
  const keys = Object.keys(copy.steps);
  const count = keys.filter((k) => done[k]).length;
  if (count === keys.length) return null;
  const H = `h${heading}`;
  const S = `h${heading + 1}`;

  return (
    <section className="rt-acc__card rt-pws-check" aria-labelledby="rt-pws-check-h">
      <div className="rt-pws-check__head">
        <H className="rt-dash__title" id="rt-pws-check-h">{copy.title}</H>
        <span className="rt-pws-check__count">{copy.done(count, keys.length)}</span>
      </div>
      <div className="rt-pws-check__bar" role="progressbar" aria-label={copy.title} aria-valuemin={0} aria-valuemax={keys.length} aria-valuenow={count} aria-valuetext={copy.done(count, keys.length)}>
        <span style={{ width: `${(count / keys.length) * 100}%` }}></span>
      </div>
      <ol className="rt-pws-check__list">
        {keys.map((k) => {
          const step = copy.steps[k];
          const text = typeof step.text === "string" ? step.text : step.text[status] || "";
          // approval has an action only when our team is waiting on the provider
          const action = k === "approved" ? (status === "changes_requested" ? step.action : null) : step.action;
          return (
            <li key={k} className={`rt-pws-check__item${done[k] ? " is-done" : ""}`}>
              <span className="rt-pws-check__mark" aria-hidden="true">{done[k] && <i className="icon-check text-10"></i>}</span>
              <div className="rt-pws-check__text">
                <S className="rt-pws-check__title">{step.title}<span className="rt-sr">{done[k] ? ": done" : ": to do"}</span></S>
                <p>{text}</p>
              </div>
              {!done[k] && action && can(NEEDS[k]) && <Link href={action.href} className="rt-dash__go">{action.label}<span className="rt-sr">: {step.title}</span><i className="icon-arrow-right text-10" aria-hidden="true"></i></Link>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
