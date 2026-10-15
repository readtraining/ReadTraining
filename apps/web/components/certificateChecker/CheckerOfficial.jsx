import React from "react";

// "Check with the official register too": one tile per regulator or awarding body (home's team tiles, .rt-teamtiles), each
// ending in a link to its own checker (.fb-textlink, with the leaving-the-site arrow). Lavender band.
export default function CheckerOfficial({ official: o }) {
  return (
    <section className="fb-section -lavender" aria-labelledby="rt-cert-official-h">
      <div className="container">
        <div className="fb-head -center">
          <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{o.eyebrow}</div>
          <h2 className="fb-title" id="rt-cert-official-h">{o.title}</h2>
          <p className="fb-lede">{o.text}</p>
        </div>
        <ul className="rt-teamtiles rt-cert__official">
          {o.items.map((x) => (
            <li key={x.title} className="rt-teamtile">
              <span className="rt-teamtile__icon" aria-hidden="true"><i className={`${x.icon} text-18`}></i></span>
              <h3 className="rt-teamtile__title">{x.title}</h3>
              <p className="rt-teamtile__text">{x.text}</p>
              <a href={x.link.href} className="fb-textlink" rel="noopener">
                {x.link.label}<span className="rt-sr"> (official site)</span><i className="icon-arrow-top-right text-12" aria-hidden="true"></i>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
