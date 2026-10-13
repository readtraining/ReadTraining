import React from "react";
import Link from "next/link";

// "Who we help": the centred section head (.fb-head -center) and one tile per side of the marketplace (home's team tiles,
// .rt-teamtiles), each with a text link to where it starts (.fb-textlink).
export default function AboutAudiences({ audiences: a }) {
  return (
    <section className="fb-section -white" aria-labelledby="rt-about-audiences-h">
      <div className="container">
        <div className="fb-head -center">
          <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{a.eyebrow}</div>
          <h2 className="fb-title" id="rt-about-audiences-h">{a.title}</h2>
          <p className="fb-lede">{a.text}</p>
        </div>
        <ul className="rt-teamtiles rt-about__tiles">
          {a.items.map((x) => (
            <li key={x.title} className="rt-teamtile">
              <span className="rt-teamtile__icon" aria-hidden="true"><i className={`${x.icon} text-18`}></i></span>
              <h3 className="rt-teamtile__title">{x.title}</h3>
              <p className="rt-teamtile__text">{x.text}</p>
              <Link href={x.link.href} className="fb-textlink">{x.link.label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
