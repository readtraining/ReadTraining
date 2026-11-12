"use client";

import React from "react";
import { formatDateRange, formatPrice } from "@/lib/format";
import { Icon } from "./Icon";
import PopShell from "./PopShell";

// "Choose your package" (as Hurak's Tiered Plans): a date or self-paced course sold in packages shows its provider's packages side
// by side, each with its full price per delegate (and was-price, from its "Save £"), its tagline, "Most popular" on one, and its
// features, each included (✓) or not (✗). Select puts that package in the basket with the date and the delegates chosen.
// `current`: the package a basket line already has ("Change package"); `onBack`: back to the dates (inside the dates pop-up).

const when = (s) => (s.mode === "ondemand" ? s.time : formatDateRange(s.date, s.endDate));

export function PackagePanel({ titleId, course, session, quantity = 1, current = null, onSelect, onBack, onClose }) {
  const list = session.packages || [];
  const n = Math.min(4, Math.max(2, list.length));
  return (
    <>
      <div className="rt-dd__head">
        <div className="rt-dd__heading">
          {onBack && (
            <button type="button" className="rt-pk__back" onClick={onBack}>
              <Icon name="arrow-left" /> Back to dates
            </button>
          )}
          <h2 id={titleId} className="rt-dd__title" tabIndex={-1}>Choose your package</h2>
          <p className="rt-dd__sub">
            {course.title} · {when(session)}{session.mode !== "ondemand" && session.location ? `, ${session.location}` : ""}
            {quantity > 1 ? ` · ${quantity} delegates` : ""}
          </p>
        </div>
        <button type="button" className="rt-icon-btn rt-dd__close" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
      </div>

      <div className="rt-dd__list rt-pk__list">
        <ul className={`rt-pk__grid -n${n}`}>
          {list.map((p) => {
            const was = p.wasPrice > p.price ? p.wasPrice : null;
            const mine = current === p.key;
            return (
              <li key={p.key} className={`rt-pk__card${p.popular ? " -popular" : ""}${mine ? " is-current" : ""}`}>
                {p.popular && <span className="rt-pk__badge">Most popular</span>}
                <h3 className="rt-pk__name">{p.name}</h3>
                <p className="rt-pk__price">
                  <strong>{formatPrice(p.price)}</strong>
                  {was && <s><span className="rt-cd__sr">was </span>{formatPrice(was)}</s>}
                </p>
                <p className="rt-pk__per">
                  {quantity > 1 ? `${formatPrice(p.price * quantity)} for ${quantity} delegates` : "per delegate"}
                  {was && <span className="rt-pk__save"> · Save {formatPrice(was - p.price)}</span>}
                </p>
                {p.tagline && <p className="rt-pk__tag">{p.tagline}</p>}
                {p.features.length > 0 && (
                  <ul className="rt-pk__features">
                    {p.features.map((f, i) => (
                      <li key={i} className={f.included ? "-yes" : "-no"}>
                        <span className="rt-pk__mark" aria-hidden="true"><Icon name={f.included ? "check" : "close"} /></span>
                        <span>
                          <span className="rt-cd__sr">{f.included ? "Included: " : "Not included: "}</span>
                          {f.title}
                          {f.description && <small>{f.description}</small>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" className={`button -md ${mine ? "-outline-purple-1 text-purple-1" : "-purple-1 text-white"} rt-btn-block rt-pk__select`} onClick={() => onSelect(p.key)}
                  aria-label={mine ? `Keep ${p.name}, your package` : `Select ${p.name}, ${formatPrice(p.price)} per delegate`}>
                  {mine ? "Your package" : `Select ${p.name}`}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="rt-pk__note">Prices are per delegate and include VAT.</p>
      </div>
    </>
  );
}

// The packages on their own pop-up: the booking card's and mobile bar's Book now, a self-paced course, and the basket's
// "Change package". `session` stays set while it closes.
export default function PackageDialog({ open, onClose, course, session, quantity, current, onSelect }) {
  return (
    <PopShell open={open && Boolean(session)} onClose={onClose} labelledBy="rt-pk-title">
      {() => (session ? <PackagePanel titleId="rt-pk-title" course={course} session={session} quantity={quantity} current={current} onSelect={onSelect} onClose={onClose} /> : null)}
    </PopShell>
  );
}
