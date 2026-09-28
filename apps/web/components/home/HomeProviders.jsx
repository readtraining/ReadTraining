import React from "react";
import Image from "next/image";
import Link from "next/link";
import { providers } from "@/data/home";
export default function HomeProviders() {
  return (
    <section id="providers" className="layout-pt-lg layout-pb-md">
      <div className="container">
        <div className="row y-gap-30 items-center">
          <div className="col-xl-5 offset-xl-1 col-lg-6">
            <Image
              width={730}
              height={530}
              className="w-1/1"
              src="/assets/img/home-2/about/1.png"
              alt="image"
            />
          </div>

          <div className="col-xl-4 offset-xl-1 col-lg-6">
            <h3 className="text-24 lh-1">{providers.title}</h3>
            <p className="mt-20">
              {providers.text}
            </p>
            <div className="y-gap-15 mt-20">
              {providers.points.map((pt) => (
                <div key={pt.title} className="d-flex x-gap-12">
                  <i className="icon-check text-11 text-purple-1 mt-5"></i>
                  <div>
                    <div className="text-15 fw-500 text-dark-1">{pt.title}</div>
                    <div className="text-14 text-light-1">{pt.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="d-inline-block mt-20">
              <Link
                href={providers.href}
                className="button -md -outline-purple-1 text-purple-1"
              >
                {providers.button}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
