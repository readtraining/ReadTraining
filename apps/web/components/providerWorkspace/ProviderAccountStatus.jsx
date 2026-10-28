"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { pw } from "@/data/providerWorkspace";
import { useWorkspace } from "@/lib/workspaceContext";

const copy = pw.accountStatus;
const ICON = { info: "icon-wall-clock", warning: "icon-edit", critical: "icon-flag", success: "icon-check" };

// The provider account's status from the ReadTraining team: one line at the top of every workspace page, with at most one action
// (GOV.UK's notification banner, Polaris and Atlassian's banners: one message at a time, just before the page heading, the work
// itself on its own page). Waiting for review and just approved can be hidden; changes needed and suspended stay until they are
// resolved. The Account review page (/provider/review) holds the details, so the bar isn't shown there. Nothing for an active
// account, except once after it is approved or reinstated.
export default function ProviderAccountStatus() {
  const workspace = useWorkspace();
  const path = usePathname();
  const key = workspace?.status === "active" ? workspace?.welcome : workspace?.status;
  const c = key ? copy[key] : null;
  // a hidden message stays hidden for this status; a new status (or a new decision) shows again
  const storeKey = c?.dismissible ? `rt-pws-status:${workspace.id}:${key}:${workspace.statusChangedAt || ""}` : null;
  const [hidden, setHidden] = useState(storeKey ? null : false); // null: not checked yet, so a hidden message never flashes
  useEffect(() => {
    if (!storeKey) return setHidden(false);
    try {
      setHidden(window.localStorage.getItem(storeKey) === "1");
    } catch {
      setHidden(false);
    }
  }, [storeKey]);
  if (!c || hidden !== false || path === "/provider/review") return null;

  const hide = () => {
    setHidden(true);
    try {
      window.localStorage.setItem(storeKey, "1");
    } catch {}
  };

  return (
    <section className={`rt-pws-status -${c.tone}`} aria-labelledby="rt-pws-status-h">
      <span className="rt-pws-status__icon" aria-hidden="true"><i className={`${ICON[c.tone]} text-14`}></i></span>
      <div className="rt-pws-status__body">
        <h2 className="rt-pws-status__title" id="rt-pws-status-h">{c.title}</h2>
        <p className="rt-pws-status__text">{c.text}</p>
      </div>
      {(c.action || c.dismissible) && (
        <div className="rt-pws-status__side">
          {c.action && <Link href={c.action.href} className="button -sm -outline-purple-1 text-purple-1 rt-pws-status__action">{c.action.label}</Link>}
          {c.dismissible && (
            <button type="button" className="rt-pws-status__close" onClick={hide} aria-label={copy.hide}>
              <i className="icon-close text-10" aria-hidden="true"></i>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
