"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import FilterScrollPill from "./FilterScrollPill";

// Single-select dropdown used for the three filters and the sort control.
// Desktop mouse: opens on hover (and on click). Touch/keyboard: tap or Enter to open; on small
// screens the panel becomes a bottom sheet. Choosing the active option clears it when `clearable`.
export default function CatalogueDropdown({
  label,
  prefix,
  options,
  value,
  onChange,
  searchable = false,
  clearable = true,
  searchPlaceholder = "Search",
  className = "",
  // as a form field (e.g. the licence "Apply for me" form): the trigger gets the field's id (for its <label>), the text shown
  // before anything is chosen, and the error state
  id,
  placeholder,
  invalid = false,
  describedBy,
  // a form field opens on click or tap only: hovering a form shouldn't drop a list over the next fields
  openOnHover = true,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [toLeft, setToLeft] = useState(false); // opens leftwards (from its right edge) only when there is no room on the right
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const closeTimer = useRef(null);
  const hoverOpened = useRef(false);
  const uid = useId();
  const fieldId = id;

  const selected = options.find((o) => o.value === value);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
    hoverOpened.current = false;
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => rootRef.current && !rootRef.current.contains(e.target) && close();
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // which way the list opens: to the right of the trigger when it fits on the screen, otherwise leftwards. Worked out on load,
  // on resize and on opening, and kept while closed, so the list never jumps sideways as it fades out.
  useEffect(() => {
    const measure = () => {
      const root = rootRef.current;
      const panel = root?.querySelector(".rt-cat-dd__panel");
      if (!root || !panel) return;
      const r = root.getBoundingClientRect();
      setToLeft(r.left + Math.max(panel.offsetWidth, r.width) > document.documentElement.clientWidth - 8);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  const onPointerEnter = (e) => {
    if (!openOnHover || e.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    if (!open) {
      hoverOpened.current = true;
      setOpen(true);
    }
  };
  const onPointerLeave = (e) => {
    if (!openOnHover || e.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(close, 180);
  };

  const onTriggerClick = () => {
    // A click straight after hover-open should not immediately close the panel.
    if (hoverOpened.current) {
      hoverOpened.current = false;
      return;
    }
    if (open) return close();
    setOpen(true);
    if (searchable) setTimeout(() => inputRef.current?.focus(), 0);
  };

  const choose = (opt) => {
    onChange(clearable && opt.value === value ? "" : opt.value);
    close();
  };

  return (
    <div
      ref={rootRef}
      className={`rt-cat-dd${open ? " is-open" : ""}${!toLeft ? " -to-right" : ""}${className ? ` ${className}` : ""}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button
        type="button"
        className={`rt-cat-dd__trigger${selected && clearable ? " is-active" : ""}`}
        id={fieldId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${uid}-panel`}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={onTriggerClick}
      >
        {prefix && <span className="rt-cat-dd__prefix">{prefix}</span>}
        <span className="rt-cat-dd__value">{selected ? selected.label : placeholder ?? label}</span>
        <i className="icon-chevron-down text-9 rt-cat-dd__chevron"></i>
      </button>

      <div className="rt-cat-dd__backdrop" onClick={close}></div>
      {/* Always mounted so it can ease in and out; hidden panels are visibility:hidden (not focusable). */}
      {(
        <div className="rt-cat-dd__panel" id={`${uid}-panel`} aria-hidden={!open}>
          <div className="rt-cat-dd__head">
            <strong>{label}</strong>
            <button type="button" onClick={close} aria-label="Close">
              <i className="icon-close text-12"></i>
            </button>
          </div>

          {searchable && (
            <div className="rt-cat-dd__search">
              <i className="icon-search text-14 text-light-1"></i>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
            </div>
          )}

          {/* a long list scrolls with the site's pill (FilterScrollPill) instead of the browser's scrollbar */}
          <ul ref={listRef} className="rt-cat-dd__list rt-pill-scroll" role="listbox" aria-label={label}>
            {visible.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`rt-cat-dd__option${active ? " is-active" : ""}`}
                    onClick={() => choose(opt)}
                  >
                    {opt.icon && <i className={`${opt.icon} rt-cat-dd__icon`}></i>}
                    <span>{opt.label}</span>
                    {active && <i className="icon-check text-10 rt-cat-dd__check"></i>}
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && <li className="rt-cat-dd__none">No matches</li>}
          </ul>
          <FilterScrollPill scrollRef={listRef} />
        </div>
      )}
    </div>
  );
}

// A form or toolbar dropdown in the site's look (as the licence form's), instead of the browser's own <select>. Same inputs as a
// select: `options` are strings or { value, label }, `onChange` gets the chosen value (always a string, as a select's). The
// <label> goes on the page with htmlFor={id}. `compact` is the 44px toolbar size; form fields are 52px.
export function FieldSelect({ id, label, value, onChange, options, placeholder = "Select", invalid = false, describedBy, disabled = false, compact = false, className = "" }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : { ...o, value: String(o.value) }));
  return (
    <CatalogueDropdown
      className={`rt-field-dd${compact ? " -compact" : ""}${className ? ` ${className}` : ""}`}
      id={id}
      label={label}
      placeholder={placeholder}
      options={opts}
      value={value === undefined || value === null ? "" : String(value)}
      onChange={onChange}
      clearable={false}
      invalid={invalid}
      describedBy={describedBy}
      openOnHover={false}
      disabled={disabled}
    />
  );
}
