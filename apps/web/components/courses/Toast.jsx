"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";

// Status toast (bottom centre) with an optional action link. Hides itself after `duration` ms. `quiet` when the page already
// reads the message out in its own live region. `toast.error`: something went wrong, so no tick, read out at once, and it stays
// twice as long. `toast.busy`: something still running ("Copying…"), so no tick, and it stays until the next message replaces it.
export default function Toast({ toast, onDone, duration = 4000, quiet = false }) {
  const error = Boolean(toast?.error);
  const done = useRef(onDone);
  done.current = onDone; // the latest, without restarting the timer when the page draws again
  useEffect(() => {
    if (!toast || toast.busy) return;
    const t = setTimeout(() => done.current?.(), toast.error ? duration * 2 : duration);
    return () => clearTimeout(t);
  }, [toast, duration]);
  if (!toast) return null;
  return (
    <div className="rt-toast" role={quiet ? undefined : error ? "alert" : "status"} aria-live={quiet ? undefined : error ? "assertive" : "polite"}>
      {!error && !toast.busy && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12l5 5L20 7" />
        </svg>
      )}
      <span>{toast.message}</span>
      {toast.href && (
        <Link href={toast.href} className="rt-toast__action">
          {toast.label || "View"}
        </Link>
      )}
    </div>
  );
}
