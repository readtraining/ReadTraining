import React from "react";
import { counters } from "@/data/home";
export default function HomeStats() {
  return (
    <section className="layout-pt-lg layout-pb-lg bg-light-7">
      <div className="container">
        <div className="row justify-center text-center">
          <div className="col-xl-6 col-lg-8 col-md-10">
            <div className="sectionTitle ">
              <h2 className="sectionTitle__title ">Trusted by learners and teams across the UK</h2>

              <p className="sectionTitle__text ">
                From individual learners to recognised employers, people use
                ReadTraining to arrange vocational and compliance training.
              </p>
            </div>
          </div>
        </div>

        <div className="row y-gap-30 pt-60 lg:pt-40">
          {counters.map((elm, i) => (
            <div key={i} className="col-lg-3 col-sm-6">
              <div
                className="counter -type-1"
                data-aos="fade-left"
                data-aos-duration={(i + 1) * 350}
              >
                <div className="counter__number text-purple-1">
                  {elm.number}
                </div>
                <div className="counter__title text-light-1">{elm.title}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
