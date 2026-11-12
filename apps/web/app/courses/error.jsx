"use client";

import { useEffect } from "react";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import { ErrorState } from "@/components/states/States";

// Error boundary for the course pages (/courses and its subject, method and town pages): the site's header and footer around the
// site's error state, with "Try again" (reset renders the page again). It doesn't guess the cause.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="main-content rt-home rt-cat-page">
      <a className="rt-skip" href="#rt-cat-main">Skip to main content</a>
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-cat-main" tabIndex={-1}>
          <section className="rt-cat">
            <div className="container rt-cat__body rt-cat__body--message">
              <ErrorState title="We couldn't load the courses." text="Please try again." onRetry={() => reset()} />
            </div>
          </section>
        </main>
        <HomeFooter />
      </div>
    </div>
  );
}
