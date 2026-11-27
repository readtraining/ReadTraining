"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { pw } from "@/data/providerWorkspace";
import { api } from "@/lib/trpc/react";
import { useWorkspace } from "@/lib/workspaceContext";
import { useFromLink } from "@/lib/backLink";

const copy = pw.accountStatus;
const ICON = { info: "icon-wall-clock", warning: "icon-edit", critical: "icon-flag", success: "icon-check" };
// news shown once to each person (seen is saved on their membership, so it is gone on every device after one look)
const ONCE = new Set(["pending", "approved", "reinstated"]);
// messages already shown on this visit: moving between pages in the browser keeps the first page's workspace record, which
// still says "not seen", so the message isn't shown again on the way back to the dashboard
const shownThisVisit = new Set();

// The provider account's status from the ReadTraining team: one line, with at most one action as a link at the end of its sentence (GOV.UK's notification banner,
// Polaris and Atlassian's banners: one message at a time, the work itself on its own page). `place`:
// - "page" (every workspace page, from ProviderShell): only "suspended", which blocks everything and is explained nowhere else;
// - "dashboard": the rest. Waiting for review, approved and active again show once (and can be closed at once with ×); changes
//   needed shows on every visit until it is resolved (the courses pages and the Account review page say what it blocks).
// Nothing on the Account review page, which holds the details. Nothing for an active account, except once after it is approved
// or reinstated.
export default function ProviderAccountStatus({ place = "page" }) {
  const workspace = useWorkspace();
  const path = usePathname();
  const link = useFromLink();
  const key = workspace?.status === "active" ? workspace?.welcome : workspace?.status;
  const here = place === "page" ? key === "suspended" : key && key !== "suspended";
  const once = here && ONCE.has(key);
  const visitKey = `${workspace?.id}:${key}:${workspace?.statusChangedAt || ""}`;
  // decided once when the message first appears, so it stays in place on the page where it was seen
  const [show, setShow] = useState(() => !once || (!workspace?.statusSeen && !shownThisVisit.has(visitKey)));
  const seen = api.organisations.statusSeen.useMutation();
  useEffect(() => {
    if (!once || !show || shownThisVisit.has(visitKey)) return;
    shownThisVisit.add(visitKey);
    seen.mutate({ organisationId: workspace.id });
  }, [once, show, visitKey]); // eslint-disable-line react-hooks/exhaustive-deps -- mark it seen once, when it first shows

  const c = here ? copy[key] : null;
  if (!c || !show || path === "/provider/review") return null;
  return (
    <section className={`rt-pws-status -${c.tone}`} aria-labelledby="rt-pws-status-h">
      <span className="rt-pws-status__icon" aria-hidden="true"><i className={`${ICON[c.tone]} text-14`}></i></span>
      <div className="rt-pws-status__body">
        <h2 className="rt-pws-status__title" id="rt-pws-status-h">{c.title}</h2>
        <p className="rt-pws-status__text">{c.text}{c.action && <> <Link href={link(c.action.href)} className="rt-pws-status__link">{c.action.label}<i className="icon-arrow-right text-10" aria-hidden="true"></i></Link></>}</p>
      </div>
      {once && (
        <button type="button" className="rt-pws-status__close" onClick={() => setShow(false)} aria-label={copy.hide}>
          <i className="icon-close text-10" aria-hidden="true"></i>
        </button>
      )}
    </section>
  );
}
