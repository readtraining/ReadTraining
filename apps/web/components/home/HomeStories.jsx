import React from "react";
import { stories } from "@/data/home";
import { homeReviews, reviewCourse, REVIEWS_HREF } from "@/lib/siteReviews";
import HomeTextLink from "./HomeTextLink";
import ReviewStars from "@/components/customerReviews/ReviewStars";
import SourceLink from "@/components/customerReviews/SourceLink";
import { initials } from "@/components/marketing/parts";

// Customer stories: centred header and the reviews ticked for the home page in a 2x2 grid (admin › Customer reviews;
// `reviews` from loadReviews: the published ones). Each card shows the reviewer's own stars and, when set, where the review was
// first posted as a small link. With none ticked the section is left out, its "Read more reviews" link with it. Call after
// loadTaxonomy() (a review's course name).
export default function HomeStories({ reviews: all = [] }) {
  const reviews = homeReviews(all);
  if (!reviews.length) return null;
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
            <HomeTextLink href={REVIEWS_HREF}>Read more reviews</HomeTextLink>
          </div>
        </div>

        <div className="row y-gap-30 pt-40 rt-stories-grid">
          {reviews.map((r) => (
            <div key={r.id} className="col-md-6">
              <div className="rt-review">
                <div className="rt-review__top">
                  <ReviewStars rating={r.rating} />
                  <SourceLink label={r.origin} href={r.originUrl} />
                </div>
                <p className="rt-review__quote">{r.text}</p>
                <div className="rt-review__who">
                  <span className="rt-review__avatar" aria-hidden="true">{initials(r.name)}</span>
                  <div>
                    <div className="rt-review__name">{r.name}</div>
                    {reviewCourse(r) && <div className="rt-review__course">{reviewCourse(r)}</div>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
