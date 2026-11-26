import React from "react";
import Link from "next/link";
import { bookingOptions as d } from "@/data/home";
import { formatPrice } from "@/lib/format";
import { coursePath } from "@/lib/routes";

const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Why book through us: header, four benefit cards, then, as an example, a live course's real packages (`example`: lib/
// catalogueServer.js examplePackages, a provider's price plan on one of its dates), each with every feature of the plan ticked or
// crossed; no example while no live course is sold in packages.
export default function HomeBookingOptions({ example = null }) {
  // every feature the packages name, in the order they first list them
  const features = [];
  for (const t of example?.packages || []) for (const f of t.features) if (!features.some((x) => same(x, f.title))) features.push(f.title);
  return (
    <section className="layout-pt-lg layout-pb-lg bg-light-4">
      <div className="container">
        <div className="row y-gap-40 justify-between items-center">
          <div className="col-lg-5 rt-bo-copy">
            <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{d.eyebrow}</div>
            <h2 className="sectionTitle__title mt-20" style={{ maxWidth: "24ch" }}>{d.title}</h2>
            <p className="sectionTitle__text" style={{ maxWidth: 440 }}>{d.text}</p>
          </div>
          <div className="col-lg-7 rt-bo-cards">
            <div className="rt-benefit-grid">
              {d.benefits.map((b) => (
                <div key={b.title} className="rt-benefit-card">
                  <span className="rt-benefit__icon"><i className={`${b.icon} text-16`}></i></span>
                  <div className="rt-benefit__title mt-15">{b.title}</div>
                  <div className="rt-benefit__text">{b.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {example && (
          <>
            <div className="d-flex justify-center pt-60 lg:pt-50">
              <div className="rt-example-tag">
                <span className="rt-eyebrow text-light-1">{d.example.eyebrow}</span>
                <Link href={coursePath(example.slug)} className="rt-example-tag__course">{example.course}</Link>
                {example.meta && <span className="rt-example-tag__meta">{example.meta}</span>}
              </div>
            </div>

            <div className="row y-gap-24 justify-center pt-25">
              {example.packages.map((t) => (
                <div key={t.key} className={example.packages.length > 3 ? "col-lg-3 col-md-6" : "col-lg-4 col-md-6"}>
                  <div className={`rt-tier${t.popular ? " is-rec" : ""}`}>
                    {t.popular && <span className="rt-tier__badge">Most popular</span>}
                    <div className="rt-tier__type">{t.name}</div>
                    {t.tagline && <div className="rt-tier__text">{t.tagline}</div>}
                    <div className="rt-tier__price"><span>From</span>{formatPrice(t.price)}<small>per learner</small></div>
                    <ul className="rt-tier__list">
                      {features.map((f) => {
                        const mine = t.features.find((x) => same(x.title, f) && x.included);
                        return (
                          <li key={f} className={mine ? "" : "is-off"}>
                            <i className={mine ? "icon-check" : "icon-close"} aria-hidden="true"></i>
                            <span>{!mine && <span className="rt-sr">Not included: </span>}{f}{mine?.value && <>: <strong>{mine.value}</strong></>}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

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
