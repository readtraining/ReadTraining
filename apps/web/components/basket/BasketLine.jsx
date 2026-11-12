"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { basket as copy } from "@/data/basket";
import { MAX_DELEGATES, maxDelegates, bundleOf, firstAidInBundle, hasDate, isSelected, lineParts, modeLabel, needsFirstAid, needsPackage } from "@/lib/basket";
import { formatDateRange, formatPrice } from "@/lib/format";
import SaverBadge from "@/components/skillSaver/SaverBadge";
import { QUOTE_HREF, coursePath } from "@/lib/routes";

// One course on one date. Top: the picture, the title, when and where it runs, the package chosen when the date is sold in
// packages (with "Change package", `onPackage`), and on the right the delegates counter, the line's price and Remove. Under it,
// on a course whose SIA licence needs first aid: the answer given when booking, on one line with Change, or the question itself
// (.rt-bk__req) while it has no answer or is being changed; a package that includes first aid says so instead. The tick box
// beside the title puts the course in this booking or leaves it in the basket for later. The date is chosen and changed here, in
// the date pop-up (`onDates`).
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
  const [faOpen, setFaOpen] = useState(false); // the first aid answer being changed

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
                {item.provider && (
                  <li>
                    <i className="icon-person-3" aria-hidden="true"></i>
                    <span>
                      Provided by {item.provider}
                      {/* their cancellation policy, before paying (it is on their profile, under Terms and policies) */}
                      {item.providerSlug && <> · <Link href={`/providers/${item.providerSlug}#policies`} className="rt-bk__policy">Cancellation policy</Link></>}
                    </span>
                  </li>
                )}
              </ul>
              <div className="rt-bk__tags">
                <span className="rt-pill">{modeLabel(item.mode)}</span>
                {bundle && !pickPackage && <span className="rt-pill -accent"><span className="rt-sr">{copy.package.label}: </span>{bundle.name}</span>}
                {item.skillSaver && <SaverBadge />}
                <button type="button" className="fb-textlink rt-bk__change" aria-haspopup="dialog" onClick={onDates}>{copy.changeDate}<span className="rt-sr"> for {item.title}</span></button>
                {planned && bundle && !pickPackage && <button type="button" className="fb-textlink rt-bk__change" aria-haspopup="dialog" onClick={onPackage}>{copy.package.change}<span className="rt-sr"> for {item.title}</span></button>}
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
          <button type="button" className="rt-bk__remove" onClick={onRemove}>
            <i className="icon-close text-9" aria-hidden="true"></i>Remove<span className="rt-sr"> {item.title}</span>
          </button>
        </div>
      </div>

      {quantity >= max && (
        <p className="rt-bk__note">{max < MAX_DELEGATES ? `This date has ${max} places. Need more?` : `Need more than ${MAX_DELEGATES} places?`} <Link href={`${QUOTE_HREF}?course=${item.id}`} className="fb-textlink">Ask for a group quote</Link></p>
      )}

      {dated && needsFirstAid(item) && firstAidInBundle(item) && (
        <p className="rt-bk__note rt-bk__inpkg"><i className="icon-check text-10" aria-hidden="true"></i>Emergency First Aid at Work is included in your {bundle?.name || "package"} package.</p>
      )}

      {dated && needsFirstAid(item) && !firstAidInBundle(item) && item.firstAid && !faOpen && (
        <p className="rt-bk__note rt-bk__inpkg">
          <i className="icon-check text-10" aria-hidden="true"></i>
          <span>{item.firstAid === "add" ? `${fa.add.short} (+${formatPrice(fa.add.price)} each)` : fa.have.short}</span>
          <button type="button" className="fb-textlink rt-bk__change" onClick={() => setFaOpen(true)}>{fa.change}<span className="rt-sr"> first aid for {item.title}</span></button>
        </p>
      )}

      {dated && needsFirstAid(item) && !firstAidInBundle(item) && (!item.firstAid || faOpen) && (
        <fieldset className={`rt-bk__fs rt-bk__req${item.firstAid ? "" : " is-open"}`}>
          <legend>{fa.title}</legend>
          <p className="rt-bk__reqtext">{fa.text}</p>
          <div className="rt-bk__opts">
            <label className={`rt-bk__opt${item.firstAid === "have" ? " is-on" : ""}`}>
              <input type="radio" name={`${id}-fa`} value="have" checked={item.firstAid === "have"} onChange={() => { onChange({ firstAid: "have" }); setFaOpen(false); }} />
              <span><b>{fa.have.label}</b><small>{fa.have.note}</small></span>
            </label>
            <label className={`rt-bk__opt${item.firstAid === "add" ? " is-on" : ""}`}>
              <input type="radio" name={`${id}-fa`} value="add" checked={item.firstAid === "add"} onChange={() => { onChange({ firstAid: "add" }); setFaOpen(false); }} />
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
