import React from "react";
import Image from "next/image";
import { stories } from "@/data/home";
import HomeTextLink from "./HomeTextLink";
import HomeVideoStory from "./HomeVideoStory";

const Stars = ({ light }) => (
  <span className={`rt-stars${light ? " -light" : ""}`}>{[0, 1, 2, 3, 4].map((i) => <i key={i} className="icon-star"></i>)}</span>
);

// Customer stories: centered header, featured quote card + 2x2 review grid.
export default function HomeStories() {
  return (
    <section className="layout-pt-lg layout-pb-lg bg-light-4">
      <div className="container">
        <div className="row y-gap-20 justify-between items-end">
          <div className="col-lg-8">
            <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{stories.eyebrow}</div>
            <h2 className="sectionTitle__title mt-20" style={{ maxWidth: "34ch" }}>{stories.title}</h2>
            <p className="sectionTitle__text mt-14">{stories.text}</p>
          </div>
          <div className="col-auto">
            <HomeTextLink href="/template/about-1">Read all reviews</HomeTextLink>
          </div>
        </div>

        <div className="row y-gap-30 pt-40">
          <div className="col-lg-5">
            <HomeVideoStory video={stories.video} stats={stories.stats} />
          </div>

          <div className="col-lg-7">
            <div className="row y-gap-24 rt-stories-grid">
              {stories.reviews.map((r) => (
                <div key={r.author} className="col-md-6">
                  <div className="rt-review">
                    <div className="rt-review__top">
                      <Stars />
                      <span className="rt-review__source">{r.source}</span>
                    </div>
                    <p className="rt-review__quote">{r.text}</p>
                    <div className="rt-review__who">
                      <Image width={36} height={36} src={r.avatar} alt={r.author} />
                      <div>
                        <div className="rt-review__name">{r.author}</div>
                        <div className="rt-review__course">{r.position}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
