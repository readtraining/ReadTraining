import React from "react";
import Image from "next/image";
import Link from "next/link";
import { subjects } from "@/data/home";
import HomeTextLink from "./HomeTextLink";

// Browse by subject: six image tiles (photo, subject, course count, arrow).
export default function HomeSubjects() {
  return (
    <section className="layout-pt-lg layout-pb-lg">
      <div className="container">
        <div className="row y-gap-20 justify-between items-end">
          <div className="col-lg-7">
            <h2 className="sectionTitle__title">Browse by subject</h2>
            <p className="sectionTitle__text mt-5">Every accredited subject, with courses from providers across the UK.</p>
          </div>
          <div className="col-auto">
            <HomeTextLink href="/template/courses-list-1">Browse all subjects</HomeTextLink>
          </div>
        </div>

        <div className="row y-gap-30 pt-40">
          {subjects.map((elm) => (
            <div key={elm.id} className="col-lg-3 col-md-4 col-6">
              <Link href={elm.href} className="rt-subject">
                <div className="rt-subject__image">
                  <Image width={480} height={270} src={`/assets/img/coursesCards/${elm.id}.png`} alt={elm.title} />
                </div>
                <div className="rt-subject__body">
                  <div className="rt-subject__title">{elm.title}</div>
                  <div className="rt-subject__meta">{elm.items.length}+ courses</div>
                  <span className="rt-subject__arrow"><i className="icon-arrow-right text-11"></i></span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
