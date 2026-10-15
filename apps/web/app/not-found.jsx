import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import PageNotFound from "@/components/notFound/PageNotFound";

// Page not found (any unknown address, and notFound() from a page): our header and footer around components/notFound.
// Next adds noindex to this page itself.
export const metadata = {
  title: "Page not found | ReadTraining",
  description: "The page you were looking for could not be found.",
};

export default function NotFound() {
  return (
    <div className="main-content rt-home fb-page">
      <a href="#rt-404-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-404-main" tabIndex={-1}>
          <PageNotFound />
        </main>
        <HomeFooter />
      </div>
    </div>
  );
}
