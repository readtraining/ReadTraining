"use client";

import React, { useState } from "react";

// A list of short lines added one at a time (features, learning outcomes), with Enter or the Add button; outcomes can be reordered.
// `max` is each line's length, `most` how many lines there can be (adding stops there, and says so); `error` a save's message.
export default function LineList({ id, label, hint, items, onChange, max, most, placeholder, ordered = false, commas = false, disabled, error }) {
  const [value, setValue] = useState("");
  const [twice, setTwice] = useState(""); // what was typed is already on the list
  const full = items.length >= most;
  const add = (text = value) => {
    const parts = (commas ? text.split(",") : [text]).map((x) => x.trim().slice(0, max)).filter(Boolean);
    const fresh = parts.filter((p) => !items.includes(p));
    if (parts.length && !fresh.length) {
      setTwice(`"${parts[0]}" is already on the list.`);
      return;
    }
    setTwice("");
    if (fresh.length) onChange([...items, ...fresh].slice(0, most));
    setValue("");
  };
  const move = (i, by, e) => {
    const btn = e?.currentTarget;
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    onChange(next);
    // the item keeps its row; at the top or bottom its arrow turns off, so the keyboard goes to the other one
    requestAnimationFrame(() => {
      if (btn?.disabled) (by < 0 ? btn.nextElementSibling : btn.previousElementSibling)?.focus();
    });
  };
  return (
    <div className="rt-field">
      <label htmlFor={id}>{label}</label>
      <span className="rt-field__hint" id={`${id}-h`}>{full && !disabled ? `That's the most a course can have (${most}). Remove one to add another.` : hint}</span>
      <FieldErr id={id} text={error || twice} />
      {!disabled && (
        <div className="rt-pws-course-addrow">
          <input id={id} value={value} maxLength={max} disabled={full} onChange={(e) => { setTwice(""); if (commas && e.target.value.includes(",")) add(e.target.value); else setValue(e.target.value); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} aria-invalid={error || twice ? true : undefined} aria-describedby={`${id}-h${error || twice ? ` ${id}-e` : ""}`} autoComplete="off" />
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => add()} disabled={full}>Add</button>
        </div>
      )}
      {items.length > 0 && (ordered ? (
        <ol className="rt-pws-course-list">
          {items.map((o, i) => (
            <li key={o}>
              <span className="rt-pws-course-list__text">{o}</span>
              {!disabled && (
                <span className="rt-pws-course-list__tools">
                  <button type="button" onClick={(e) => move(i, -1, e)} disabled={i === 0} aria-label={`Move up: ${o}`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
                  <button type="button" onClick={(e) => move(i, 1, e)} disabled={i === items.length - 1} aria-label={`Move down: ${o}`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
                  <button type="button" className="rt-pws-ce__iconbtn -danger" onClick={() => onChange(items.filter((x) => x !== o))} aria-label={`Remove: ${o}`} title="Remove"><i className="icon-bin text-14" aria-hidden="true"></i></button>
                </span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <ul className="rt-pws-course-tags">
          {items.map((f) => (
            <li key={f}><span>{f}</span>{!disabled && <button type="button" onClick={() => onChange(items.filter((x) => x !== f))} aria-label={`Remove ${f}`}><i className="icon-close text-10" aria-hidden="true"></i></button>}</li>
          ))}
        </ul>
      ))}
    </div>
  );
}

const FieldErr = ({ id, text }) => (text ? <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{text}</p> : null);
