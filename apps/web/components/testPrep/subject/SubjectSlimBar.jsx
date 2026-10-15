"use client";

import React, { useEffect, useRef, useState } from "react";
import { scrollToTests } from "./scrollToTests";

// The subject page's slim bar: the course page's slim bar (.rt-cd__slim, same look and behaviour), shown only while the page
// title (#rt-tps-title, the H1) is out of view. Left: the test title, the "Free mock test" tag and the key facts. Right: links
// to the page's main blocks (only those on the page), with the current one underlined (scrollspy), and "Start free test". Links show from 1200px,
// the facts from 992px, as on the course page. While it shows, <body> gets "course-scrolled", so the site header slides away
// (the course page's rule) and the sticky card moves up under the bar.
export default function SubjectSlimBar({ title, tag, facts, links, startLabel }) {
  const [on, setOn] = useState(false);
  const [active, setActive] = useState(links[0]?.id);
  const activeRef = useRef(active);

  useEffect(() => {
    const h1 = document.getElementById("rt-tps-title");
    if (!h1 || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setOn(!entry.isIntersecting), { rootMargin: "-80px 0px 0px 0px" });
    io.observe(h1);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.body.classList.toggle("course-scrolled", on);
    return () => document.body.classList.remove("course-scrolled");
  }, [on]);

  // Scrollspy: the current block is the last one whose top has passed the line under the bar (rAF-throttled).
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const line = 72 + 24 + 40; // under the bar, past where a linked block stops (its scroll-margin), so it counts as reached
      let current = links[0]?.id;
      for (const l of links) {
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top <= line) current = l.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = links[links.length - 1]?.id;
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
  }, [links]);

  return (
    <div className={`rt-cd__slim${on ? " is-on" : ""}`} aria-hidden={!on} inert={!on}>
      <div className="container rt-cd__slim-in">
        <div className="rt-cd__slim-left">
          <strong className="rt-cd__slim-title">{title}</strong>
          <div className="rt-cd__slim-meta">
            <span className="rt-pill -accent">{tag}</span>
            {facts.length > 0 && <span className="rt-tps__slim-facts">{facts.join(" · ")}</span>}
          </div>
        </div>
        <div className="rt-tps__slim-right">
        {links.length > 1 && (
          <nav className="rt-cd__slim-nav" aria-label="On this page">
            <ul>
              {links.map((l) => (
                <li key={l.id}>
                  <a href={`#${l.id}`} aria-current={active === l.id ? "true" : undefined}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {startLabel && <button type="button" className="button -sm -purple-1 text-white rt-tps__slim-start" onClick={scrollToTests}>{startLabel}</button>}
        </div>
      </div>
    </div>
  );
}
