"use client";

import React, { useEffect, useRef, useState } from "react";
import { ReviewCard } from "@/components/customerReviews/ReviewsList";
import CataloguePagination from "@/components/courses/CataloguePagination";
import { ErrorState } from "@/components/states/States";
import { api } from "@/lib/trpc/react";
import { trustFigures } from "@/lib/siteContent";
import RatingStars from "./RatingStars";

// "Reviews of Read Training" on a course page: the published reviews that name this course's topic, each with the reviewer's
// own stars and the whole of their words, in the Customer reviews page's cards (three across on a laptop, two on a tablet, one
// on a phone), six to a page with the site's page numbers under them. `reviews` is the first page, from the server
// (lib/courseDetailServer.js: { items, total, pages, general, topic, course }), so search engines read real reviews; another page
// is asked for when it is opened (API content.courseReviews) and kept, so going back to it is instant. Changing page keeps the
// visitor here: the heading scrolls into view (at once with reduced motion), takes the focus, and "Page 2 of 4" is announced.
// A course page can list dates from several providers, so the heading says whose reviews they are. It opens on Read Training's
// rating (the site's trust numbers, the same as the hero's), so the count there and the selection here don't read as a mismatch;
// each card says when it was written (the course is the page itself). When no review names the course, `general`: a few about
// Read Training in general (none names a course or a kind of course), on one page, said to be about Read Training in general,
// not this course; nothing in the section leaves the page. Left out when there are none at all. `course` is the
// topic's name ("" for general ones).
export default function CourseReviews({ reviews }) {
  const utils = api.useUtils();
  const [pages, setPages] = useState(() => ({ 1: reviews?.items ?? [] }));
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [said, setSaid] = useState("");
  const heading = useRef(null);
  const wanted = useRef(1); // the page asked for last: an answer for an earlier click is kept but not shown
  const moved = useRef(false);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heading.current?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "start" });
    heading.current?.focus({ preventScroll: true });
    setSaid(`Page ${page} of ${reviews.pages}`);
  }, [page, reviews?.pages]);

  if (!reviews?.total) return null;
  const { general, course } = reviews;
  const trust = trustFigures();

  const goTo = async (p) => {
    wanted.current = p;
    setFailed(false);
    if (p === page) return setBusy(false); // the page showing: only a load still on its way is dropped
    let items = pages[p];
    if (!items) {
      setBusy(true);
      items = await utils.content.courseReviews.fetch({ topic: reviews.topic, page: p }).then((r) => r.items, () => null);
      if (items) setPages((all) => ({ ...all, [p]: items }));
      if (wanted.current !== p) return;
    }
    setBusy(false);
    if (!items) return setFailed(true);
    moved.current = true;
    setPage(p);
  };

  return (
    <section className="rt-cd__sec" id="course-reviews" aria-labelledby="rt-cd-reviews-h">
      <h2 id="rt-cd-reviews-h" ref={heading} tabIndex={-1}>Reviews of Read Training</h2>
      {trust.rating && trust.reviews ? (
        <div className="rt-cd__rsum">
          <strong className="rt-cd__rsum-n">{trust.rating}</strong>
          <div className="rt-cd__rsum-text">
            <RatingStars rating={trust.rating} />
            <p>
              out of 5 from {trust.reviews} {trust.source ? `${trust.source} ` : ""}reviews of Read Training.{" "}
              {general ? "Below, a few learners in their own words, about Read Training in general rather than this course." : `Below, learners on ${course} in their own words.`}
            </p>
          </div>
        </div>
      ) : (
        <p className="rt-cd__lead">{general ? "A few of our learners' reviews, in their own words, about Read Training in general rather than this course." : `What learners said about their ${course} training with us, in their own words.`}</p>
      )}
      <ul className={`rt-reviews__grid rt-cd__reviews${reviews.total === 1 ? " -one" : ""}`} aria-busy={busy || undefined}>
        {pages[page].map((r) => (
          <li key={r.id}>
            <ReviewCard review={r} meta="date" clamp />
          </li>
        ))}
      </ul>
      {failed && <ErrorState inCard title="We couldn't load those reviews." onRetry={() => goTo(wanted.current)} />}
      {reviews.pages > 1 && (
        <div className="rt-cd__reviews-pages">
          <CataloguePagination page={page} totalPages={reviews.pages} hrefFor={() => "#course-reviews"} onNavigate={goTo} />
        </div>
      )}
      <p className="rt-sr" aria-live="polite">{said}</p>
    </section>
  );
}
