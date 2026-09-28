import Link from "next/link";
import React from "react";
import { help } from "@/data/home";

export default function HomeHelp() {
  return (
    <section className="pt-80 pb-80 md:pt-60 md:pb-60 bg-purple-1">
      <div className="container">
        <div className="row y-gap-20 justify-between items-center">
          <div className="col-xl-4 col-lg-5">
            <h2 className="text-30 lh-15 text-white">
              {help.title}
            </h2>
            <p className="text-white mt-10">
              {help.text}
            </p>
          </div>

          <div className="col-auto d-flex flex-wrap x-gap-15 y-gap-10">
            {help.options.slice(0, 2).map((o) => (
              <a key={o.label} href={o.href} className="button -md -outline-white text-white">
                {o.label}: {o.value}
              </a>
            ))}
            <Link
              href={help.href}
              className="button -md -white text-dark-1"
            >
              {help.button}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
