"use client";

import React, { useEffect, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import HomeStars from "@/components/home/HomeStars";
import { testPrepPage } from "@/data/testPrep";
import { getReviews, submitReview } from "@/lib/reviews";
import { focusFirstError } from "@/lib/focusFirstError";
import { EmptyState } from "@/components/states/States";

// "Mock exam reviews" at the end of a subject page (as on the reference, hurak.com): the home section head (eyebrow + title),
// then the reviews, or an empty state with "Give a review". The button opens the test runner's pop-up (Sheet: centred on
// desktop, a bottom sheet on phones) with a 1-5 star rating, name and review; it checks the fields, sends through
// lib/reviews.js (simulated until the reviews endpoint exists) and thanks the reader.
const MIN_TEXT = 20;
const dateLabel = (iso) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));

function ReviewForm({ subject, onDone }) {
  const r = testPrepPage.subject.reviews;
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | failed

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!rating) next.rating = r.errors.rating;
    if (text.trim().length < MIN_TEXT) next.text = r.errors.text;
    setErrors(next);
    if (Object.keys(next).length) return focusFirstError(e.currentTarget);
    setStatus("sending");
    try {
      await submitReview({ subject, rating, name: name.trim(), text: text.trim() });
      onDone();
    } catch {
      setStatus("failed");
    }
  };

  const shown = hover || rating;
  return (
    <form className="rt-tps__rvform" onSubmit={submit} noValidate>
      <fieldset className="rt-tps__rate" aria-describedby={errors.rating ? "rt-rv-rating-err" : undefined}>
        <legend className="rt-tps__rvlabel">{r.ratingLabel}</legend>
        {errors.rating && <p className="rt-q__err" id="rt-rv-rating-err"><span className="rt-sr">Error: </span>{errors.rating}</p>}
        <div className="rt-tps__rate-stars" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={`rt-tps__rate-star${n <= shown ? " is-on" : ""}`} onMouseEnter={() => setHover(n)}>
              <input type="radio" name="rating" id={`rt-rv-star-${n}`} value={n} checked={rating === n} onChange={() => { setRating(n); setErrors((x) => ({ ...x, rating: undefined })); }} />
              <i className="icon-star" aria-hidden="true"></i>
              <span className="rt-sr">{`${n} ${n === 1 ? "star" : "stars"}, ${r.ratingNames[n - 1]}`}</span>
            </label>
          ))}
          <span className="rt-tps__rate-name" aria-hidden="true">{shown ? r.ratingNames[shown - 1] : ""}</span>
        </div>
      </fieldset>

      <label className="rt-field">
        <span>{r.nameLabel}</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={r.namePlaceholder} autoComplete="given-name" maxLength={60} />
      </label>

      <div className="rt-field">
        <label htmlFor="rt-rv-text">{r.textLabel}</label>
        {errors.text && <p className="rt-q__err" id="rt-rv-text-err"><span className="rt-sr">Error: </span>{errors.text}</p>}
        <textarea id="rt-rv-text" value={text} onChange={(e) => { setText(e.target.value); if (errors.text && e.target.value.trim().length >= MIN_TEXT) setErrors((x) => ({ ...x, text: undefined })); }} placeholder={r.textPlaceholder} maxLength={1000} aria-invalid={errors.text ? "true" : undefined} aria-describedby={errors.text ? "rt-rv-text-err" : undefined}></textarea>
      </div>

      {status === "failed" && <p className="rt-q__err" role="alert">{r.failed}</p>}
      <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={status === "sending"}>
        {status === "sending" ? r.sending : r.submit}
      </button>
    </form>
  );
}

export default function SubjectReviews({ subject }) {
  const r = testPrepPage.subject.reviews;
  const [reviews, setReviews] = useState([]);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let live = true;
    getReviews(subject).then((list) => live && setReviews(list || [])).catch(() => {});
    return () => { live = false; };
  }, [subject]);

  const openForm = () => { setSent(false); setOpen(true); };
  const average = reviews.length ? reviews.reduce((n, x) => n + x.rating, 0) / reviews.length : 0;

  return (
    <section className="rt-tps__reviews layout-pt-lg layout-pb-lg" id="reviews" aria-labelledby="rt-tps-reviews-h">
      <div className="container">
        <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{r.eyebrow}</div>
        <h2 className="sectionTitle__title mt-20" id="rt-tps-reviews-h">{r.title}</h2>

        {reviews.length === 0 ? (
          <EmptyState icon="icon-star" title={r.emptyTitle} text={r.emptyText} action={{ label: r.cta, onClick: openForm }} />
        ) : (
          <>
            <div className="rt-tps__rvsummary">
              <strong>{average.toFixed(1)}</strong>
              <HomeStars rating={average} size="md" />
              <span>{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
              <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={openForm}>{r.cta}</button>
            </div>
            <ul className="rt-tps__rvlist">
              {reviews.map((x) => (
                <li key={x.id} className="rt-tps__rvitem">
                  <HomeStars rating={x.rating} />
                  <span className="rt-sr">{`${x.rating} out of 5 stars`}</span>
                  <p className="rt-tps__rvitem-text">{x.text}</p>
                  <p className="rt-tps__rvitem-who">{x.name || "Learner"} · {dateLabel(x.date)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={sent ? r.thanksTitle : r.formTitle} closeLabel={r.close} className="rt-tps__rvsheet">
        {sent ? (
          <div className="rt-tps__rvthanks" role="status">
            <span className="rt-tps__rvthanks-icon" aria-hidden="true"><i className="icon-check"></i></span>
            <p>{r.thanksText}</p>
            <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={() => setOpen(false)}>{r.close}</button>
          </div>
        ) : (
          <ReviewForm subject={subject} onDone={() => setSent(true)} />
        )}
      </Sheet>
    </section>
  );
}
