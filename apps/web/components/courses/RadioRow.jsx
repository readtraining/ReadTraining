import React from "react";

// A radio row (single-select group: Price). A native radio, so arrow keys move between options and select them.
export function RadioRow({ name, opt, checked, count, onChange }) {
  return (
    <label className={`rt-fp__opt${checked ? " is-selected" : ""}`}>
      <input type="radio" className="rt-fp__radio" name={name} value={opt.value} checked={checked} onChange={onChange} />
      <span className="rt-fp__label">{opt.label}</span>
      {count !== undefined && <span className="rt-fp__count" aria-label={`${count} courses`}>{count}</span>}
    </label>
  );
}

// A checkbox row (multi-select groups). Label on the left, live facet count on the right; the whole row is the click
// target. Options with no results are muted but still tickable. Focus stays on the checkbox after ticking.
export function CheckRow({ name, opt, checked, count, onChange }) {
  const empty = count === 0 && !checked;
  return (
    <label className={`rt-fp__opt${checked ? " is-selected" : ""}${empty ? " is-empty" : ""}`}>
      <input type="checkbox" className="rt-fp__check" name={name} value={opt.value} checked={checked} onChange={onChange} />
      <span className="rt-fp__label">{opt.label}</span>
      {count !== undefined && <span className="rt-fp__count" aria-label={`${count} courses`}>{count}</span>}
    </label>
  );
}
