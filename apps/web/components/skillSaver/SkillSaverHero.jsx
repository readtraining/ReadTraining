import React from "react";
import Image from "next/image";
import HeroParallax from "@/components/marketing/HeroParallax";
import { CtaLink, Eyebrow } from "@/components/marketing/parts";

// Skill Saver hero in the /for-providers masthead (.bz-masthead: copy left, product visual right with the background shape, a
// floating card and cursor parallax). Shared by both Skill Saver pages: the provider page shows a course listing as a Skill
// Saver learner sees it (SkillSaverListing), the learner page a learner's level (SaverStatus). `float` is the small card.
export default function SkillSaverHero({ hero: h, id, visual, float }) {
  return (
    <section id={id} className="masthead -type-3 bg-light-6 bz-masthead" aria-labelledby={`${id}-h`}>
      <HeroParallax selector={`#${id}`} />
      <div className="container">
        <div className="row y-gap-30 items-center justify-center">
          <div className="col-xl-6 col-lg-11 relative z-5 fb-heroCol -copy">
            <div className="masthead__content">
              <Eyebrow>{h.eyebrow}</Eyebrow>
              <h1 className="fb-hero__title" id={`${id}-h`}>{h.title}</h1>
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
                <div data-move="20" className="js-mouse-move">{visual}</div>
              </div>

              <div className="masthead-image__el2">
                <div data-move="40" className="shadow-4 img-el px-20 py-15 d-flex items-center bg-white rounded-8 js-mouse-move">
                  <div className="img-el__side"><div className="size-50 d-flex justify-center items-center rounded-full bg-dark-1"><i className="icon-check text-14 text-green-1" aria-hidden="true"></i></div></div>
                  <div className="ml-15"><div className="text-purple-1 text-15 fw-500 lh-1">{float.title}</div><div className="mt-3 text-13">{float.text}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
