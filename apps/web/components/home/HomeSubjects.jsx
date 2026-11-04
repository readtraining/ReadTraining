import React from "react";
import Image from "next/image";
import Link from "next/link";
import { CATALOGUE_HREF } from "@/lib/routes";
import { loadNav } from "@/lib/catalogueServer";
import HomeTextLink from "./HomeTextLink";

// Browse by subject: a tile for every subject with live courses (the live catalogue, lib/nav.js), in the admin's order: a
// picture (one of its courses' when it has one), its name, its number of courses and an arrow to its page. A subject added in
// admin › Catalogue settings shows up once it has a live course; a retired or empty one isn't shown.
const placeholder = (i) => `/assets/img/coursesCards/${(i % 12) + 1}.png`;

export default async function HomeSubjects() {
  const { subjects } = await loadNav();
  if (!subjects.length) return null;
  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row y-gap-20 justify-between items-end">
          <div className="col-lg-7">
            <h2 className="sectionTitle__title">Browse by subject</h2>
            <p className="sectionTitle__text mt-5">Every subject with courses from approved providers across the UK.</p>
          </div>
          <div className="col-auto">
            <HomeTextLink href={CATALOGUE_HREF}>Browse all courses</HomeTextLink>
          </div>
        </div>

        <div className="row y-gap-30 pt-40">
          {subjects.map((s, i) => (
            <div key={s.slug} className="col-lg-3 col-md-4 col-6">
              <Link href={s.href} className="rt-subject">
                <div className="rt-subject__image">
                  <Image width={480} height={270} src={s.imageUrl || placeholder(i)} alt="" />
                </div>
                <div className="rt-subject__body">
                  <div>
                    <div className="rt-subject__title">{s.name}</div>
                    <div className="rt-subject__count">{s.count} {s.count === 1 ? "course" : "courses"}</div>
                  </div>
                  <span className="rt-subject__arrow" aria-hidden="true"><i className="icon-arrow-right text-11"></i></span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
