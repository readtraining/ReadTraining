"use client";
import React, { useState } from "react";
import Link from "next/link";
import { courseFinder as d } from "@/data/home";
import HomeTextLink from "./HomeTextLink";
import { useNav } from "@/lib/navContext";
import { subjectName } from "@/lib/nav";

const icons = ["icon-badge", "icon-time-management", "icon-document", "icon-graduate-cap"];

// Course finder: pick a goal (segmented tabs), then choose the route (cards). A route that searches for some words shows only
// while a live course matches them the way the search does (the words in its title or subject; useNav), so none leads to an
// empty search; a goal with no route left isn't shown.
export default function HomeRoles() {
  const nav = useNav();
  const [active, setActive] = useState(0);
  const has = (q) => {
    const needle = q.toLowerCase();
    return nav.courses.some((c) => c.title.toLowerCase().includes(needle) || subjectName(nav, c.subject).replace(/&/g, "and").toLowerCase().includes(needle));
  };
  const goals = d.goals.map((g) => ({ ...g, routes: g.routes.filter((r) => !r.q || has(r.q)) })).filter((g) => g.routes.length);
  const goal = goals[Math.min(active, goals.length - 1)];
  if (!goal) return null;

  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row justify-center text-center">
          <div className="col-xl-7 col-lg-9">
            <div className="rt-section-head">
              <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{d.eyebrow}</div>
              <h2 className="sectionTitle__title">{d.title}</h2>
              <p className="sectionTitle__text">{d.text}</p>
            </div>
          </div>
        </div>

        <div className="rt-finder mt-40">
          <div className="rt-finder__goals" role="tablist">
            {goals.map((g, i) => (
              <button
                key={g.label}
                type="button"
                role="tab"
                aria-selected={active === i}
                onClick={() => setActive(i)}
                className={`rt-goal${active === i ? " is-active" : ""}`}
              >
                <span className="rt-goal__step">{i + 1}</span>
                <span className="rt-goal__icon"><i className={`${icons[i]} text-18`}></i></span>
                <span className="rt-goal__body">
                  <span className="rt-goal__title">{g.label}</span>
                  <span className="rt-goal__text">{g.text}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="rt-finder__panel" key={active}>
            <div className="rt-finder__head">
              <div>
                <span className="rt-pill -accent">{goal.label}</span>
                <div className="rt-finder__title">{goal.panelTitle}</div>
                <div className="rt-finder__text">{goal.panelText}</div>
              </div>
              <div className="rt-finder__help">
                <i className="icon-message text-13 mr-8"></i>{d.help}
              </div>
            </div>

            <div className="rt-routes">
              {goal.routes.map((r) => (
                <Link key={r.title} href={r.href} className="rt-route">
                  <span className="rt-route__title">{r.title}</span>
                  <span className="rt-route__text">{r.text}</span>
                  <span className="rt-route__arrow"><i className="icon-arrow-right text-11"></i></span>
                </Link>
              ))}
            </div>

            <div className="rt-finder__foot">
              <HomeTextLink href={goal.allHref}>{goal.allLabel}</HomeTextLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
