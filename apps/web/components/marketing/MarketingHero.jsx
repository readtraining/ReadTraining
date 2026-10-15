import React, { Fragment } from "react";
import Link from "next/link";

// A marketing page's hero (About, Contact, Help Centre): the Test Prep hub's dark band with the home artwork
// (.rt-cat__hero .rt-tp__hero), centred: the on-dark eyebrow pill, the title at the home h1 step (one line per entry of
// `title`), the intro, then either the two actions or `children` (e.g. the Help Centre's search).
// `hero` is { eyebrow, title: [], lead, primary?: { label, href }, secondary?: { label, href } }.
export default function MarketingHero({ hero, children = null }) {
  return (
    <section className="rt-cat__hero rt-tp__hero rt-mhero" aria-labelledby="rt-mhero-title">
      <div className="rt-cat__hero-bg" aria-hidden="true" style={{ backgroundImage: "url(/assets/img/home-1/hero/bg.png)" }}></div>
      <div className="container">
        <div className="text-center">
          <div className="rt-eyebrow rt-eyebrow--pill -onDark"><span className="rt-eyebrow__dot"></span>{hero.eyebrow}</div>
        </div>
        <h1 className="rt-cat__title" id="rt-mhero-title">{hero.title.map((line, i) => <Fragment key={line}>{i > 0 && <br />}{line}</Fragment>)}</h1>
        <p className="rt-tp__lede">{hero.lead}</p>
        {(hero.primary || hero.secondary) && (
          <div className="fb-actions -center">
            {hero.primary && <Link href={hero.primary.href} className="button -md -purple-1 text-white">{hero.primary.label}</Link>}
            {hero.secondary && <Link href={hero.secondary.href} className="button -md -outline-white text-white">{hero.secondary.label}</Link>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
