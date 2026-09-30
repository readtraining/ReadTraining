"use client";

import React from "react";
import HomeTextLink from "./HomeTextLink";
import CourceCard from "./HomeCourseCard";
import { courses as coursesData, courseCategories as catagories } from "@/data/home";
import { useState, useEffect } from "react";
export default function HomeCourses() {
  const [filtered, setFiltered] = useState();
  const [category, setCategory] = useState(catagories[0]);
  useEffect(() => {
    if (category == "All courses") {
      setFiltered();
    } else {
      const filteredData = coursesData.filter(
        (elm) => elm.category == category,
      );
      setFiltered(filteredData);
    }
  }, [category]);

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
          {(filtered || coursesData.slice(0, 4)).map((elm, index) => (
            <CourceCard key={index} data={elm} />
          ))}
        </div>

        <div className="pt-30" style={{ marginLeft: -10 }}>
          <HomeTextLink href="/template/courses-list-1">Show all {category} courses</HomeTextLink>
        </div>
      </div>
    </section>
  );
}
