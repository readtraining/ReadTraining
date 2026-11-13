"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { basket as copy } from "@/data/basket";
import { MAX_DELEGATES, maxDelegates, bundleOf, firstAidInBundle, hasDate, isSelected, lineParts, modeLabel, needsFirstAid, needsPackage } from "@/lib/basket";
import { formatDateRange, formatPrice } from "@/lib/format";
import SaverBadge from "@/components/skillSaver/SaverBadge";
import { RowMenu } from "@/components/admin/adminParts";
import { QUOTE_HREF, coursePath } from "@/lib/routes";

// One course on one date. Top: the picture, the title, when and where it runs, the package chosen when the date is sold in
// packages. On the right the delegates counter, the line's price and two icon buttons under it: Edit (a pencil, as Hurak's: a
// small menu of what this line can change: the date, `onDates`; the package, `onPackage`; the first aid add-on; or straight to
// the dates when that is all it can change) and Remove (a bin; Undo follows on the page). Under it, on a course whose SIA licence needs first aid: the answer given when booking,
// or the question itself (.rt-bk__req) while it has none (removing the add-on asks it again: the learner then says they hold a
// certificate, never assumed); a package that includes first aid says so instead. The tick box beside the title puts the course
// in this booking or leaves it in the basket for later.
export default function BasketLine({ item, onChange, onRemove, onDates, onPackage }) {
  const { unit, total, was, quantity } = lineParts(item);
  const dated = hasDate(item);
  const courseHref = coursePath(item.slug || item.id);
  const id = `bk-${item.id}-${item.sessionId || "x"}`;
  const fa = copy.firstAid;
  const max = maxDelegates(item);
  const setQuantity = (next) => onChange({ quantity: Math.min(max, Math.max(1, next)) });
  const on = isSelected(item);
  // the package this line was booked with (the line's price is that package's); one still to choose stops payment
  const bundle = bundleOf(item);
  const planned = Boolean(item.packages);
  const pickPackage = needsPackage(item);
  // the first aid add-on, when this line has an answer of its own (not one its package gives)
  const aid = dated && needsFirstAid(item) && !firstAidInBundle(item) ? item.firstAid : null;
  const edits = [
    { label: copy.changeDate, onClick: onDates },
    planned && bundle && !pickPackage && { label: copy.package.change, onClick: onPackage },
    aid === "add" && { label: fa.remove, onClick: () => onChange({ firstAid: undefined }) },
    aid === "have" && { label: fa.addItem.replace("{price}", formatPrice(fa.add.price)), onClick: () => onChange({ firstAid: "add" }) },
  ].filter(Boolean);

  return (
    <article className={`rt-bk__line${on ? "" : " is-off"}`} aria-labelledby={`${id}-t`}>
      <div className="rt-bk__row">
        <Link href={courseHref} className="rt-bk__thumb" tabIndex={-1} aria-hidden="true">
          {item.imageSrc && <Image width={220} height={140} src={item.imageSrc} alt="" />}
        </Link>

        <div className="rt-bk__main">
          <div className="rt-bk__titlerow">
            <label className="rt-bk__check">
              <input name="selected" type="checkbox" checked={on} onChange={(e) => onChange({ selected: e.target.checked })} />
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
                {bundle && !pickPackage && <span className="rt-pill -accent"><span className="rt-sr">{copy.package.label}: </span>{bundle.name}</span>}
                {item.skillSaver && <SaverBadge />}
              </div>
              {pickPackage && (
                <div className="rt-bk__nodate" role="status">
                  <p>{copy.package.none}</p>
                  <button type="button" className="button -sm -purple-1 text-white" aria-haspopup="dialog" onClick={onPackage}>{copy.package.choose}<span className="rt-sr"> for {item.title}</span></button>
                </div>
              )}
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
            <button type="button" aria-label="Add one delegate" disabled={quantity >= max} onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>
          <p className="rt-bk__price">
            <strong>{formatPrice(total)}</strong>
            {was > 0 && <s><span className="rt-sr">Was </span>{formatPrice(was)}</s>}
          </p>
          {quantity > 1 && <p className="rt-bk__each">{formatPrice(unit)} each</p>}
          <div className="rt-bk__acts">
            {/* icon buttons: the name is for screen readers, the title shows it on hover */}
            {dated && (edits.length > 1 ? (
              <RowMenu label={`${copy.edit} ${item.title}`} title={copy.edit} trigger={<i className="icon-edit" aria-hidden="true"></i>} triggerClass="rt-bk__icon" items={edits} />
            ) : (
              <button type="button" className="rt-bk__icon" title={copy.edit} aria-haspopup="dialog" onClick={onDates}>
                <i className="icon-edit" aria-hidden="true"></i><span className="rt-sr">{copy.edit}: {copy.changeDate.toLowerCase()} for {item.title}</span>
              </button>
            ))}
            <button type="button" className="rt-bk__icon -danger" title={copy.remove} onClick={onRemove}>
              <i className="icon-bin" aria-hidden="true"></i><span className="rt-sr">{copy.remove} {item.title}</span>
            </button>
          </div>
        </div>
      </div>

      {quantity >= max && (
        <p className="rt-bk__note">{max < MAX_DELEGATES ? `This date has ${max} places. Need more?` : `Need more than ${MAX_DELEGATES} places?`} <Link href={`${QUOTE_HREF}?course=${item.id}`} className="fb-textlink">Ask for a group quote</Link></p>
      )}

      {dated && needsFirstAid(item) && firstAidInBundle(item) && (
        <p className="rt-bk__note rt-bk__inpkg"><i className="icon-check text-10" aria-hidden="true"></i>Emergency First Aid at Work is included in your {bundle?.name || "package"} package.</p>
      )}

      {aid && (
        <p className="rt-bk__note rt-bk__inpkg">
          <i className="icon-check text-10" aria-hidden="true"></i>
          <span>{aid === "add" ? `${fa.add.short} (+${formatPrice(fa.add.price)} each)` : fa.have.short}</span>
        </p>
      )}

      {dated && needsFirstAid(item) && !firstAidInBundle(item) && !item.firstAid && (
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
                <b>{fa.add.label} <em>+{formatPrice(fa.add.price)}{fa.add.wasPrice > fa.add.price && <s>{formatPrice(fa.add.wasPrice)}</s>}</em></b>
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
