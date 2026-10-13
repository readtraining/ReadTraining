"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useHeaderOffset } from "@/components/testPrep/subject/useHeaderOffset";
import { RequestButton } from "./LicenceRequest";

// The licence page's two actions in the hero (as the test prep subject page's): the main one ("Book the course", or "Apply for me"
// / "Request training", which open the page's pop-up) and "See the steps" (the route). On phones and tablets, once these have
// scrolled out of view, the same two show in the fixed bottom bar (.rt-tps__bar).
function Primary({ primary }) {
  const cls = "button -md -purple-1 text-white";
  return primary.href ? <Link href={primary.href} className={cls}>{primary.label}</Link> : <RequestButton className={cls}>{primary.label}</RequestButton>;
}

export default function LicenceActions({ primary, secondary }) {
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
        <Primary primary={primary} />
        <a href={secondary.href} className="button -md -outline-white text-white">{secondary.label}</a>
      </div>
      <div className={`rt-tps__bar${barOn ? " is-on" : ""}`} aria-hidden={!barOn} inert={!barOn}>
        <Primary primary={primary} />
        <a href={secondary.href} className="button -md -outline-purple-1 text-purple-1">{secondary.label}</a>
      </div>
    </>
  );
}
