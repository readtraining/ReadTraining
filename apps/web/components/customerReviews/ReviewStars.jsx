import React from "react";
import Stars from "@/components/home/HomeStars";

// A reviewer's own star rating (the stars are decorative; the label says it).
export default function ReviewStars({ rating }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`}>
      <Stars rating={rating} />
    </span>
  );
}
