import React from "react";

// A block of details after a document (plain, no panel): an icon tile, a title, optional text, optional label/value rows
// and optional actions (children).
export default function InfoCard({ icon, title, text, rows = [], children = null }) {
  return (
    <div className="rt-doc__card">
      <div className="rt-doc__card-head">
        {icon && <span className="rt-benefit__icon" aria-hidden="true"><i className={`${icon} text-16`}></i></span>}
        <h2 className="rt-doc__card-title">{title}</h2>
      </div>
      {text && <p className="rt-doc__card-text">{text}</p>}
      {rows.length > 0 && (
        <dl className="rt-doc__card-rows">
          {rows.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.href ? <a href={r.href}>{r.value}</a> : r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </div>
  );
}
