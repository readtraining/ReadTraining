import React from "react";

// An article's cover: the category's icon on a tinted panel in the brand colours (.rt-bcover), one tint per category, so the
// blog reads as one series. Decorative: the card's text says what the article is.
export default function BlogCover({ category }) {
  return (
    <div className={`rt-bcover -${category.key}`} aria-hidden="true">
      <span className="rt-bcover__icon"><i className={category.icon}></i></span>
    </div>
  );
}
