"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useContextElement } from "@/context/Context";
import { basketTotals, hasDate, lineKey, lineParts } from "@/lib/basket";
import { formatPrice, formatShortDate } from "@/lib/format";
import { BASKET_HREF, CATALOGUE_HREF, coursePath } from "@/lib/routes";

// The basket icon's dropdown (the header's mini basket): each course with its date and place, the delegates and the price, a
// remove button, the total, and a way to the full basket. The basket page is where dates, packages and the first aid choice are
// settled, so this only leads there. Empty: a way to find courses.
const CourseCart = () => {
  const { cartCourses, setCartCourses } = useContextElement();
  const totals = basketTotals(cartCourses);
  const remove = (item) => setCartCourses((list) => list.filter((i) => i !== item));

  return (
    <div className="header-cart bg-white -dark-bg-dark-1 rounded-8 rt-mini">
      {cartCourses.length > 0 ? (
        <ul className="rt-mini__list">
          {cartCourses.map((item) => {
            const { total, quantity } = lineParts(item);
            return (
              <li key={lineKey(item)} className="rt-mini__item">
                <Link href={coursePath(item.slug || item.id)} className="rt-mini__thumb" tabIndex={-1} aria-hidden="true">
                  {item.imageSrc && <Image width={96} height={64} src={item.imageSrc} alt="" />}
                </Link>
                <div className="rt-mini__body">
                  <Link href={coursePath(item.slug || item.id)} className="rt-mini__title">{item.title}</Link>
                  <span className="rt-mini__meta">{hasDate(item) ? `${formatShortDate(item.date)} · ${item.city || "Online"}` : "No date chosen"}</span>
                  <span className="rt-mini__price">{quantity > 1 ? `${quantity} × ` : ""}<b>{formatPrice(total)}</b></span>
                </div>
                <button type="button" className="rt-mini__remove" onClick={() => remove(item)} aria-label={`Remove ${item.title}`}>
                  <i className="icon-close text-9" aria-hidden="true"></i>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rt-mini__empty">Your basket is empty.</p>
      )}

      <div className="rt-mini__foot">
        {cartCourses.length > 0 && (
          <div className="rt-mini__total"><span>Subtotal</span><strong>{formatPrice(totals.total)}</strong></div>
        )}
        {cartCourses.length > 0 ? (
          <Link href={BASKET_HREF} className="button -md -purple-1 text-white">View basket<i className="icon-arrow-right text-13 ml-10" aria-hidden="true"></i></Link>
        ) : (
          <Link href={CATALOGUE_HREF} className="button -md -purple-1 text-white">Find courses</Link>
        )}
      </div>
    </div>
  );
};

export default CourseCart;
