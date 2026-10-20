"use client";

import React, { useEffect, useRef, useState } from "react";
import Calendar from "react-calendar";

// The site's date field, used instead of the browser's own date box (which follows the browser's language, so it can show
// 10/19/2026): it shows the date the UK way ("Mon 19 Oct 2026") and opens a calendar that starts on Monday. `value` and
// onChange use ISO days ("2026-10-19"); `min`/`max` limit the choice; `clearable` adds "Clear" for optional dates.
// Esc or a click outside closes it, and focus goes back to the field.
const shown = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const toDate = (iso) => (iso ? new Date(`${iso}T00:00:00Z`) : null);
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const local = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// `startView` "decade" opens on the years around 30 years ago (a date of birth), when no date is chosen yet.
export default function DateField({ id, value, onChange, min, max, invalid = false, describedBy, disabled = false, clearable = false, placeholder = "Choose a date", compact = false, startView }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const btn = useRef(null);
  useEffect(() => {
    if (!open) return;
    const out = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    const key = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", out);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const pick = (d) => {
    onChange(toIso(d));
    setOpen(false);
    btn.current?.focus();
  };

  return (
    <div className={`rt-datefield${compact ? " -compact" : ""}${open ? " is-open" : ""}`} ref={wrap}>
      <button type="button" id={id} ref={btn} className="rt-datefield__btn" onClick={() => setOpen((o) => !o)} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-invalid={invalid || undefined} aria-describedby={describedBy}>
        <span className={value ? "" : "rt-datefield__placeholder"}>{value ? shown.format(toDate(value)) : placeholder}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
      </button>
      {open && (
        <div className="rt-datefield__pop" role="dialog" aria-label="Choose a date">
          <Calendar
            locale="en-GB"
            value={value ? local(value) : null}
            onChange={pick}
            minDate={min ? local(min) : undefined}
            maxDate={max ? local(max) : undefined}
            minDetail="decade"
            defaultView={!value && startView ? startView : undefined}
            defaultActiveStartDate={!value && startView ? new Date(new Date().getFullYear() - 30, 0, 1) : undefined}
            next2Label={null}
            prev2Label={null}
          />
          {clearable && value && (
            <button type="button" className="rt-cd__link rt-datefield__clear" onClick={() => { onChange(""); setOpen(false); btn.current?.focus(); }}>Clear</button>
          )}
        </div>
      )}
    </div>
  );
}
