import React from "react";

// "How we collect reviews": the section head beside the ticked points list (.fb-points) in /for-business's split layout, so
// readers can see where the reviews come from and what we do with them.
export default function ReviewsHow({ how: h }) {
  return (
    <section className="fb-section -white" aria-labelledby="rt-reviews-how-h">
      <div className="container">
        <div className="fb-split">
          <div>
            <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{h.eyebrow}</div>
            <h2 className="fb-title" id="rt-reviews-how-h">{h.title}</h2>
            <p className="fb-lede">{h.text}</p>
          </div>
          <ul className="fb-points rt-reviews__how">
            {h.points.map((p) => (
              <li key={p.title}>
                <span className="fb-ticks__icon" aria-hidden="true"><i className="icon-check text-10"></i></span>
                <div>
                  <b>{p.title}</b>
                  <span>{p.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
