"use client";

import React, { useEffect } from "react";
import Link from "next/link";

// Status toast (bottom centre) with an optional action link. Hides itself after `duration` ms.
export default function Toast({ toast, onDone, duration = 4000 }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [toast, duration, onDone]);
  if (!toast) return null;
  return (
    <div className="rt-toast" role="status" aria-live="polite">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12l5 5L20 7" />
      </svg>
      <span>{toast.message}</span>
      {toast.href && (
        <Link href={toast.href} className="rt-toast__action">
          {toast.label || "View"}
        </Link>
      )}
    </div>
  );
}
