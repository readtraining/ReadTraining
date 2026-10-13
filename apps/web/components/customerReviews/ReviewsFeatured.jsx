import React from "react";
import HomeVideoStory from "@/components/home/HomeVideoStory";

// The featured story: the home page's video story card (HomeVideoStory, without its rating figures, which the facts strip
// already shows) beside the section head, in /for-business's split layout (.fb-split).
export default function ReviewsFeatured({ featured: f }) {
  return (
    <section className="fb-section -white" aria-labelledby="rt-reviews-featured-h">
      <div className="container">
        <div className="fb-split rt-reviews__featured">
          <div>
            <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{f.eyebrow}</div>
            <h2 className="fb-title" id="rt-reviews-featured-h">{f.title}</h2>
            <p className="fb-lede">{f.text}</p>
          </div>
          <HomeVideoStory video={f.video} stats={[]} />
        </div>
      </div>
    </section>
  );
}
