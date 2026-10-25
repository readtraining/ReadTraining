"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { basket as copy } from "@/data/basket";
import { MAX_DELEGATES, hasDate, hasPackages, isSelected, lineParts, modeLabel, needsFirstAid } from "@/lib/basket";
import { formatDateRange, formatPrice } from "@/lib/format";
import SaverBadge from "@/components/skillSaver/SaverBadge";
import { QUOTE_HREF, coursePath } from "@/lib/routes";

// One course on one date. Top: the picture, the title, when and where it runs, and on the right the delegates counter, the line's
// price and Remove. Under it, only for a security classroom course: the package to choose (.rt-bk__pkg, the selected learning-option
// card's look) and the first aid qualification the licence needs (.rt-bk__req). The tick box beside the title puts the course in
// this booking or leaves it in the basket for later. The date is chosen and changed here, in the date pop-up (`onDates`).
export default function BasketLine({ item, onChange, onRemove, onDates }) {
  const { unit, total, was, quantity } = lineParts(item);
  const dated = hasDate(item);
  const courseHref = coursePath(item.slug || item.id);
  const id = `bk-${item.id}-${item.sessionId || "x"}`;
  const fa = copy.firstAid;
  const setQuantity = (next) => onChange({ quantity: Math.min(MAX_DELEGATES, Math.max(1, next)) });
  const on = isSelected(item);

  return (
    <article className={`rt-bk__line${on ? "" : " is-off"}`} aria-labelledby={`${id}-t`}>
      <div className="rt-bk__row">
        <Link href={courseHref} className="rt-bk__thumb" tabIndex={-1} aria-hidden="true">
          {item.imageSrc && <Image width={220} height={140} src={item.imageSrc} alt="" />}
        </Link>

        <div className="rt-bk__main">
          <div className="rt-bk__titlerow">
            <label className="rt-bk__check">
              <input type="checkbox" checked={on} onChange={(e) => onChange({ selected: e.target.checked })} />
              <span className="rt-sr">{copy.select.include.replace("{title}", item.title)}</span>
            </label>
            <h2 className="rt-bk__title" id={`${id}-t`}><Link href={courseHref}>{item.title}</Link></h2>
          </div>
          {!on && <p className="rt-bk__offnote">{copy.select.off}</p>}
          {dated ? (
            <>
              <ul className="rt-bk__facts">
                <li><i className="icon-calendar" aria-hidden="true"></i><span>{item.mode === "ondemand" ? item.time : `${formatDateRange(item.date, item.endDate)}${item.time ? ` · ${item.time}` : ""}`}</span></li>
                {item.venue && <li><i className="icon-location" aria-hidden="true"></i><span>{item.venue}{item.postcode ? `, ${item.city}, ${item.postcode}` : ""}</span></li>}
                {item.provider && <li><i className="icon-person-3" aria-hidden="true"></i><span>Provided by {item.provider}</span></li>}
              </ul>
              <div className="rt-bk__tags">
                <span className="rt-pill">{modeLabel(item.mode)}</span>
                {item.skillSaver && <SaverBadge />}
                <button type="button" className="fb-textlink rt-bk__change" aria-haspopup="dialog" onClick={onDates}>{copy.changeDate}<span className="rt-sr"> for {item.title}</span></button>
              </div>
            </>
          ) : (
            <div className="rt-bk__nodate" role="status">
              <p>{copy.noDate}</p>
              <button type="button" className="button -sm -purple-1 text-white" aria-haspopup="dialog" onClick={onDates}>{copy.chooseDate}<span className="rt-sr"> for {item.title}</span></button>
            </div>
          )}
        </div>

        <div className="rt-bk__side">
          <div className="rt-bk__qty" role="group" aria-label={`Delegates for ${item.title}`}>
            <button type="button" aria-label="Remove one delegate" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}>−</button>
            <output aria-live="polite"><span className="rt-sr">Delegates: </span>{quantity}</output>
            <button type="button" aria-label="Add one delegate" disabled={quantity >= MAX_DELEGATES} onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>
          <p className="rt-bk__price">
            <strong>{formatPrice(total)}</strong>
            {was > 0 && <s><span className="rt-sr">Was </span>{formatPrice(was)}</s>}
          </p>
          {quantity > 1 && <p className="rt-bk__each">{formatPrice(unit)} each</p>}
          <button type="button" className="rt-bk__remove" onClick={onRemove}>
            <i className="icon-close text-9" aria-hidden="true"></i>Remove<span className="rt-sr"> {item.title}</span>
          </button>
        </div>
      </div>

      {quantity >= MAX_DELEGATES && (
        <p className="rt-bk__note">Need more than {MAX_DELEGATES} places? <Link href={`${QUOTE_HREF}?course=${item.id}`} className="fb-textlink">Ask for a group quote</Link></p>
      )}

      {dated && hasPackages(item) && (
        <fieldset className="rt-bk__fs">
          <legend>{copy.packages.title}</legend>
          <div className="rt-bk__pkgs">
            {copy.packages.items.map((p) => {
              const on = (item.package || "saver") === p.key;
              return (
                <label key={p.key} className={`rt-bk__pkg${on ? " is-on" : ""}`}>
                  <input type="radio" name={`${id}-pkg`} value={p.key} checked={on} onChange={() => onChange({ package: p.key })} />
                  <span className="rt-bk__pkghead">
                    <b>{p.name}</b>
                    {p.badge && <span className="rt-pill -accent">{p.badge}</span>}
                    <em>{p.price ? `+${formatPrice(p.price)}` : "Included"}</em>
                  </span>
                  <dl className="rt-bk__terms">
                    {p.terms.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                  </dl>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {dated && needsFirstAid(item) && (
        <fieldset className={`rt-bk__fs rt-bk__req${item.firstAid ? "" : " is-open"}`}>
          <legend>{fa.title}</legend>
          <p className="rt-bk__reqtext">{fa.text}</p>
          <div className="rt-bk__opts">
            <label className={`rt-bk__opt${item.firstAid === "have" ? " is-on" : ""}`}>
              <input type="radio" name={`${id}-fa`} value="have" checked={item.firstAid === "have"} onChange={() => onChange({ firstAid: "have" })} />
              <span><b>{fa.have.label}</b><small>{fa.have.note}</small></span>
            </label>
            <label className={`rt-bk__opt${item.firstAid === "add" ? " is-on" : ""}`}>
              <input type="radio" name={`${id}-fa`} value="add" checked={item.firstAid === "add"} onChange={() => onChange({ firstAid: "add" })} />
              <span>
                <b>{fa.add.label} <em>+{formatPrice(fa.add.price)}<s>{formatPrice(fa.add.wasPrice)}</s></em></b>
                <small>{fa.add.note}</small>
              </span>
            </label>
          </div>
          {!item.firstAid && <p className="rt-bk__reqwarn" role="status">Choose one to continue.</p>}
        </fieldset>
      )}
    </article>
  );
}
