import React from "react";
import Link from "next/link";
import { bookingOptions as d } from "@/data/home";

// Why book through us: header, four benefit cards, then three booking-tier cards.
export default function HomeBookingOptions() {
  return (
    <section className="layout-pt-lg layout-pb-lg bg-light-4">
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

        <div className="row y-gap-20 pt-40">
          {d.benefits.map((b) => (
            <div key={b.title} className="col-lg-3 col-md-6">
              <div className="rt-benefit-card">
                <span className="rt-benefit__icon"><i className={`${b.icon} text-16`}></i></span>
                <div className="rt-benefit__title mt-15">{b.title}</div>
                <div className="rt-benefit__text">{b.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="d-flex justify-center pt-50">
          <div className="rt-example-tag">
            <span className="rt-eyebrow text-light-1">{d.example.eyebrow}</span>
            <span className="rt-example-tag__course">{d.example.course}</span>
            <span className="rt-example-tag__meta">{d.example.meta}</span>
          </div>
        </div>

        <div className="row y-gap-24 justify-center pt-25">
          {d.tiers.map((t, i) => (
            <div key={t.type} className="col-lg-4 col-md-6">
              <div className={`rt-tier${t.recommended ? " is-rec" : ""}`}>
                {t.recommended && <span className="rt-tier__badge">Recommended</span>}
                <div className="rt-tier__type">{t.type}</div>
                <div className="rt-tier__text">{t.text}</div>
                <div className="rt-tier__price"><span>From</span>£{t.price}<small>per learner</small></div>
                <ul className="rt-tier__list">
                  {d.features.map((f) => {
                    const on = f.tiers.includes(i);
                    return (
                      <li key={f.label} className={on ? "" : "is-off"}>
                        <i className={on ? "icon-check" : "icon-close"}></i>
                        <span>{f.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="d-flex flex-column items-center pt-40">
          <Link href={d.cta.href} className="button -md -dark-1 text-white">
            {d.cta.label} <i className="icon-arrow-right text-13 ml-10"></i>
          </Link>
          <p className="text-13 text-light-1 mt-15 text-center">{d.footnote}</p>
        </div>
      </div>
    </section>
  );
}
