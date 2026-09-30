"use client";
import React, { useState } from "react";
import Link from "next/link";
import { courseFinder as d } from "@/data/home";
import HomeTextLink from "./HomeTextLink";

const icons = ["icon-badge", "icon-time-management", "icon-document", "icon-graduate-cap"];

// Course finder: pick a goal (segmented tabs), then choose the route (cards).
export default function HomeRoles() {
  const [active, setActive] = useState(0);
  const goal = d.goals[active];

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
            {d.goals.map((g, i) => (
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
