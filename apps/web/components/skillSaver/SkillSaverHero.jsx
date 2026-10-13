import React from "react";
import Image from "next/image";
import HeroParallax from "@/components/marketing/HeroParallax";
import ProductFrame from "@/components/marketing/ProductFrame";
import { CtaLink, Eyebrow } from "@/components/marketing/parts";
import { formatPrice } from "@/lib/courses";

// Hero in the /for-providers masthead (.bz-masthead: copy left, product visual right with the background shape, a floating
// card and cursor parallax). The visual is a course listing as a Skill Saver learner sees it: the badge, the full price struck
// through, their level price, and the provider's payout note.
export default function SkillSaverHero({ hero: h, discounts }) {
  const l = h.listing;
  const pct = discounts[l.level - 1];
  const saving = (l.price * pct) / 100;
  return (
    <section id="rt-ss-hero" className="masthead -type-3 bg-light-6 bz-masthead" aria-labelledby="rt-ss-hero-h">
      <HeroParallax selector="#rt-ss-hero" />
      <div className="container">
        <div className="row y-gap-30 items-center justify-center">
          <div className="col-xl-6 col-lg-11 relative z-5 fb-heroCol -copy">
            <div className="masthead__content">
              <Eyebrow>{h.eyebrow}</Eyebrow>
              <h1 className="fb-hero__title" id="rt-ss-hero-h">{h.title}</h1>
              <p className="fb-hero__text">{h.text}</p>
              <div className="fb-actions">
                <CtaLink link={h.primary} />
                <CtaLink link={h.secondary} variant="outline" />
              </div>
              <div className="bz-hero2__note mt-15">{h.points.join(" · ")}</div>
            </div>
          </div>

          <div className="col-xl-6 col-lg-8 relative z-2 fb-heroCol -visual">
            <div className="masthead-image bz-masthead__image">
              <div className="masthead-image__img1">
                <div className="masthead-image__shape xl:d-none">
                  <Image width={800} height={800} src="/assets/img/home-4/masthead/shape.svg" alt="" />
                </div>
                <div data-move="20" className="js-mouse-move">
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
                </div>
              </div>

              <div className="masthead-image__el2">
                <div data-move="40" className="shadow-4 img-el px-20 py-15 d-flex items-center bg-white rounded-8 js-mouse-move">
                  <div className="img-el__side"><div className="size-50 d-flex justify-center items-center rounded-full bg-dark-1"><i className="icon-check text-14 text-green-1" aria-hidden="true"></i></div></div>
                  <div className="ml-15"><div className="text-purple-1 text-15 fw-500 lh-1">Discount applied</div><div className="mt-3 text-13">Funded by ReadTraining</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
