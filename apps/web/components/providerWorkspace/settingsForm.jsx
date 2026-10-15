"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sheet from "@/components/testPrep/runner/Sheet";
import { setQuery } from "./providerParts";

// Form bits for the workspace's settings and the package editor (DESIGN-SYSTEM.md, section 5): a field with its label, hint and
// error above the input, the matching aria attributes, a character counter, the checks the forms share, a confirm dialog and a
// value kept in the address (?key=).

// <Field id label error hint count>…input with {...aria(id, error, hint)}…</Field>
export function Field({ id, label, error, hint, count, children, className = "" }) {
  return (
    <div className={`rt-field${className ? ` ${className}` : ""}`}>
      <label htmlFor={id}>{label}</label>
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
export function isUrlOn(v, hosts = []) {
  try {
    const u = new URL(v.trim());
    if (u.protocol !== "https:") return false;
    return !hosts.length || hosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
// a price in pounds: a number above 0 with up to 2 decimal places
export const isMoney = (v, { zero = false } = {}) => /^\d+(\.\d{1,2})?$/.test(String(v).trim()) && (zero || Number(v) > 0);

// A question before something that can't be undone. `blocked`: a message shown instead of the confirm button.
export function Confirm({ open, onClose, title, text, confirmLabel, onConfirm, blocked }) {
  return (
    <Sheet open={open} onClose={onClose} title={title} closeLabel="Close" className="rt-pws-set__confirm">
      <div className="rt-pws-set__confirmbody">
        {text && <p className="rt-acc__note">{text}</p>}
        {blocked && <p className="rt-adm-item__block" role="alert">{blocked}</p>}
        <div className="rt-pws-set__actions">
          {!blocked && <button type="button" className="button -md -purple-1 text-white" onClick={onConfirm}>{confirmLabel}</button>}
          <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onClose}>{blocked ? "Close" : "Cancel"}</button>
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
