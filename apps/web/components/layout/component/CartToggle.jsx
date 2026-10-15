"use client";
import { usePathname } from "next/navigation";
import React from "react";
import { useContextElement } from "@/context/Context";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import CourseCart from "./CourseCart";

// The template's shop and event carts only show on its demo /template/shop and /template/event pages: loaded on demand, so they
// are not part of every page's download.
const ShopCart = dynamic(() => import("./ShopCart"));
const EventCart = dynamic(() => import("./EventCart"));

const CartToggle = ({ allClasses, parentClassess }) => {
  const { cartProducts, cartCourses, cartEvents } = useContextElement();
  const [activeCart, setActiveCart] = useState(false);
  const pathname = usePathname();
  // Which cart to show comes from the real route. The old menu-title match compared only the first path segment, so every
  // /template/... page matched "Shop" or "Events" and the course basket count never showed.
  const isShop = pathname?.startsWith("/template/shop");
  const isEvents = pathname?.startsWith("/template/event");
  // the mini basket is a drop-down panel: Esc or a click outside closes it, and Esc puts focus back on the basket button
  const boxRef = useRef(null);
  const btnRef = useRef(null);
  useEffect(() => {
    if (!activeCart) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setActiveCart(false);
      btnRef.current?.focus();
    };
    const onDown = (e) => !boxRef.current?.contains(e.target) && setActiveCart(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [activeCart]);

  return (
    <>
      <div className={parentClassess ? parentClassess : ""} ref={boxRef}>
        <button
          ref={btnRef}
          style={{ position: "relative" }}
          aria-expanded={activeCart}
          aria-controls="rt-minibasket"
          onClick={() => setActiveCart((pre) => !pre)}
          className={`${allClasses ? allClasses : ""}`}
          aria-label={`Basket, ${isShop ? cartProducts.length : isEvents ? cartEvents.length : cartCourses.length} items`}
          data-el-toggle=".js-cart-toggle"
        >
          <i className="text-20 icon icon-basket"></i>
          <div className="cartProductCount">
            {isShop && (
              <>{cartProducts.length > 9 ? "9+" : cartProducts.length} </>
            )}
            {isEvents && (
              <>{cartEvents.length > 9 ? "9+" : cartEvents.length} </>
            )}
            {!(isShop || isEvents) && (
              <>{cartCourses.length > 9 ? "9+" : cartCourses.length} </>
            )}
          </div>
        </button>

        <div
          id="rt-minibasket"
          className={`toggle-element js-cart-toggle ${
            activeCart ? "-is-el-visible" : ""
          }`}
        >
          {isShop && <ShopCart />}
          {isEvents && <EventCart />}
          {!(isShop || isEvents) && <CourseCart />}
        </div>
      </div>
    </>
  );
};

export default CartToggle;
