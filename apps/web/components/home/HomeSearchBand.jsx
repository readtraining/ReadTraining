"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hero } from "@/data/home";

// Course search directly under the hero, built on the template's segmented search pill
// (home-9 `masthead-form`): one white pill with three fields and a search button.
export default function HomeSearchBand() {
  const router = useRouter();
  const [course, setCourse] = useState("");
  const [where, setWhere] = useState("");
  const [method, setMethod] = useState(hero.methods[0]);
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef(null);

  useEffect(() => {
    if (!ddOpen) return;
    const onDown = (e) => ddRef.current && !ddRef.current.contains(e.target) && setDdOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ddOpen]);

  const submit = (e) => {
    e.preventDefault();
    const q = new URLSearchParams({ q: course.trim(), where: where.trim(), method }).toString();
    router.push(`/template/courses-list-1?${q}`);
  };

  return (
    <section className="rt-searchband">
      <div className="container">
        <div className="rt-searchband__inner">
          <div className="masthead-form rt-searchband__pill bg-white rounded-16 shadow-4 px-10 py-10">
            <form onSubmit={submit} className="d-flex items-center flex-wrap rt-searchband__form">
              <label className="masthead-form__item rt-searchband__item" htmlFor="band-course">
                <i className="icon-search text-16 text-light-1"></i>
                <span className="rt-searchband__text">
                  <span className="rt-searchband__label">Course</span>
                  <input id="band-course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. SIA Door Supervisor" required />
                </span>
              </label>

              <label className="masthead-form__item rt-searchband__item" htmlFor="band-where">
                <i className="icon-location text-16 text-light-1"></i>
                <span className="rt-searchband__text">
                  <span className="rt-searchband__label">Location</span>
                  <input id="band-where" value={where} onChange={(e) => setWhere(e.target.value)} placeholder="e.g. Manchester or M1" />
                </span>
              </label>

              <div className="masthead-form__item rt-searchband__item" ref={ddRef}>
                <div className={`dropdown js-dropdown w-1/1 ${ddOpen ? "-is-dd-active" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setDdOpen((v) => !v)}
                    className="d-flex items-center justify-between w-1/1 text-dark-1"
                    aria-haspopup="listbox"
                    aria-expanded={ddOpen}
                  >
                    <span className="d-flex items-center">
                      <i className="icon-online-learning-4 text-16 text-light-1 mr-12"></i>
                      <span className="rt-searchband__text">
                        <span className="rt-searchband__label">Study method</span>
                        <span className="js-dropdown-title">{method}</span>
                      </span>
                    </span>
                    <i className="icon text-9 icon-chevron-down ml-10"></i>
                  </button>
                  {ddOpen && (
                    <div className="rt-searchband__menu" role="listbox">
                      {hero.methods.map((m) => (
                        <button
                          key={m}
                          type="button"
                          role="option"
                          aria-selected={method === m}
                          onClick={() => {
                            setMethod(m);
                            setDdOpen(false);
                          }}
                          className={`rt-searchband__option${method === m ? " is-active" : ""}`}
                        >
                          <span>{m}</span>
                          {method === m && <i className="icon-check text-10"></i>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="masthead-form__button rt-searchband__button">
                <button type="submit" className="button -purple-1 text-white">
                  Search courses <i className="icon-arrow-right text-14 ml-10"></i>
                </button>
              </div>
            </form>
          </div>

          <div className="rt-searchband__below">
            <Link href="/template/courses-list-1" className="rt-searchband__finder">
              <i className="icon-message text-13"></i> Not sure which course you need? We can help <i className="icon-arrow-right text-11 ml-5"></i>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
