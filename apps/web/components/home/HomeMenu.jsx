"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  subjects,
  studyMethods,
  regions,
  popularByLocation,
  licences,
  resources,
} from "@/data/home/menu";

// Template navbar menu (markup and classes from components/layout/component/Menu.jsx and the
// header "Explore" flyout), arranged like Hurak: a browse list on the left that drives a
// "popular in…" panel, and a summary card on the right.

const Eyebrow = ({ children }) => (
  <div className="text-13 fw-500 text-light-1 uppercase mb-15" style={{ letterSpacing: ".06em" }}>
    {children}
  </div>
);

function BrowseList({ items, active, onHover, allHref, allLabel }) {
  return (
    <>
      <ul className="mega__list" style={{ margin: "0 -15px" }}>
        {items.map((item, i) => (
          <li key={item.label} onMouseEnter={() => onHover(i)}>
            <Link
              href={item.href || "#"}
              className={`d-flex items-center justify-between rounded-8 px-15 ${
                i === active ? "bg-light-3 text-purple-1 fw-500" : "text-dark-1"
              }`}
              style={{ padding: "8px 15px" }}
            >
              {item.label}
              <i className="icon-chevron-right text-9 ml-10"></i>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={allHref} className="d-inline-flex items-center text-purple-1 fw-500 mt-10">
        {allLabel} <i className="icon-arrow-top-right text-11 ml-8"></i>
      </Link>
    </>
  );
}

function SimpleDropdown({ title, items }) {
  return (
    <li className="menu-item-has-children">
      <Link data-barba href="#">
        {title} <i className="icon-chevron-right text-13 ml-10"></i>
      </Link>
      <ul className="subnav" style={{ minWidth: 340 }}>
        <li className="menu__backButton js-nav-list-back">
          <Link href="#">
            <i className="icon-chevron-left text-13 mr-10"></i> {title}
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.label} className="inActiveMenu">
            <Link href={item.href} className="d-flex items-center" style={{ gap: 14, whiteSpace: "normal" }}>
              <span className="size-40 d-flex justify-center items-center rounded-8 bg-light-3" style={{ flex: "0 0 auto" }}>
                <i className={`${item.icon} text-16 text-purple-1`}></i>
              </span>
              <span style={{ flex: 1 }}>
                <span className="d-block fw-500 text-dark-1">{item.label}</span>
                <span className="d-block text-13 text-light-1" style={{ lineHeight: 1.4 }}>{item.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

export default function HomeMenu({ allClasses, headerPosition }) {
  const [subjectIdx, setSubjectIdx] = useState(subjects.findIndex((s) => s.label === "Security"));
  const [regionIdx, setRegionIdx] = useState(0);
  const subject = subjects[subjectIdx];
  const region = regions[regionIdx];

  return (
    <div className={`header-menu js-mobile-menu-toggle ${headerPosition ? headerPosition : ""}`}>
      <div className="header-menu__content">
        <div className="mobile-bg js-mobile-bg"></div>

        <div className="d-none xl:d-flex items-center px-20 py-20 border-bottom-light">
          <Link href="/template/login" className="text-dark-1">
            Log in
          </Link>
          <Link href="/template/signup" className="text-dark-1 ml-30">
            Sign Up
          </Link>
        </div>

        <div className="menu js-navList">
          <ul className={`${allClasses ? allClasses : ""}`}>
            {/* ---------- Courses ---------- */}
            <li className="menu-item-has-children -has-mega-menu">
              <Link data-barba href="#">
                Courses <i className="icon-chevron-right text-13 ml-10"></i>
              </Link>

              <div className="mega xl:d-none" style={{ minHeight: 0 }}>
                <div className="mega__menu">
                  <div className="row x-gap-40">
                    <div className="col-lg-3">
                      <Eyebrow>Browse by subject</Eyebrow>
                      <BrowseList
                        items={subjects}
                        active={subjectIdx}
                        onHover={setSubjectIdx}
                        allHref="/template/courses-list-1"
                        allLabel="View all subjects"
                      />
                    </div>

                    <div className="col-lg-3 pl-40" style={{ borderLeft: "1px solid var(--color-light-5)" }}>
                      <Eyebrow>Popular in {subject.label}</Eyebrow>
                      <ul className="mega__list">
                        {subject.courses.map((course) => (
                          <li key={course.label} className="inActiveMegaMenu">
                            <Link data-barba href={course.href}>
                              {course.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Link href={subject.href} className="d-inline-flex items-center text-purple-1 fw-500 mt-10">
                        View all {subject.label} courses <i className="icon-arrow-top-right text-11 ml-8"></i>
                      </Link>
                    </div>

                    <div className="col-lg-3 pl-40" style={{ borderLeft: "1px solid var(--color-light-5)" }}>
                      <Eyebrow>Study method</Eyebrow>
                      <div className="y-gap-10">
                        {studyMethods.map((m) => (
                          <div key={m.label}>
                            <Link href={m.href} className="d-flex items-center rounded-8 bg-light-6 px-15 text-dark-1" style={{ gap: 14, padding: "12px 15px" }}>
                              <span className="size-40 d-flex justify-center items-center rounded-full bg-white" style={{ flex: "0 0 auto" }}>
                                <i className={`${m.icon} text-18 text-purple-1`}></i>
                              </span>
                              <span>
                                <span className="d-block fw-500 text-dark-1">{m.label}</span>
                                <span className="d-block text-13 text-light-1">{m.text}</span>
                              </span>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="col-lg-3">
                      <div className="rounded-8 bg-purple-1 text-white h-100 px-30 py-30 d-flex flex-column justify-between">
                        <div>
                          <Eyebrow>
                            <span className="text-white" style={{ opacity: 0.7 }}>Exploration</span>
                          </Eyebrow>
                          <div className="text-45 lh-1 fw-700 text-green-1">{subject.count}</div>
                          <div className="text-16 fw-500 mt-5">courses available</div>
                          <div className="text-14 mt-10" style={{ opacity: 0.85 }}>
                            {subject.label} training from vetted UK providers. Compare dates, venues and prices in one place.
                          </div>
                        </div>
                        <Link href={subject.href} className="button -md -green-1 text-dark-1 fw-500 mt-20 col-12">
                          View all {subject.label} courses
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>

            {/* ---------- Licences & Cards ---------- */}
            <SimpleDropdown title="Licences & Cards" items={licences} />

            {/* ---------- Locations ---------- */}
            <li className="menu-item-has-children -has-mega-menu">
              <Link data-barba href="#">
                Locations <i className="icon-chevron-right text-13 ml-10"></i>
              </Link>

              <div className="mega xl:d-none" style={{ minHeight: 0 }}>
                <div className="mega__menu">
                  <div className="row x-gap-40">
                    <div className="col-lg-3">
                      <Eyebrow>Browse by region</Eyebrow>
                      <BrowseList
                        items={regions.map((r) => ({ ...r, href: "/template/courses-list-3" }))}
                        active={regionIdx}
                        onHover={setRegionIdx}
                        allHref="/template/courses-list-3"
                        allLabel="View all locations"
                      />
                    </div>

                    <div className="col-lg-3 pl-40" style={{ borderLeft: "1px solid var(--color-light-5)" }}>
                      <Eyebrow>Training in {region.label}</Eyebrow>
                      <ul className="mega__list">
                        {region.cities.map((city) => (
                          <li key={city} className="inActiveMegaMenu">
                            <Link data-barba href="/template/courses-list-3">
                              {city}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="col-lg-3 pl-40" style={{ borderLeft: "1px solid var(--color-light-5)" }}>
                      <Eyebrow>Popular courses by location</Eyebrow>
                      <ul className="mega__list">
                        {popularByLocation.slice(0, 9).map((course) => (
                          <li key={course.label} className="inActiveMegaMenu">
                            <Link data-barba href={course.href}>
                              {course.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="col-lg-3">
                      <div className="rounded-8 bg-purple-1 text-white h-100 px-30 py-30 d-flex flex-column justify-between">
                        <div>
                          <Eyebrow>
                            <span className="text-white" style={{ opacity: 0.7 }}>Near you</span>
                          </Eyebrow>
                          <div className="text-45 lh-1 fw-700 text-green-1">100+</div>
                          <div className="text-16 fw-500 mt-5">towns and cities</div>
                          <div className="text-14 mt-10" style={{ opacity: 0.85 }}>
                            Classroom dates across the UK. Enter your postcode to see the venues closest to you.
                          </div>
                        </div>
                        <Link href="/template/courses-list-3" className="button -md -green-1 text-dark-1 fw-500 mt-20 col-12">
                          Search by postcode
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>

            {/* ---------- Resources ---------- */}
            <SimpleDropdown title="Resources" items={resources} />
          </ul>
        </div>
      </div>
    </div>
  );
}
