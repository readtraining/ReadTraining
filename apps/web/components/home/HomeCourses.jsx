"use client";

import React from "react";
import HomeTextLink from "./HomeTextLink";
import CourceCard from "./HomeCourseCard";
import { CATALOGUE_HREF } from "@/lib/routes";
import { useState } from "react";

// "Popular courses and qualifications": the featured tabs an admin chose, each with its course cards (built on the server from
// the catalogue, app/page.jsx).
export default function HomeCourses({ groups }) {
  const catagories = groups.map((g) => g.name);
  const [category, setCategory] = useState(catagories[0]);
  const shown = (groups.find((g) => g.name === category) || groups[0])?.cards ?? [];

  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <h2 className="sectionTitle__title sm:text-24">Popular courses and qualifications</h2>
        <p className="sectionTitle__text mt-5">
          Browse some of the most booked training options across security, first aid, construction and more.
        </p>

        <div className="rt-tabs mt-30">
          {catagories.map((elm, i) => (
            <button
              key={i}
              onClick={() => setCategory(elm)}
              className={`rt-tabs__button ${category == elm ? "is-active" : ""}`}
              type="button"
            >
              {elm}
            </button>
          ))}
        </div>

        <div className="row y-gap-30 pt-30">
          {shown.map((elm) => (
            <CourceCard key={elm.id} data={elm} />
          ))}
        </div>

        <div className="pt-30" style={{ marginLeft: -10 }}>
          <HomeTextLink href={CATALOGUE_HREF}>Show all {category} courses</HomeTextLink>
        </div>
      </div>
    </section>
  );
}
