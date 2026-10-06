"use client";
import { usePathname } from "next/navigation";
import React from "react";
import { useContextElement } from "@/context/Context";
import { useState, useEffect } from "react";
import ShopCart from "./ShopCart";
import CourseCart from "./CourseCart";
import EventCart from "./EventCart";

const CartToggle = ({ allClasses, parentClassess }) => {
  const { cartProducts, cartCourses, cartEvents } = useContextElement();
  const [activeCart, setActiveCart] = useState(false);
  const pathname = usePathname();
  // Which cart to show comes from the real route. The old menu-title match compared only the first path segment, so every
  // /template/... page matched "Shop" or "Events" and the course basket count never showed.
  const isShop = pathname?.startsWith("/template/shop");
  const isEvents = pathname?.startsWith("/template/event");

  return (
    <>
      <div className={parentClassess ? parentClassess : ""}>
        <button
          style={{ position: "relative" }}
          onClick={() => setActiveCart((pre) => !pre)}
          className={`${allClasses ? allClasses : ""}`}
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
