"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { topBar } from "@/data/home";

// Small announcement bar above the navbar. Scrolls away with the page while the
// navbar below stays sticky. Dismissible, remembered per browser.
export default function HomeTopBar() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem("rt-topbar-dismissed") === "true") setVisible(false);
    } catch {}
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem("rt-topbar-dismissed", "true");
    } catch {}
  };

  if (!mounted || !visible) return null;

  return (
    <div className="bg-purple-1 text-white" style={{ position: "relative", zIndex: 101, padding: "8px 48px 8px 16px" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <div className="d-flex flex-wrap items-center justify-center text-13" style={{ gap: "6px 28px" }}>
          <div className="d-flex" style={{ gap: 18 }}>
            {topBar.audiences.map((a, i) => (
              <Link key={a.label} href={a.href} className={`text-white ${i === 0 ? "fw-600 text-green-1" : ""}`}>
                {a.label}
              </Link>
            ))}
          </div>
          <div className="d-flex items-center md:d-none" style={{ gap: 8 }}>
            <i className="icon-notification text-14 text-green-1"></i>
            <span className="fw-600">Need help choosing a course?</span>
            <span className="text-light-2">Call {topBar.phone} · {topBar.email}</span>
          </div>
          <Link href="#employers" className="text-13 fw-600 text-dark-1 bg-green-1 rounded-200" style={{ padding: "6px 14px", lineHeight: 1.2 }}>
            Book for your team
          </Link>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-white"
        style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", opacity: 0.7 }}
      >
        <i className="icon-close text-11"></i>
      </button>
    </div>
  );
}
