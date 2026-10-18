"use client";

import React, { useEffect, useRef, useState } from "react";
import { focusFirstError } from "@/lib/focusFirstError";
import { errorsFrom } from "@/lib/useMe";

// Commission rates are kept in basis points (2500 = 25%). On screen: "25%" or "25.5%".
export const formatRate = (bps) => `${(bps / 100).toLocaleString("en-GB", { maximumFractionDigits: 2 })}%`;

// "25", "25.5" or "25.25" (up to 2 decimals), 0 to 60, as basis points; null when it isn't a rate
export const parseRate = (text) => {
  const v = text.trim().replace(/%$/, "").trim();
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(v)) return null;
  const n = Math.round(Number(v) * 100);
  return n <= 6000 ? n : null;
};

// One rate field and its Save button, the GOV.UK way: label, hint, the error above the field, focus on it. `save(bps)` is a
// mutateAsync; a field error from the API shows here too.
export function RateForm({ id, label, hint, bps, save, saving, onSaved }) {
  const [value, setValue] = useState(String(bps / 100));
  const [error, setError] = useState("");
  const ref = useRef(null);
  useEffect(() => setValue(String(bps / 100)), [bps]);
  const submit = async (e) => {
    e.preventDefault();
    const next = parseRate(value);
    if (next === null) {
      setError("Enter a rate from 0 to 60, like 25 or 27.5.");
      return focusFirstError(ref.current);
    }
    setError("");
    try {
      await save(next);
      onSaved(next);
    } catch (err) {
      const { fields, general } = errorsFrom(err);
      setError(fields.bps || general);
      focusFirstError(ref.current);
    }
  };
  return (
    <form className="rt-adm-inline" onSubmit={submit} noValidate ref={ref}>
      <div className="rt-field">
        <label htmlFor={id}>{label}</label>
        {hint && <small className="rt-field__hint" id={`${id}-hint`}>{hint}</small>}
        {error && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{error}</p>}
        <div className="rt-adm-inline__row">
          <input id={id} type="text" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={[hint && `${id}-hint`, error && `${id}-e`].filter(Boolean).join(" ") || undefined} className="rt-adm-num" />
          <button type="submit" className="button -sm -purple-1 text-white" disabled={saving}>Save</button>
        </div>
      </div>
    </form>
  );
}
