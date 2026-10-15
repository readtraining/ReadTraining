"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import { Eyebrow } from "@/components/marketing/parts";

// A page that failed while loading (a bug or a lost connection): the 404 page's layout with "Try again" (reset re-renders the
// page) and the way home, instead of a blank screen. The error goes to the console for now; with a backend, to error reporting.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="main-content rt-home fb-page">
      <a href="#rt-error-main" className="rt-skip">Skip to main content</a>
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-error-main" tabIndex={-1}>
          <section className="fb-section -white rt-404" aria-labelledby="rt-error-h">
            <div className="container">
              <Eyebrow>Something went wrong</Eyebrow>
              <h1 className="fb-title" id="rt-error-h">This page didn&rsquo;t load</h1>
              <p className="fb-lede">It&rsquo;s a problem on our side, not something you did. Try again, or go back to the homepage.</p>
              <div className="fb-actions">
                <button type="button" className="button -md -purple-1 text-white" onClick={() => reset()}>Try again</button>
                <Link href="/" className="button -md -outline-purple-1 text-purple-1">Go to the homepage</Link>
              </div>
            </div>
          </section>
        </main>
        <HomeFooter />
      </div>
    </div>
  );
}
