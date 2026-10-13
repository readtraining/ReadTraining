import React from "react";
import Image from "next/image";
import Link from "next/link";
import HeroParallax from "@/components/marketing/HeroParallax";
import ProductFrame from "@/components/marketing/ProductFrame";
import { CtaLink, Eyebrow } from "@/components/marketing/parts";
import heroBg from "@/public/assets/img/home-1/hero/bg.png";

// Hero in the /for-providers masthead layout (.bz-masthead: copy left, product visual right, a floating card with cursor
// parallax), on the home hero's dark background with its green underlined phrase: this page is for individuals, like the rest
// of the learner-facing site (only the business pages use the light masthead). The visual sells the opportunity: an example of
// a candidate's matched roles, each with its pay, so the first thing people see is the work, not a test. Who can apply comes
// further down, and the eligibility questions open the application itself.
export default function JobsHero({ hero: h }) {
  const m = h.matches;
  return (
    <section id="top" className="masthead -type-3 bz-masthead rt-jobs__hero" aria-labelledby="rt-jobs-hero-h">
      <Image src={heroBg} alt="" fill priority sizes="100vw" className="rt-jobs__herobg" />
      <HeroParallax selector="#top" />
      <div className="container">
        <div className="row y-gap-30 items-center justify-center">
          <div className="col-xl-6 col-lg-11 relative z-5 fb-heroCol -copy">
            <div className="masthead__content">
              <Eyebrow dark>{h.eyebrow}</Eyebrow>
              <h1 className="fb-hero__title" id="rt-jobs-hero-h">{h.title} <span className="text-green-1 underline">{h.highlight}</span></h1>
              <p className="fb-hero__text">{h.text}</p>
              <div className="fb-actions">
                <CtaLink link={h.primary} />
                <Link href={h.secondary.href} className="button -md -outline-white text-white fb-btn">{h.secondary.label}</Link>
              </div>
              <div className="bz-hero2__note mt-15">{h.points.join(" · ")}</div>
            </div>
          </div>

          <div className="col-xl-6 col-lg-8 relative z-2 fb-heroCol -visual">
            <div className="masthead-image bz-masthead__image">
              <div className="masthead-image__img1">
                <ProductFrame title={m.frame} className="rt-jobs__frame">
                  <figure className="rt-jobs__matches">
                    <p className="rt-jobs__matcheslead">{m.lead}</p>
                    <ul>
                      {m.items.map((x) => (
                        <li key={x.role} className="rt-jobs__match">
                          <span className="rt-teamtile__icon" aria-hidden="true"><i className={`${x.icon} text-18`}></i></span>
                          <span className="rt-jobs__matchtext">
                            <b>{x.role}{x.chip && <span className="fb-chip -info">{x.chip}</span>}</b>
                            <span>{x.meta}</span>
                          </span>
                          <span className="rt-jobs__matchpay"><b>{x.pay}</b><span>{m.per}</span></span>
                        </li>
                      ))}
                    </ul>
                    <figcaption className="rt-jobs__matchesnote">{m.note}</figcaption>
                  </figure>
                </ProductFrame>
              </div>
              <div className="masthead-image__el2 rt-jobs__float">
                <div data-move="40" className="shadow-4 img-el px-20 py-15 d-flex items-center bg-white rounded-8 js-mouse-move">
                  <div className="img-el__side"><div className="size-50 d-flex justify-center items-center rounded-full bg-purple-1"><i className="icon-save-money text-16 text-white" aria-hidden="true"></i></div></div>
                  <div className="ml-15"><div className="text-purple-1 text-15 fw-500 lh-1">{h.floating.title}</div><div className="mt-3 text-13">{h.floating.text}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
