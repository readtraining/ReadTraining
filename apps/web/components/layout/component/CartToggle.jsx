"use client";
import React from "react";
import { useContextElement } from "@/context/Context";
import { useState, useEffect, useRef } from "react";
import CourseCart from "./CourseCart";

const CartToggle = ({ allClasses, parentClassess }) => {
  const { cartCourses } = useContextElement();
  const [activeCart, setActiveCart] = useState(false);
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

  const count = cartCourses.length;
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
          aria-label={`Basket, ${count} ${count === 1 ? "item" : "items"}`}
          data-el-toggle=".js-cart-toggle"
        >
          <i className="text-20 icon icon-basket"></i>
          <div className="cartProductCount">
            {count > 9 ? "9+" : count}
          </div>
        </button>

        <div
          id="rt-minibasket"
          className={`toggle-element js-cart-toggle ${
            activeCart ? "-is-el-visible" : ""
          }`}
        >
          <CourseCart />
        </div>
      </div>
    </>
  );
};

export default CartToggle;
