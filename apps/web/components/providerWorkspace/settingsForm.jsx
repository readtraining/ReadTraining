"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sheet from "@/components/testPrep/runner/Sheet";
import { setQuery } from "./providerParts";

// Form bits for the workspace's settings and the package editor (DESIGN-SYSTEM.md, section 5): a field with its label, hint and
// error above the input, the matching aria attributes, a character counter, the checks the forms share, a confirm dialog and a
// value kept in the address (?key=).

// <Field id label error hint count>…input with {...aria(id, error, hint)}…</Field>
// `required`: a red * after the label (read out as "required"); fields without it are optional and say nothing
export const Req = () => <><span className="rt-req" aria-hidden="true"> *</span><span className="rt-sr"> (required)</span></>;
export function Field({ id, label, error, hint, count, children, className = "", required = false }) {
  return (
    <div className={`rt-field${className ? ` ${className}` : ""}`}>
      <label htmlFor={id}>{label}{required && <Req />}</label>
      {hint && <p className="rt-field__hint" id={`${id}-h`}>{hint}</p>}
      {error && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{error}</p>}
      {children}
      {count}
    </div>
  );
}
export const aria = (id, error, hint) => ({
  id,
  "aria-invalid": error ? true : undefined,
  "aria-describedby": [hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(" ") || undefined,
});
export const Counter = ({ value, max }) => <span className="rt-field__hint rt-pws-set__count" aria-hidden="true">{value.length} / {max}</span>;

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
// a https address on one of `hosts` (any host when none are given)
// (`page`: a page on the site, not just its home: the social links, as the API checks them in provider/profile.mts onSite)
export function isUrlOn(v, hosts = [], { page = false } = {}) {
  try {
    const u = new URL(v.trim());
    if (u.protocol !== "https:" || u.username || u.password) return false;
    if (page && u.pathname.length <= 1) return false;
    return !hosts.length || hosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
// a price in pounds: a number above 0 with up to 2 decimal places
export const isMoney = (v, { zero = false } = {}) => /^\d+(\.\d{1,2})?$/.test(String(v).trim()) && (zero || Number(v) > 0);

// A question before something that can't be undone. `blocked`: a message shown instead of the confirm button.
// `busy`: the action is running, so the button can't be pressed twice (a second "Delete" would say it was blocked).
// danger: the action deletes, removes or throws something away, so its button is the red outline (the same as the gear's Delete course);
// a reversible one (pause, archive) keeps the purple main button
// While it is working (busy), it can't be closed (Cancel, Esc and the backdrop wait), so the result is never lost or half-seen.
// `blocked`: it can't be done (the button goes, Close stays); `error`: this try failed (a connection problem), so it can be tried again
export function Confirm({ open, onClose, title, text, confirmLabel, onConfirm, blocked, error, busy = false, danger = false }) {
  const close = () => !busy && onClose();
  return (
    <Sheet open={open} onClose={close} title={title} closeLabel="Close" className="rt-pws-set__confirm" noClose>
      <div className="rt-pws-set__confirmbody">
        {text && <p className="rt-acc__note">{text}</p>}
        {blocked && <p className="rt-adm-item__block" role="alert">{blocked}</p>}
        {!blocked && error && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
        <div className="rt-pws-set__actions">
          {!blocked && <button type="button" className={`button -md ${danger ? "-outline-red-3 text-red-3" : "-purple-1 text-white"}`} onClick={onConfirm} disabled={busy} aria-busy={busy || undefined}>{confirmLabel}</button>}
          <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={close} disabled={busy}>{blocked ? "Close" : "Cancel"}</button>
        </div>
      </div>
    </Sheet>
  );
}

// A filter or tab kept in the address. The value lives in state, so a choice shows (and filters) at once; it is also written to
// the address (setQuery, history.replaceState), and a link that changes the address while the page is open (useSearchParams)
// sets it again. Reading the address alone missed choices made on the page: replaceState does not re-render the component.
export function useParam(key, fallback = "") {
  const fromUrl = useSearchParams().get(key) ?? fallback;
  const [value, setValue] = useState(fromUrl);
  useEffect(() => setValue(fromUrl), [fromUrl]);
  return [value, (v) => {
    setValue(v || fallback);
    setQuery(key, v && v !== fallback ? v : "");
  }];
}
