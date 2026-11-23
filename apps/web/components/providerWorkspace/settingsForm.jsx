"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sheet from "@/components/testPrep/runner/Sheet";
import { setQuery } from "./providerParts";
import TextArea from "@/components/forms/TextArea";

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

// A text box with Bold and Bullet list buttons (the biography, the cancellation policy, the booking terms): they add the marks
// lib/richText.js reads (**bold**, lines starting "- "), shown formatted on the public pages (components/forms/FormattedText.jsx),
// around what is selected, then put the selection back. `onChange(text)` gets the whole new text; the rest are <textarea> props
// (id, rows, maxLength, aria…). `label`: what the toolbar formats, for screen readers ("the biography").
const NL = "\n";
export function FormatBox({ value, onChange, label, maxLength, disabled, ...props }) {
  const box = useRef(null);
  const selectAfter = useRef(null);
  const format = (kind) => {
    const el = box.current;
    if (!el) return;
    const v = value;
    const a = el.selectionStart;
    const b = el.selectionEnd;
    let next;
    let from;
    let to;
    if (kind === "bold") {
      const words = v.slice(a, b);
      const inner = words.trim() || "bold text";
      const lead = words.trim() ? words.length - words.trimStart().length : 0; // spaces picked up with a double-clicked word stay outside
      const trail = words.trim() ? words.length - words.trimEnd().length : 0;
      next = `${v.slice(0, a + lead)}**${inner}**${v.slice(b - trail)}`;
      from = a + lead + 2;
      to = from + inner.length;
    } else {
      // the whole lines the selection touches: each becomes a bullet, or, when all already are, back to plain lines
      const start = v.lastIndexOf(NL, a - 1) + 1;
      const stop = v.indexOf(NL, b);
      const end = stop < 0 ? v.length : stop;
      const lines = v.slice(start, end).split(NL);
      const all = lines.every((l) => /^- /.test(l));
      const out = lines.map((l) => (all ? l.replace(/^- /, "") : /^- /.test(l) || !l.trim() ? l : `- ${l}`)).join(NL);
      const shown = out === "" ? "- " : out; // an empty line starts a bullet
      next = `${v.slice(0, start)}${shown}${v.slice(end)}`;
      from = start + shown.length; // the cursor at the end of those lines, ready to type
      to = from;
    }
    if (maxLength && next.length > maxLength) return; // the box's limit
    onChange(next);
    selectAfter.current = [from, to];
  };
  // the cursor (or the placeholder "bold text", selected) is put back in the same update as the new text, before the next key
  // is handled, so fast typing after a click always lands in the right place
  useLayoutEffect(() => {
    const at = selectAfter.current;
    if (!at || !box.current) return;
    selectAfter.current = null;
    box.current.focus();
    box.current.setSelectionRange(at[0], at[1]);
  });
  return (
    <>
      {/* a click on a button never takes the cursor out of the box (onMouseDown), so the next key types there, not on the button */}
      <div className="rt-pws-set__fmt" role="toolbar" aria-label={`Format ${label}`} aria-controls={props.id}>
        <button type="button" className="rt-pws-set__fmtbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => format("bold")} disabled={disabled}><b aria-hidden="true">B</b> Bold</button>
        <button type="button" className="rt-pws-set__fmtbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => format("list")} disabled={disabled}><i className="icon-list text-12" aria-hidden="true"></i> Bullet list</button>
      </div>
      <TextArea {...props} ref={box} maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </>
  );
}
