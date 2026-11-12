"use client";

import React from "react";
import { useBooking } from "./BookingProvider";

// Hero "Book now", as Hurak's: on a course with dates it opens the date pop-up (each date there has its own "Book now", which goes
// to the basket); a self-paced course has no date, so it goes into the basket straight away; team training (a quote) and a
// course with nothing to book yet take the visitor to the Learning options section instead.
export default function BookNow() {
  const { mode, isInHouse, openDates, addToBasket, status } = useBooking();
  if (!mode || isInHouse) {
    return (
      <a href="#learning-options" className="button -md -purple-1 text-white">
        Book now
      </a>
    );
  }
  const selfPaced = mode === "ondemand";
  return (
    <button
      type="button"
      className="button -md -purple-1 text-white"
      onClick={selfPaced ? addToBasket : openDates}
      aria-haspopup={selfPaced ? undefined : "dialog"}
      disabled={status === "loading"}
      aria-busy={status === "loading" || undefined}
    >
      Book now
    </button>
  );
}
