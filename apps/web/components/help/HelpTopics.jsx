import React from "react";
import Link from "next/link";

// "Browse by topic": one tile per topic (home's team tiles, .rt-teamtiles, as on About and Contact), the whole tile a link,
// with the topic's summary and how many articles it holds.
export default function HelpTopics({ title, topics }) {
  return (
    <section className="fb-section -white" aria-labelledby="rt-help-topics-h">
      <div className="container">
        <div className="fb-head -center">
          <h2 className="fb-title" id="rt-help-topics-h">{title}</h2>
        </div>
        <ul className="rt-teamtiles rt-help__topics">
          {topics.map((t) => (
            <li key={t.slug}>
              <Link href={t.href} className="rt-teamtile">
                <span className="rt-teamtile__icon" aria-hidden="true"><i className={`${t.icon} text-18`}></i></span>
                <span className="rt-teamtile__title">{t.title}</span>
                <span className="rt-teamtile__text">{t.summary}</span>
                <span className="fb-textlink">{`${t.count} ${t.count === 1 ? "article" : "articles"}`}<i className="icon-arrow-right text-12" aria-hidden="true"></i></span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
