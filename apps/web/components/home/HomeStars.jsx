import React from "react";

// Five icon-font stars, filled to the rounded rating (default 5). Decorative: the number or label next to it carries the meaning.
// size: "sm" (12px, default), "md" (14px), "lg" (18px). light: green stars for dark backgrounds.
export default function HomeStars({ rating = 5, size = "sm", light = false }) {
  const filled = Math.round(rating);
  return (
    <span className={`rt-stars -${size}${light ? " -light" : ""}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => <i key={n} className={`icon-star${n <= filled ? "" : " is-off"}`}></i>)}
    </span>
  );
}
