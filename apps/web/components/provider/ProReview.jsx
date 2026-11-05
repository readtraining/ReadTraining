import { provider } from "@/data/provider";
import ReviewStars from "@/components/customerReviews/ReviewStars";

/* A training provider's review of ReadTraining, in full (data/provider.js `review`) */
export default function ProReview() {
  const r = provider.review;
  return (
    <section className="layout-pt-lg layout-pb-lg" aria-labelledby="pro-review-title">
      <div className="container">
        <div className="row justify-center text-center">
          <div className="col-xl-7 col-lg-9">
            <div className="rt-section-head">
              <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{r.eyebrow}</div>
              <h2 id="pro-review-title" className="sectionTitle__title mt-20">{r.title}</h2>
            </div>
          </div>
        </div>
        <figure className="pr-review mt-40">
          <ReviewStars rating={r.rating} />
          <h3 className="pr-review__headline">{r.headline}</h3>
          <blockquote className="pr-review__text">
            {r.text.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
          </blockquote>
          <figcaption className="pr-review__who"><b>{r.author}</b> · {r.role}</figcaption>
        </figure>
      </div>
    </section>
  );
}
