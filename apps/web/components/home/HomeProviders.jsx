import React from "react";
import Link from "next/link";
import Image from "next/image";
import { providers as d } from "@/data/home";

const icons = ["icon-list", "icon-notification", "icon-global-search"];

// For training providers: three benefits + link on the left, photo with provider quote and proof on the right.
export default function HomeProviders() {
  return (
    <section id="providers" className="layout-pt-lg layout-pb-lg bg-light-4">
      <div className="container">
        <div className="row y-gap-40 justify-between items-center">
          <div className="col-xl-5 col-lg-6">
            <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{d.eyebrow}</div>
            <h2 className="sectionTitle__title mt-20" style={{ maxWidth: "18ch" }}>{d.title}</h2>
            <p className="sectionTitle__text" style={{ maxWidth: 480 }}>{d.text}</p>

            <div className="rt-benefits mt-30">
              {d.points.map((pt, i) => (
                <div key={pt.title} className="rt-benefit">
                  <span className="rt-benefit__icon"><i className={`${icons[i]} text-16`}></i></span>
                  <div>
                    <div className="rt-benefit__title">{pt.title}</div>
                    <div className="rt-benefit__text">{pt.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="d-flex flex-wrap items-center mt-30" style={{ gap: "12px 18px" }}>
              <Link href={d.href} className="button -md -dark-1 text-white">
                {d.button} <i className="icon-arrow-right text-13 ml-10"></i>
              </Link>
              <span className="text-13 text-light-1">{d.note}</span>
            </div>
          </div>

          <div className="col-xl-6 col-lg-6">
            <div className="rt-partner__visual">
              <Image width={520} height={620} src="/assets/img/coursesCards/6.png" alt="Trainer delivering a course" className="rt-partner__photo" />
              <div className="rt-partner__quote">
                <p>“{d.quote.text}”</p>
                <div className="rt-partner__who"><b>{d.quote.author}</b> · {d.quote.role}</div>
              </div>
              <div className="rt-partner__chips">
                {d.proof.map((pr) => (
                  <div key={pr.label} className="rt-partner__chip"><b>{pr.value}</b><span>{pr.label}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
