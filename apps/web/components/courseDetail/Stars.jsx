import React from "react";

const PATH = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8L12 2.5z";

// Five stars, filled to the rounded rating. Decorative: the number or label next to it carries the meaning.
export default function Stars({ rating, size = 16 }) {
  const filled = Math.round(rating);
  return (
    <span className="rt-cd__stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" className={n <= filled ? "is-on" : "is-off"}>
          <path d={PATH} />
        </svg>
      ))}
    </span>
  );
}
