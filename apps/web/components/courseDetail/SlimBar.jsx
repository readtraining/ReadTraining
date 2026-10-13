"use client";

import React, { useEffect, useRef, useState } from "react";
import { useBooking } from "./BookingProvider";
import Stars from "@/components/home/HomeStars";
import { formatNumber } from "@/lib/courses";

// The slim bar: fixed under the header, shown only while the page title (#rt-cd-title, the H1) is out of view.
// It carries the course title, badge, rating and students on the left and the page's section links on the right
// (scrollspy: the current section is underlined). Links are hidden under 1200px. While it is showing, the booking
// card collapses its image (BookingCard reads barOn). There is no other sticky bar on the page.
export default function SlimBar({ sections }) {
  const { course, setBarOn } = useBooking();
  const [on, setOn] = useState(false);
  const [active, setActive] = useState(sections[0]?.id);
  const activeRef = useRef(active);

  // The H1 is the only trigger: out of view => bar on (and the booking card goes compact); in view => bar off.
  useEffect(() => {
    const title = document.getElementById("rt-cd-title");
    if (!title || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setOn(!entry.isIntersecting), { rootMargin: "-80px 0px 0px 0px" });
    io.observe(title);
    return () => io.disconnect();
  }, []);
  useEffect(() => setBarOn(on), [on, setBarOn]);

  // Page-level hook: while the slim bar shows, <body> gets "course-scrolled" and the CSS slides the site header away.
  // The header component is not touched. The class is always removed again, including when the page is left.
  useEffect(() => {
    document.body.classList.toggle("course-scrolled", on);
    return () => document.body.classList.remove("course-scrolled");
  }, [on]);

  // Scrollspy over the section links (one rAF-throttled scroll listener, state changes only when the section changes).
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
      const line = 72 + 24; // the header is hidden while the bar shows, so only the bar is above the content
      let current = sections[0]?.id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1]?.id;
      if (current !== activeRef.current) {
        activeRef.current = current;
        setActive(current);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [sections]);

  return (
    <div className={`rt-cd__slim${on ? " is-on" : ""}`} aria-hidden={!on} inert={!on}>
      <div className="container rt-cd__slim-in">
        <div className="rt-cd__slim-left">
          <strong className="rt-cd__slim-title">{course.title}</strong>
          <div className="rt-cd__slim-meta">
            {course.badge && <span className="rt-pill -accent">{course.badge}</span>}
            <span className="rt-cd__slim-rate">
              <strong>{course.rating.toFixed(1)}</strong>
              <Stars rating={course.rating} size="md" />
              <a href="#reviews">({formatNumber(course.reviewCount)} ratings)</a>
            </span>
            <span className="rt-cd__slim-students">{formatNumber(course.learnerCount)} students enrolled</span>
          </div>
        </div>
        <nav className="rt-cd__slim-nav" aria-label="On this page">
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} aria-current={active === s.id ? "true" : undefined}>{s.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
