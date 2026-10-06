"use client";

import React from "react";

// Hero "Book now": smooth scroll to the Learning options section, where the choice is made.
export default function BookNow() {
  return (
    <button
      type="button"
      className="rt-cd__btn rt-cd__btn--hero"
      onClick={() => document.getElementById("learning-options")?.scrollIntoView({ behavior: "smooth", block: "start" })}
    >
      Book now
    </button>
  );
}
