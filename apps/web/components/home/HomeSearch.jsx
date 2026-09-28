"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { subjects, popularByLocation } from "@/data/home/menu";

// Navbar search: the icon toggles an inline input (click again to close). A panel under the
// input shows popular courses when empty and live matches as you type, like Hurak's search.

const allCourses = (() => {
  const seen = new Set();
  const out = [];
  subjects.forEach((s) =>
    s.courses.forEach((c) => {
      if (!seen.has(c.label)) {
        seen.add(c.label);
        out.push({
          label: c.label,
          href: c.href,
          subject: s.label,
          providers: Math.max(6, Math.round(s.count / 4)),
          img: `/assets/img/coursesCards/${(out.length % 12) + 1}.png`,
          desc: `${s.label} · accredited, with classroom and online dates UK-wide.`,
        });
      }
    }),
  );
  popularByLocation.forEach((c) => {
    if (!seen.has(c.label)) {
      seen.add(c.label);
      out.push({
        label: c.label,
        href: c.href,
        subject: /first aid/i.test(c.label) ? "First Aid" : /door|security|cctv/i.test(c.label) ? "Security" : /licence/i.test(c.label) ? "Hospitality" : /fire/i.test(c.label) ? "Health and Safety" : "Construction",
        providers: 12,
        img: `/assets/img/coursesCards/${(out.length % 12) + 1}.png`,
        desc: "Popular course · book a date near you.",
      });
    }
  });
  return out;
})();

const popular = ["SIA Door Supervisor", "Emergency First Aid at Work", "Fire Marshal", "Traffic Marshal Course"]
  .map((l) => allCourses.find((c) => c.label === l))
  .filter(Boolean);

function highlight(text, q) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-purple-1">{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  );
}

export default function HomeSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false); // input visible
  const [focused, setFocused] = useState(false); // dropdown visible while the input has focus
  const [q, setQ] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setFocused(false);
      inputRef.current?.blur();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const query = q.trim();
  const results = useMemo(() => {
    if (!query) return [];
    const ql = query.toLowerCase();
    const courses = allCourses.filter((c) => c.label.toLowerCase().includes(ql) || c.subject.toLowerCase().includes(ql)).slice(0, 5);
    const subs = courses.length >= 5 ? [] : subjects.filter((s) => s.label.toLowerCase().includes(ql)).slice(0, 5 - courses.length);
    return { courses, subs };
  }, [query]);

  const submit = (e) => {
    e.preventDefault();
    setOpen(false);
    router.push(`/template/courses-list-1?q=${encodeURIComponent(query)}`);
  };

  const Row = ({ href, title, subject, provider, img, kind }) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className="rt-search-row d-flex items-center text-dark-1"
      style={{ padding: "10px 12px", gap: 10, borderRadius: 10, transition: "background-color .1s" }}
    >
      <span className="overflow-hidden bg-light-3" style={{ width: 60, height: 56, borderRadius: 14, flex: "0 0 auto" }}>
        {img && <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </span>
      <span className="d-flex flex-column justify-center" style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <span className="text-14 fw-500 text-dark-1" style={{ lineHeight: "19px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{title}</span>
        <span className="text-12 text-dark-1" style={{ lineHeight: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
          <span>{kind || "Course"}</span>
          <span className="fw-600" style={{ margin: "0 8px" }}>{subject}</span>
          {provider && <span className="text-light-1">{provider}</span>}
        </span>
      </span>
    </Link>
  );

  return (
    <div ref={wrapRef} className="d-flex items-center" style={{ position: "relative" }}>
      <form
        onSubmit={submit}
        className="d-flex items-center bg-white"
        style={{
          overflow: "hidden",
          transition: "width .3s cubic-bezier(.215,.61,.355,1), opacity .3s ease, padding .3s ease, border-color .15s",
          width: open ? 230 : 0,
          opacity: open ? 1 : 0,
          height: 36,
          borderRadius: 200,
          border: focused ? "1px solid var(--color-purple-1)" : "1px solid var(--color-light-5)",
          padding: open ? "0 4px 0 14px" : "0 0 0 0",
          gap: 8,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search courses..."
          aria-label="Search courses"
          className="text-13 text-dark-1"
          style={{ border: 0, outline: 0, background: "transparent", flex: 1, minWidth: 0, padding: 0 }}
        />
        {/* the same search icon moves inside the pill (right side) while open; clicking it closes */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen(false)}
          aria-label="Close search"
          className="d-flex justify-center items-center rounded-full bg-purple-1 text-white"
          style={{ width: 28, height: 28, flex: "0 0 auto" }}
        >
          <i className="icon-search text-12"></i>
        </button>
      </form>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="d-flex items-center text-white"
        aria-label="Open search"
        aria-hidden={open}
        tabIndex={open ? -1 : 0}
        style={{
          overflow: "hidden",
          transition: "width .3s cubic-bezier(.215,.61,.355,1), opacity .3s ease",
          width: open ? 0 : 20,
          opacity: open ? 0 : 1,
          pointerEvents: open ? "none" : "auto",
        }}
      >
        <i className="text-20 icon icon-search"></i>
      </button>

      {open && focused && (
        <div
          className="bg-white"
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 440,
            zIndex: 120,
            padding: 12,
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,.06)",
            boxShadow: "0 0 0 1px rgba(0,0,0,.05), 0 25px 50px -12px rgba(0,0,0,.25)",
          }}
        >
          <div style={{ maxHeight: 320, overflowY: "auto", overscrollBehavior: "contain", padding: 8 }}>
          {!query && (
            <>
              {popular.map((c) => (
                <Row key={c.label} href={c.href} img={c.img} title={c.label} subject={c.subject} />
              ))}
            </>
          )}

          {query && (
            <>
              {results.courses.map((c) => (
                <Row key={c.label} href={c.href} img={c.img} title={highlight(c.label, query)} subject={c.subject} provider={`${c.providers} Course providers`} />
              ))}
              {results.subs.map((s) => (
                <Row key={s.label} href={s.href} img={`/assets/img/coursesCards/${(s.count % 12) + 1}.png`} title={highlight(s.label, query)} kind="Subject" subject={s.label} provider={`${s.count} courses`} />
              ))}
              {results.courses.length === 0 && results.subs.length === 0 && (
                <div className="text-13 text-light-1 px-12 py-15">No matches for “{query}”. Try a course name like “first aid” or a subject like “security”.</div>
              )}
              <button type="button" onClick={submit} className="d-block w-1/1 text-left text-12 fw-500 text-purple-1 px-12 py-10 mt-5">
                Press Enter to see all results for “{query}” <i className="icon-arrow-right text-11 ml-5"></i>
              </button>
            </>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
