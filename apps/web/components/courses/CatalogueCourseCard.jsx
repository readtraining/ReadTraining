import React, { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useContextElement } from "@/context/Context";
import { categoryName, levelName, methodName } from "@/lib/taxonomy";
import { toItem, trackEvent } from "@/lib/analytics";
import { useWishlist } from "@/lib/wishlist";
import { bookableModes, cheapestMode, firstSession } from "@/lib/courses";
import { MODE_METHOD } from "@/lib/courseModes";
import { lineFor } from "@/lib/basket";
import { BASKET_HREF } from "@/lib/routes";
import { DatesPicker } from "@/components/courseDetail/DatesDialog";
import SaverBadge from "@/components/skillSaver/SaverBadge";
import { api } from "@/lib/trpc/react";
import { toCourseDetail } from "@/lib/catalogueData";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPrice = (n) => gbp.format(Number(n) || 0); // always two decimals: £295.00


// One course row: image (with the save heart) | details | price + actions. Every field except the title is optional and simply
// not shown when missing; a course with no dates yet says so where the price goes and links to its page instead of the basket.
// A real course's dates are asked for (API catalogue.course) when Add to basket is pressed. `onNotify({ message, href?, label? })`
// shows a toast. `listName`: the page's name, for analytics. `mode`: a booking mode (lib/courseModes.js) the course page opens on,
// when the list is for one way of study (/courses/classroom).
export default function CatalogueCourseCard({ course, index = 0, onNotify, distance = "", listName = "All courses", mode = "" }) {
  const { addCourseToCart } = useContextElement();
  const utils = api.useUtils();
  const priced = course.price != null;
  const href = course.detailsHref && mode ? `${course.detailsHref}?mode=${mode}` : course.detailsHref;
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

  // ---- Add to basket (Hurak's list says the same): a course always goes in with a date. The button opens the date pop-up on the study method of the
  // card's "From" price (its cheapest date where the visitor is looking, `priceMethod`), every date there has its own "Book now",
  // and booking goes straight to the basket. A course that runs only on demand has no date to choose and goes straight in.
  // States: idle > loading (fetching the dates, or booking), with a "Try again" error state. As Hurak's, the button stays "Add to
  // basket" when the course is already in the basket: the visitor can book it again on another date, place or provider.
  const [status, setStatus] = useState("idle");
  const [dates, setDates] = useState(null); // { detail, mode } while the pop-up is in use
  const [datesOpen, setDatesOpen] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const router = useRouter();
  const add = (detail, session, quantity = 1) => {
    setStatus("loading");
    try {
      addCourseToCart(detail.id, { ...lineFor(detail, session), quantity });
      trackEvent("add_to_cart", { currency: "GBP", value: session.price * quantity, items: [{ ...toItem(course, index), item_variant: session.id, price: session.price, quantity }] });
      router.push(BASKET_HREF);
    } catch {
      setStatus("error");
      onNotify?.({ message: "We could not add that course. Please try again." });
      later(() => setStatus("idle"), 2000);
    }
  };
  const addToBasket = async () => {
    if (status === "loading") return; // no double click
    let detail = null;
    setStatus("loading");
    try {
      detail = toCourseDetail(await utils.catalogue.course.fetch({ slug: course.slug }));
    } catch {}
    setStatus("idle");
    const modes = detail ? bookableModes(detail) : [];
    if (!modes.length) return onNotify?.({ message: "We could not load the dates for this course. Please try again." });
    if (modes.length === 1 && modes[0] === "ondemand") return add(detail, firstSession(detail, "ondemand"));
    const priceMode = Object.keys(MODE_METHOD).find((m) => MODE_METHOD[m] === course.priceMethod);
    setDates({ detail, mode: modes.includes(priceMode) ? priceMode : cheapestMode(detail) });
    setDatesOpen(true);
  };
  const bookDate = (id, quantity) => add(dates.detail, dates.detail.sessions.find((s) => s.id === id), quantity);

  // Meta row 1: short items only (Duration | Level | N providers). Meta row 2: delivery modes as plain text.
  const metaItems = [course.duration, levelName(course.level), course.providers > 0 ? `${course.providers} ${course.providers === 1 ? "provider" : "providers"}` : ""].filter(Boolean);
  const delivery = course.methods?.length ? course.methods.map(methodName).join(", ") : "";

  const thumb = course.imageSrc ? (
    <Image width={440} height={276} src={course.imageSrc} alt={course.imageAlt || course.title} priority={index < 2} />
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
        {course.skillSaver && <SaverBadge className="-onImage" />}
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
        <span className="rt-card__subject">{categoryName(course.subject)}</span>
        <h3 className="rt-card__title">
          {href ? (
            <Link href={href} className="rt-card__title-link" onClick={() => trackEvent("select_item", { item_list_name: listName, items: [toItem(course, index)] })}>{course.title}</Link>
          ) : (
            <span className="rt-card__title-link">{course.title}</span>
          )}
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
          {/* how far the nearest venue is from the place searched for */}
          {distance && (
            <p className="rt-card__dist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
              {distance}
            </p>
          )}
        </div>
      </div>

      <div className="rt-card__aside">
        {priced ? (
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
        ) : (
          <div className="rt-card__price">
            <strong className="rt-card__soon">New dates coming soon</strong>
          </div>
        )}

        <div className="rt-card__actions">
          {!priced ? null : (
            <button type="button" className={`rt-card__btn rt-card__btn--primary is-${status}`} onClick={addToBasket} aria-disabled={status === "loading" || undefined} aria-haspopup="dialog" aria-live="polite">
              {status === "loading" && <span className="rt-card__spinner" aria-hidden="true"></span>}
              {{ idle: "Add to basket", loading: "Loading", error: "Try again" }[status]}
            </button>
          )}
          {href ? (
            <Link href={href} className="rt-card__btn rt-card__btn--secondary" onClick={() => trackEvent("select_item", { item_list_name: listName, items: [toItem(course, index)] })}>
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
        onBook={bookDate}
      />
    </article>
  );
}
