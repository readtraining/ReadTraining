import React, { Fragment, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useContextElement } from "@/context/Context";
import { filterGroups, getMethodLabel, levels } from "@/data/courseCatalogue";
import { toItem, trackEvent } from "@/lib/analytics";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPrice = (n) => gbp.format(Number(n) || 0); // always two decimals: £295.00
const WISHLIST_KEY = "rt-course-wishlist";
const BASKET_HREF = "/template/course-cart";
const readWishlist = () => {
  try {
    return JSON.parse(window.localStorage.getItem(WISHLIST_KEY) || "[]");
  } catch {
    return [];
  }
};

const subjectLabel = (value) => filterGroups[0].options.find((o) => o.value === value)?.label;
const levelLabel = (value) => levels.find((l) => l.value === value)?.label;

// One course row: image (with the save heart) | details | price + actions. Every field except title and price is
// optional and simply not shown when missing. `onNotify({ message, href?, label? })` shows a toast.
export default function CatalogueCourseCard({ course, index = 0, onNotify }) {
  const { addCourseToCart, isAddedToCartCourses } = useContextElement();
  const href = course.detailsHref;
  const inBasket = isAddedToCartCourses(course.id);
  const hasDiscount = course.wasPrice > course.price;
  const discount = hasDiscount ? Math.round((1 - course.price / course.wasPrice) * 100) : 0;

  // ---- save heart: optimistic, remembered per browser (localStorage) until a real account list exists ----
  const [wished, setWished] = useState(false);
  useEffect(() => setWished(readWishlist().includes(course.id)), [course.id]);
  const toggleWish = () => {
    const list = readWishlist();
    const saving = !list.includes(course.id);
    const next = saving ? [...list, course.id] : list.filter((id) => id !== course.id);
    setWished(saving);
    try {
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
      onNotify?.({ message: saving ? "Saved to your list" : "Removed from your list" });
      if (saving) trackEvent("add_to_wishlist", { items: [toItem(course, index)] });
    } catch {
      setWished(!saving);
      onNotify?.({ message: "We could not update your list. Please try again." });
    }
  };

  // ---- add to basket: idle > loading > added (2s) > in basket, with a "Try again" error state ----
  const [status, setStatus] = useState("idle");
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const addToBasket = () => {
    if (status === "loading" || status === "added" || inBasket) return; // no double add
    setStatus("loading");
    later(() => {
      try {
        addCourseToCart(course.id, {
          id: course.id,
          title: course.title,
          imageSrc: course.imageSrc,
          discountedPrice: course.price,
          originalPrice: course.wasPrice ?? course.price,
        });
        setStatus("added");
        onNotify?.({ message: `${course.title} added to basket`, href: BASKET_HREF, label: "View basket" });
        trackEvent("add_to_cart", { currency: "GBP", value: course.price, items: [{ ...toItem(course, index), quantity: 1 }] });
        later(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
        onNotify?.({ message: "We could not add that course. Please try again." });
      }
    }, 350);
  };
  const showInBasket = inBasket && status !== "added" && status !== "loading";

  // Meta row 1: short items only (Duration | Level | N providers). Meta row 2: delivery modes as plain text.
  const metaItems = [course.duration, levelLabel(course.level), course.providers > 0 ? `${course.providers} providers` : ""].filter(Boolean);
  const delivery = course.methods?.length ? course.methods.map(getMethodLabel).join(", ") : "";

  const thumb = course.imageSrc ? (
    <Image width={440} height={276} src={course.imageSrc} alt="" priority={index < 2} />
  ) : (
    <span className="rt-card__placeholder" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M21 16l-5-5-8 8" /></svg>
    </span>
  );

  return (
    <article className="rt-card">
      <div className="rt-card__media">
        {href ? (
          <Link href={href} className="rt-card__image" tabIndex={-1} aria-hidden="true">
            {thumb}
          </Link>
        ) : (
          <div className="rt-card__image" aria-hidden="true">
            {thumb}
          </div>
        )}
        <button
          type="button"
          className={`rt-card__heart${wished ? " is-saved" : ""}`}
          aria-pressed={wished}
          aria-label={`Save ${course.title}`}
          onClick={toggleWish}
        >
          <svg viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
      </div>

      <div className="rt-card__body">
        <span className="rt-card__subject">{subjectLabel(course.subject)}</span>
        <h3 className="rt-card__title">
          {/* Styled like a link (hover colour + underline); not navigating yet. Swap for <Link href={href}> when wanted. */}
          <span className="rt-card__title-link">{course.title}</span>
        </h3>
        {/* Two lines are always reserved so every card has the same text height */}
        <p className="rt-card__desc" aria-hidden={course.description ? undefined : "true"}>{course.description}</p>
        <div className="rt-card__meta">
          {metaItems.length > 0 && (
            <div className="rt-card__meta1">
              {metaItems.map((item, i) => (
                <Fragment key={item}>
                  {i > 0 && <span className="rt-card__sep" aria-hidden="true"></span>}
                  <span>{item}</span>
                </Fragment>
              ))}
            </div>
          )}
          {delivery && (
            <p className="rt-card__meta2" title={delivery}>
              <span className="rt-sr">Delivery: </span>
              {delivery}
            </p>
          )}
        </div>
      </div>

      <div className="rt-card__aside">
        <div className="rt-card__price">
          <span className="rt-card__from">From</span>
          <div className="rt-card__price-row">
            <strong className="rt-card__current">{formatPrice(course.price)}</strong>
            {hasDiscount && (
              <s className="rt-card__was">
                <span className="rt-sr">was </span>
                {formatPrice(course.wasPrice)}
              </s>
            )}
          </div>
          <span className="rt-card__save">{hasDiscount ? `Save ${discount}%` : ""}</span>
          <span className="rt-card__vat">inc. VAT</span>
        </div>

        <div className="rt-card__actions">
          {showInBasket ? (
            <Link href={BASKET_HREF} className="rt-card__btn rt-card__btn--primary">
              In basket
            </Link>
          ) : (
            <button type="button" className={`rt-card__btn rt-card__btn--primary is-${status}`} onClick={addToBasket} disabled={status === "loading"} aria-live="polite">
              {status === "loading" && <span className="rt-card__spinner" aria-hidden="true"></span>}
              {status === "added" && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
              )}
              {{ idle: "Add to basket", loading: "Adding", added: "Added", error: "Try again" }[status]}
            </button>
          )}
          {href ? (
            <Link href={href} className="rt-card__btn rt-card__btn--secondary" onClick={() => trackEvent("select_item", { item_list_name: "All courses", items: [toItem(course, index)] })}>
              More details
            </Link>
          ) : (
            <button type="button" className="rt-card__btn rt-card__btn--secondary">
              More details
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
