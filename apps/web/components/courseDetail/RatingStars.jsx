import React from "react";

// Five stars filled to a rating (4.9: four full stars and nine-tenths of the fifth), as the home page's hero shows Read
// Training's rating. Decorative: the rating itself is always written next to it. The colours come from where it sits
// (.rt-cd__hstars on the dark hero, .rt-cd__rsum on the page).
const fills = (rating) => [0, 1, 2, 3, 4].map((i) => Math.max(0, Math.min(1, Number(rating) - i)));

export default function RatingStars({ rating }) {
  return (
    <span className="rt-cd__hstars" aria-hidden="true">
      {fills(rating).map((fill, i) => (
        <span key={i} className="rt-cd__hstar">
          <i className="icon-star" />
          {fill > 0 && <i className="icon-star -on" style={{ width: `${Math.round(fill * 100)}%` }} />}
        </span>
      ))}
    </span>
  );
}
