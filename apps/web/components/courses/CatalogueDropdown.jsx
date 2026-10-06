"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";

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
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const closeTimer = useRef(null);
  const hoverOpened = useRef(false);
  const id = useId();

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

  const onPointerEnter = (e) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    if (!open) {
      hoverOpened.current = true;
      setOpen(true);
    }
  };
  const onPointerLeave = (e) => {
    if (e.pointerType !== "mouse") return;
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
      className={`rt-cat-dd${open ? " is-open" : ""}${className ? ` ${className}` : ""}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button
        type="button"
        className={`rt-cat-dd__trigger${selected && clearable ? " is-active" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onTriggerClick}
      >
        {prefix && <span className="rt-cat-dd__prefix">{prefix}</span>}
        <span className="rt-cat-dd__value">{selected ? selected.label : label}</span>
        <i className="icon-chevron-down text-9 rt-cat-dd__chevron"></i>
      </button>

      <div className="rt-cat-dd__backdrop" onClick={close}></div>
      {/* Always mounted so it can ease in and out; hidden panels are visibility:hidden (not focusable). */}
      {(
        <div className="rt-cat-dd__panel" id={`${id}-panel`} aria-hidden={!open}>
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

          <ul className="rt-cat-dd__list" role="listbox" aria-label={label}>
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
        </div>
      )}
    </div>
  );
}
