"use client";

import React from "react";
import { useBooking } from "./BookingProvider";

// Hero "Book now", as Hurak's (the page's main button, a size bigger than the others): on a course with dates it opens the date
// pop-up, the same as the booking card's and the mobile bar's (BookingProvider bookNow); a self-paced course has no date, so it
// goes on to its package and first aid steps, then the basket; team training (a quote) and a course with nothing to book yet take
// the visitor to the Learning options section instead.
export default function BookNow() {
  const { mode, isInHouse, bookNow, status } = useBooking();
  if (!mode || isInHouse) {
    return (
      <a href="#learning-options" className="button -md -purple-1 text-white rt-cd__booknow">
        Book now
      </a>
    );
  }
  const selfPaced = mode === "ondemand";
  return (
    <button
      type="button"
      className="button -md -purple-1 text-white rt-cd__booknow"
      onClick={bookNow}
      aria-haspopup={selfPaced ? undefined : "dialog"}
      disabled={status === "loading"}
      aria-busy={status === "loading" || undefined}
    >
      Book now
    </button>
  );
}
