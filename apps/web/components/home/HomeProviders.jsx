import React from "react";
import Image from "next/image";
import Link from "next/link";
import { providers as d } from "@/data/home";

// Partner with us: photo with a provider quote and proof chips on the left,
// invitation copy + three-step "how partnering works" timeline on the right.
export default function HomeProviders() {
  return (
    <section id="providers" className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row y-gap-40 justify-between items-center">
          <div className="col-xl-5 col-lg-6">
            <div className="rt-partner__visual">
              <Image width={520} height={620} src="/assets/img/coursesCards/6.png" alt="Trainer delivering a course" className="rt-partner__photo" />
              <div className="rt-partner__quote">
                <p>“{d.quote.text}”</p>
                <div className="rt-partner__who"><b>{d.quote.author}</b> · {d.quote.role}</div>
              </div>
              <div className="rt-partner__chips">
                {d.proof.map((p) => (
                  <div key={p.label} className="rt-partner__chip"><b>{p.value}</b><span>{p.label}</span></div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-xl-6 col-lg-6">
            <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{d.eyebrow}</div>
            <h2 className="sectionTitle__title mt-20" style={{ maxWidth: "22ch" }}>{d.title}</h2>
            <p className="sectionTitle__text" style={{ maxWidth: 520 }}>{d.text}</p>

            <ol className="rt-steps mt-30">
              {d.steps.map((s, i) => (
                <li key={s.title} className="rt-steps__item">
                  <span className="rt-steps__num">{i + 1}</span>
                  <div>
                    <div className="rt-steps__title">{s.title}</div>
                    <div className="rt-steps__text">{s.text}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="d-flex flex-wrap items-center mt-30" style={{ gap: "12px 18px" }}>
              <Link href={d.href} className="button -md -dark-1 text-white">
                {d.button} <i className="icon-arrow-right text-13 ml-10"></i>
              </Link>
              <span className="text-13 text-light-1">{d.note}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
