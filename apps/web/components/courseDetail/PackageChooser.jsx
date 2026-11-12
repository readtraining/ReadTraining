"use client";

import React, { useState } from "react";
import { basket as basketCopy } from "@/data/basket";
import { formatDateRange, formatPrice } from "@/lib/format";
import { Icon } from "./Icon";
import PopShell from "./PopShell";

// The steps between a date's Book now and the basket, as Hurak's: "Choose your package" when the date is sold in packages (a
// provider's price plan, or the client's own on a course page), then, on a course the SIA licence needs first aid for, the first
// aid requirement (I already have a certificate, or add Emergency First Aid at Work), unless the package chosen includes it.

const when = (s) => (s.mode === "ondemand" ? s.time : formatDateRange(s.date, s.endDate));
const fa = basketCopy.firstAid;

function Head({ titleId, title, sub, onBack, backLabel, onClose }) {
  return (
    <div className="rt-dd__head">
      <div className="rt-dd__heading">
        {onBack && (
          <button type="button" className="rt-pk__back" onClick={onBack}>
            <Icon name="arrow-left" /> {backLabel}
          </button>
        )}
        <h2 id={titleId} className="rt-dd__title" tabIndex={-1}>{title}</h2>
        <p className="rt-dd__sub">{sub}</p>
      </div>
      <button type="button" className="rt-icon-btn rt-dd__close" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
    </div>
  );
}

// The packages side by side: each one's full price per delegate (and was-price, from its "Save £"), its tagline, "Most popular"
// on one, and its features, each included (✓) or not (✗). `current`: the package a basket line already has.
function PackagePanel({ titleId, sub, session, quantity, current, onSelect, onBack, onClose }) {
  const list = session.packages || [];
  const n = Math.min(4, Math.max(2, list.length));
  return (
    <>
      <Head titleId={titleId} title="Choose your package" sub={sub} onBack={onBack} backLabel="Back to dates" onClose={onClose} />
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

// The SIA's first aid requirement: one of the two to go on (the basket asks again if it is skipped some other way).
function FirstAidPanel({ titleId, sub, quantity, onChoose, onBack, backLabel, onClose }) {
  return (
    <>
      <Head titleId={titleId} title={fa.title} sub={sub} onBack={onBack} backLabel={backLabel} onClose={onClose} />
      <div className="rt-dd__list rt-fa">
        <span className="rt-fa__tag">{fa.badge}</span>
        <p className="rt-fa__text">{fa.text}</p>
        <div className="rt-fa__add">
          <p>{fa.addText.replace("{price}", formatPrice(fa.add.price))}</p>
        </div>
        <h3 className="rt-fa__h">{fa.haveTitle}</h3>
        <ul className="rt-fa__list">{fa.haveRules.map((r) => <li key={r}><Icon name="check" /> <span>{r}</span></li>)}</ul>
        <p className="rt-fa__pick">{fa.pick}</p>
        <div className="rt-fa__choices">
          <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => onChoose("have")}>{fa.have.label}</button>
          <button type="button" className="button -md -purple-1 text-white" onClick={() => onChoose("add")}>
            {fa.addButton.replace("{price}", formatPrice(fa.add.price))}{quantity > 1 ? ` (per delegate)` : ""}
          </button>
        </div>
      </div>
    </>
  );
}

// The steps for one date: `needsAid` (the course needs first aid for the licence), `onDone(packageKey, firstAid)`. `onBack`: back
// to the dates (inside the dates pop-up). `current`: the basket line's package ("Change package").
export function BookingSteps({ titleId, course, session, quantity = 1, needsAid = false, current = null, onDone, onBack, onClose }) {
  const packaged = Boolean(session.packages?.length);
  const [stage, setStage] = useState(packaged ? "package" : "firstaid");
  const [key, setKey] = useState(null);
  const sub = `${course.title} · ${when(session)}${session.mode !== "ondemand" && session.location ? `, ${session.location}` : ""}${quantity > 1 ? ` · ${quantity} delegates` : ""}`;
  if (stage === "package") {
    return (
      <PackagePanel titleId={titleId} sub={sub} session={session} quantity={quantity} current={current} onBack={onBack} onClose={onClose}
        onSelect={(k) => {
          const pkg = session.packages.find((p) => p.key === k);
          if (needsAid && !pkg?.firstAid) {
            setKey(k);
            setStage("firstaid");
          } else onDone(k, pkg?.firstAid ? "bundle" : null);
        }} />
    );
  }
  return (
    <FirstAidPanel titleId={titleId} sub={sub} quantity={quantity} onClose={onClose} onChoose={(c) => onDone(key, c)}
      onBack={packaged ? () => setStage("package") : onBack} backLabel={packaged ? "Back to packages" : "Back to dates"} />
  );
}

// The steps on their own pop-up: the booking card's and mobile bar's Book now, a self-paced course, and the basket's "Change
// package". `session` stays set while it closes; a new opening starts again from the first step.
export default function PackageDialog({ open, onClose, course, session, quantity, needsAid, current, onDone }) {
  return (
    <PopShell open={open && Boolean(session)} onClose={onClose} labelledBy="rt-pk-title">
      {() => (session ? <BookingSteps key={`${session.id}:${current ?? ""}`} titleId="rt-pk-title" course={course} session={session} quantity={quantity} needsAid={needsAid} current={current} onDone={onDone} onClose={onClose} /> : null)}
    </PopShell>
  );
}
