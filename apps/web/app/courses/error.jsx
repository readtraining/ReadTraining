"use client";

import { ErrorState } from "@/components/states/States";

// Error boundary for the courses pages: the site's error state, with "Try again" (reset renders the page again).
export default function Error({ reset }) {
  return (
    <section className="rt-cat">
      <div className="container rt-cat__body rt-cat__body--message">
        <ErrorState title="We couldn't load courses." text="Check your connection, then try again." onRetry={() => reset()} />
      </div>
    </section>
  );
}
