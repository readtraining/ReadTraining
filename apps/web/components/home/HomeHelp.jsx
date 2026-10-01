import Link from "next/link";
import React from "react";
import { help } from "@/data/home";

const icons = ["icon-person-3", "icon-message", "icon-book"];

// Need help: contained dark card with copy on the left and three contact methods on the right.
export default function HomeHelp() {
  return (
    <section className="layout-pt-md layout-pb-lg">
      <div className="container">
        <div className="rt-help">
          <div className="row y-gap-30 justify-between items-center">
            <div className="col-lg-5">
              <div className="rt-eyebrow rt-eyebrow--pill -onDark"><span className="rt-eyebrow__dot"></span>{help.eyebrow}</div>
              <h2 className="rt-help__title text-white mt-20">{help.title}</h2>
              <p className="rt-help__text">{help.text}</p>
            </div>

            <div className="col-lg-6">
              <div className="rt-help__list">
                {help.options.map((o, i) => (
                  <Link key={o.label} href={o.href} className="rt-help__item">
                    <span className="rt-help__icon"><i className={`${icons[i]} text-16`}></i></span>
                    <span className="rt-help__body">
                      <span className="rt-help__label">{o.label}</span>
                      <span className="rt-help__value">{o.value}</span>
                    </span>
                    <i className="icon-arrow-right text-12 rt-help__arrow"></i>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
