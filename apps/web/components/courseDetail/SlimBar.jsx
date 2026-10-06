"use client";

import React, { useEffect, useRef, useState } from "react";
import { useBooking } from "./BookingProvider";
import Stars from "./Stars";
import { formatNumber } from "@/lib/courses";

// The slim bar: fixed under the header and hidden until the page title (#rt-cd-title) scrolls out of view above the screen.
// It carries the course title, badge, rating and students on the left and the page's section links on the right
// (scrollspy: the current section is underlined). Links are hidden under 1180px. While it is showing, the booking
// card collapses its image (BookingCard reads barOn). There is no other sticky bar on the page.
export default function SlimBar({ sections }) {
  const { course, setBarOn } = useBooking();
  const [on, setOn] = useState(false);
  const [active, setActive] = useState(sections[0]?.id);
  const activeRef = useRef(active);

  // Title out of view above the screen => bar on.
  useEffect(() => {
    const title = document.getElementById("rt-cd-title");
    if (!title || typeof IntersectionObserver === "undefined") return;
    const header = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
    const io = new IntersectionObserver(
      ([entry]) => setOn(!entry.isIntersecting && entry.boundingClientRect.bottom <= header() + 1),
      { rootMargin: `-${Math.round(header())}px 0px 0px 0px`, threshold: [0, 1] },
    );
    io.observe(title);
    return () => io.disconnect();
  }, []);
  useEffect(() => setBarOn(on), [on, setBarOn]);

  // Scrollspy over the section links (one rAF-throttled scroll listener, state changes only when the section changes).
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
      const line = offset + 64 + 24;
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
      <div className="rt-cd__slim-in">
        <div className="rt-cd__slim-left">
          <strong className="rt-cd__slim-title">{course.title}</strong>
          {course.badge && <span className="rt-cd__badge">{course.badge}</span>}
          <span className="rt-cd__slim-rate">
            <strong>{course.rating.toFixed(1)}</strong>
            <Stars rating={course.rating} size={14} />
          </span>
          <span className="rt-cd__slim-students">{formatNumber(course.learnerCount)} students enrolled</span>
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
