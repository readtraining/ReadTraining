"use client";

import React from "react";
import { useSwitchAccount } from "@/lib/useSwitchAccount";

// Switch account in the account menu (and the Business account's): the identities on this login as a short list, the current
// one marked, then the ones that can be added. Each row is a button: it records the switch and opens that account.
export default function SwitchAccount({ current }) {
  const { ready, entries, go, title, currentLabel } = useSwitchAccount(current);
  if (!ready) return null;
  return (
    <div className="rt-switch" role="group" aria-labelledby="rt-switch-h">
      <p className="rt-switch__title" id="rt-switch-h">{title}</p>
      <ul className="rt-switch__list">
        {entries.map((e) => (
          <li key={e.key}>
            <button type="button" className={`rt-switch__row${e.current ? " is-current" : ""}${e.kind === "add" ? " is-add" : ""}`} onClick={() => go(e)} aria-current={e.current ? "true" : undefined} disabled={e.current}>
              <span className="rt-switch__mark" aria-hidden="true">{e.mark}</span>
              <span className="rt-switch__text">
                <strong>{e.label}</strong>
                <span>{e.current ? `${e.sub} · ${currentLabel}` : e.sub}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
