import Image from "next/image";
import HeroParallax from "./HeroParallax";
import { CtaLink, Eyebrow } from "./parts";

/* Hero shared by /for-business and /for-providers: copy left, dashboard screenshot right
   (home-4 masthead with background shape, two floating cards and cursor parallax). */
export default function MastheadHero({ hero: h, id }) {
  const [f1, f2] = h.floats;
  return (
    <section id={id} className="masthead -type-3 bg-light-6 bz-masthead">
      <HeroParallax selector={`#${id}`} />
      <div className="container">
        <div className="row y-gap-30 items-center justify-center">
          <div className="col-xl-6 col-lg-11 relative z-5 fb-heroCol -copy">
            <div className="masthead__content">
              <Eyebrow>{h.eyebrow}</Eyebrow>
              <h1 className="fb-hero__title">{h.title}</h1>
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
                <Image width={1180} height={440} data-move="20" className="js-mouse-move bz-dashImg" src={h.image.src} alt={h.image.alt} priority />
              </div>

              <div className="masthead-image__el1">
                <div data-move="40" className="lg:d-none img-el px-20 py-15 d-flex items-center bg-white rounded-8 shadow-4 js-mouse-move">
                  <div className={`size-50 d-flex justify-center items-center rounded-full ${f1.circle}`}><i className={`${f1.icon} text-18 ${f1.iconColor}`} aria-hidden="true"></i></div>
                  <div className="ml-15"><div className={`${f1.titleColor} text-15 fw-500 lh-1`}>{f1.title}</div><div className="mt-3 text-13">{f1.text}</div></div>
                </div>
              </div>

              <div className="masthead-image__el2">
                <div data-move="40" className="shadow-4 img-el px-20 py-15 d-flex items-center bg-white rounded-8 js-mouse-move">
                  <div className="img-el__side"><div className={`size-50 d-flex justify-center items-center rounded-full ${f2.circle}`}><i className={`${f2.icon} text-14 ${f2.iconColor}`} aria-hidden="true"></i></div></div>
                  <div className="ml-15"><div className={`${f2.titleColor} text-15 fw-500 lh-1`}>{f2.title}</div><div className="mt-3 text-13">{f2.text}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
