"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { teamBooking as d, employers, subjects, hero } from "@/data/home";

// For employers: dark band with a short intro on the left and a "team quote" mini form on the right.
export default function HomeTeamBooking() {
  const router = useRouter();
  const icons = ["icon-person-3", "icon-save-money", "icon-location"];
  const [form, setForm] = useState({ subject: subjects[0].title, learners: "5", method: hero.methods[1] || hero.methods[0], where: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    router.push(`${d.secondaryHref}?${new URLSearchParams(form).toString()}`);
  };

  return (
    <section id="employers" className="layout-pt-lg layout-pb-lg rt-band">
      <div className="container">
        <div className="row y-gap-40 justify-between items-center">
          <div className="col-xl-5 col-lg-6">
            <div className="rt-eyebrow rt-eyebrow--pill -onDark"><span className="rt-eyebrow__dot"></span>{d.eyebrow}</div>
            <h2 className="sectionTitle__title text-white mt-20" style={{ maxWidth: "20ch" }}>{d.title}</h2>
            <p className="sectionTitle__text" style={{ color: "rgba(255,255,255,0.72)", maxWidth: 520 }}>{d.text}</p>

            <div className="rt-band__list mt-30">
              {d.features.map((f, i) => (
                <div key={f.id} className="rt-band__row">
                  <span className="rt-band__ico"><i className={`${icons[i]} text-16`}></i></span>
                  <div>
                    <div className="rt-band__rowTitle">{f.title}</div>
                    <div className="rt-band__rowText">{f.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rt-band__proof mt-25">
              <span className="rt-band__proofLabel">{d.note}</span>
              <span className="rt-band__logos">{employers.slice(0, 4).map((e) => <span key={e}>{e}</span>)}</span>
            </div>
          </div>

          <div className="col-xl-6 col-lg-6">
            <form onSubmit={submit} className="rt-quote">
              <div className="rt-quote__head">
                <div>
                  <div className="rt-quote__title">Get a team quote</div>
                  <div className="rt-quote__text">Tell us what you need. We reply the same working day.</div>
                </div>
                <span className="rt-quote__badge"><i className="icon-wall-clock text-12 mr-5"></i>Free, no obligation</span>
              </div>

              <div className="rt-quote__grid">
                <label className="rt-field">
                  <span>Course subject</span>
                  <select value={form.subject} onChange={set("subject")}>
                    {subjects.map((s) => <option key={s.id}>{s.title}</option>)}
                  </select>
                </label>
                <label className="rt-field">
                  <span>Number of learners</span>
                  <select value={form.learners} onChange={set("learners")}>
                    {["2 to 4", "5", "6 to 10", "11 to 20", "21 to 50", "50+"].map((n) => <option key={n}>{n}</option>)}
                  </select>
                </label>
                <label className="rt-field">
                  <span>Study method</span>
                  <select value={form.method} onChange={set("method")}>
                    {hero.methods.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                <label className="rt-field">
                  <span>Location or postcode</span>
                  <input value={form.where} onChange={set("where")} placeholder="e.g. Manchester or M1" />
                </label>
              </div>

              <div className="rt-quote__foot">
                <button type="submit" className="button -md -purple-1 text-white">
                  {d.secondary} <i className="icon-arrow-right text-13 ml-10"></i>
                </button>
                <Link href={d.href} className="rt-quote__alt">Or book online for your team <i className="icon-arrow-right text-11 ml-5"></i></Link>
              </div>

              <div className="rt-quote__next">
                {d.next.map((n, i) => (
                  <div key={n.title} className="rt-quote__step">
                    <span className="rt-quote__stepNum">{i + 1}</span>
                    <div>
                      <div className="rt-quote__stepTitle">{n.title}</div>
                      <div className="rt-quote__stepText">{n.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
