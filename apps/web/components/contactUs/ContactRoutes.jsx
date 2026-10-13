import React from "react";
import Link from "next/link";

// "How can we help?": one tile per need (home's team tiles, .rt-teamtiles, as on the About page), each with the links that
// answer it (.fb-textlink): a page, or the form below with its topic chosen. Training providers get a line under the tiles.
export default function ContactRoutes({ routes: r }) {
  return (
    <section className="fb-section -lavender" aria-labelledby="rt-contact-routes-h">
      <div className="container">
        <div className="fb-head -center rt-contact__routes-head">
          <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{r.eyebrow}</div>
          <h2 className="fb-title" id="rt-contact-routes-h">{r.title}</h2>
          <p className="fb-lede">{r.text}</p>
        </div>
        <ul className="rt-teamtiles rt-contact__routes">
          {r.items.map((x) => (
            <li key={x.title} className="rt-teamtile">
              <span className="rt-teamtile__icon" aria-hidden="true"><i className={`${x.icon} text-18`}></i></span>
              <h3 className="rt-teamtile__title">{x.title}</h3>
              <p className="rt-teamtile__text">{x.text}</p>
              <ul className="rt-contact__links">
                {x.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="fb-textlink">{l.label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="rt-contact__provider">
          {r.provider.text} <Link href={r.provider.link.href} className="fb-textlink">{r.provider.link.label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
        </p>
      </div>
    </section>
  );
}
