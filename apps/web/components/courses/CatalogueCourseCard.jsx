import React, { Fragment, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useContextElement } from "@/context/Context";
import { filterGroups, getMethodLabel, levels } from "@/data/courseCatalogue";
import { toItem, trackEvent } from "@/lib/analytics";
import { useWishlist } from "@/lib/wishlist";
import { bookableModes, defaultMode, firstSession, formatShortDate, getCourseBySlug } from "@/lib/courses";
import { lineFor } from "@/lib/basket";
import { BASKET_HREF } from "@/lib/routes";
import { DatesPicker } from "@/components/courseDetail/DatesDialog";
import SaverBadge from "@/components/skillSaver/SaverBadge";
import { isSkillSaverCourse } from "@/lib/skillSaver";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPrice = (n) => gbp.format(Number(n) || 0); // always two decimals: £295.00

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
  const [wished, toggleSaved] = useWishlist(course.id);
  const toggleWish = () => {
    try {
      const saving = toggleSaved();
      onNotify?.({ message: saving ? "Saved to your list" : "Removed from your list" });
      if (saving) trackEvent("add_to_wishlist", { items: [toItem(course, index)] });
    } catch {
      onNotify?.({ message: "We could not update your list. Please try again." });
    }
  };

  // ---- add to basket: a course always goes in with a date. The button opens the date pop-up with the course page's first choice
  // already marked (the cheapest date, matching the "From" price), so one more click adds it; another date or study method can be
  // picked first. A course that runs only on demand has no date to choose and goes straight in.
  // States: idle > loading > added (2s) > in basket, with a "Try again" error state.
  const [status, setStatus] = useState("idle");
  const [dates, setDates] = useState(null); // { detail, mode } while the pop-up is in use
  const [datesOpen, setDatesOpen] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const add = (detail, session) => {
    setStatus("loading");
    later(() => {
      try {
        addCourseToCart(detail.id, lineFor(detail, session));
        setStatus("added");
        onNotify?.({ message: `Added to basket: ${session.mode === "ondemand" ? "on demand" : `${formatShortDate(session.date)}, ${session.location}`}`, href: BASKET_HREF, label: "View basket" });
        trackEvent("add_to_cart", { currency: "GBP", value: session.price, items: [{ ...toItem(course, index), item_variant: session.id, price: session.price, quantity: 1 }] });
        later(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
        onNotify?.({ message: "We could not add that course. Please try again." });
      }
    }, 350);
  };
  const addToBasket = () => {
    if (status === "loading" || status === "added" || inBasket) return; // no double add
    const detail = getCourseBySlug(course.id);
    const modes = detail ? bookableModes(detail) : [];
    if (!modes.length) return onNotify?.({ message: "We could not load the dates for this course. Please try again." });
    if (modes.length === 1 && modes[0] === "ondemand") return add(detail, firstSession(detail, "ondemand"));
    setDates({ detail, mode: defaultMode(detail) });
    setDatesOpen(true);
  };
  const confirmDate = (id) => {
    setDatesOpen(false);
    add(dates.detail, dates.detail.sessions.find((s) => s.id === id));
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
        {isSkillSaverCourse(course.id) && <SaverBadge className="-onImage" />}
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
            <button type="button" className={`rt-card__btn rt-card__btn--primary is-${status}`} onClick={addToBasket} aria-disabled={status === "loading" || undefined} aria-haspopup="dialog" aria-live="polite">
              {status === "loading" && <span className="rt-card__spinner" aria-hidden="true"></span>}
              {status === "added" && (
                <svg className="rt-card__tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
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

      <DatesPicker
        open={datesOpen}
        onClose={() => setDatesOpen(false)}
        course={dates?.detail}
        mode={dates?.mode}
        modes={dates ? bookableModes(dates.detail) : undefined}
        onMode={(m) => setDates((d) => ({ ...d, mode: m }))}
        selectedId={dates ? firstSession(dates.detail, dates.mode)?.id : undefined}
        confirm={{ label: "Add to basket", onConfirm: confirmDate }}
      />
    </article>
  );
}
