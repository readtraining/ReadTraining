import React from "react";
import ProductFrame from "@/components/marketing/ProductFrame";
import { formatPrice } from "@/lib/courses";

// The provider hero's visual: a course listing as a Skill Saver learner sees it: the badge, the full price struck through,
// their level price, and the provider's payout note.
export default function SkillSaverListing({ listing: l, discounts }) {
  const pct = discounts[l.level - 1];
  const saving = (l.price * pct) / 100;
  return (
    <ProductFrame title={l.frame} className="rt-ss__listing">
      <div className="rt-ss__listingHead">
        <div>
          <b>{l.course}</b>
          <span>{l.meta}</span>
        </div>
        <span className="fb-chip -info"><i className="icon-star text-11" aria-hidden="true"></i>{l.badge}</span>
      </div>
      <div className="rt-ss__price">
        <span className="rt-ss__priceLabel">Your Skill Saver Level {l.level} price</span>
        <div className="rt-ss__priceRow">
          <b>{formatPrice(l.price - saving)}</b>
          <s><span className="rt-sr">Was </span>{formatPrice(l.price)}</s>
          <span className="fb-chip -ok">{pct}% off</span>
        </div>
      </div>
      <div className="fb-frameFoot">
        <div><b>{l.foot.title}</b><span>{l.foot.text}</span></div>
        <b>{formatPrice(l.price)}</b>
      </div>
    </ProductFrame>
  );
}
