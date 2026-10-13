import React from "react";
import { IconCheck } from "@/components/marketing/parts";

// The three steps of booking (choose a date > review the basket > pay), with the basket as the current one: finished steps get a
// tick, the current one is filled, the next is outlined. A list with the current step marked, so a screen reader hears "step 2 of 3".
// Also the security jobs application's progress, with its own `label`.
export default function BasketSteps({ steps, current, label = "Booking progress" }) {
  return (
    <ol className="rt-bk__steps" aria-label={label}>
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={step} className={`rt-bk__step is-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="rt-bk__stepn" aria-hidden="true">{state === "done" ? <IconCheck /> : i + 1}</span>
            <span className="rt-bk__stepl">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
