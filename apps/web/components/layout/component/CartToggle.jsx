"use client";
import React from "react";
import Link from "next/link";
import { useContextElement } from "@/context/Context";
import { BASKET_HREF } from "@/lib/routes";

// The header's basket: straight to the basket page, with the number of courses in it
const CartToggle = ({ allClasses, parentClassess }) => {
  const { cartCourses } = useContextElement();
  const count = cartCourses.length;
  return (
    <div className={parentClassess ? parentClassess : ""}>
      <Link href={BASKET_HREF} style={{ position: "relative" }} className={allClasses || ""} aria-label={`Basket, ${count} ${count === 1 ? "item" : "items"}`}>
        <i className="text-20 icon icon-basket" aria-hidden="true"></i>
        <div className="cartProductCount" aria-hidden="true">
          {count > 9 ? "9+" : count}
        </div>
      </Link>
    </div>
  );
};

export default CartToggle;
