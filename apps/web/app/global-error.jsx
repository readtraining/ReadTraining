"use client";

import "@/public/assets/sass/styles.scss";
import React from "react";

// The last safety net: when even the site's layout fails, Next shows this instead of a blank page. It has to bring its own
// <html> and <body>, so it is the plain sign-in card (.rt-auth) with "Try again".
export default function GlobalError({ reset }) {
  return (
    <html lang="en-GB">
      <body>
        <div className="rt-home rt-auth">
          <main className="rt-auth__card">
            <h1 className="rt-auth__h1">Something went wrong</h1>
            <p className="rt-auth__lead">The site didn&rsquo;t load. It&rsquo;s a problem on our side. Please try again in a moment.</p>
            <div className="rt-auth__form">
              <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={() => reset()}>Try again</button>
              <a href="/" className="button -md -outline-purple-1 text-purple-1 rt-btn-block">Go to the homepage</a>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
