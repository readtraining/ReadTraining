"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { testPrepPage } from "@/data/testPrep";
import { scrollToTests } from "./scrollToTests";
import { useHeaderOffset } from "./useHeaderOffset";

// The subject page's two actions, in the hero: "Start free test" (scrolls to the mock exams and focuses their heading) and
// "Book a course" (the matching course, else the catalogue). On phones and tablets, once these have scrolled up out of view,
// the same two actions show in a fixed bar at the bottom of the screen (on desktop the slim bar carries "Start free test").
export default function SubjectActions({ bookHref }) {
  const t = testPrepPage.subject;
  const ref = useRef(null);
  const [barOn, setBarOn] = useState(false);
  useHeaderOffset();

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setBarOn(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="rt-tps__actions" ref={ref}>
        <button type="button" className="button -md -purple-1 text-white" onClick={scrollToTests}>{t.startLabel}</button>
        <Link href={bookHref} className="button -md -outline-white text-white">{t.bookLabel}</Link>
      </div>
      <div className={`rt-tps__bar${barOn ? " is-on" : ""}`} aria-hidden={!barOn} inert={!barOn}>
        <button type="button" className="button -md -purple-1 text-white" onClick={scrollToTests}>{t.startLabel}</button>
        <Link href={bookHref} className="button -md -outline-purple-1 text-purple-1">{t.bookLabel}</Link>
      </div>
    </>
  );
}
