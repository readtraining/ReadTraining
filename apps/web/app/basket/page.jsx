import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import BasketPage from "@/components/basket/BasketPage";
import { catalogueCourses } from "@/data/courseCatalogue";
import { toCourseCard } from "@/lib/courses";
import { pageMetadata } from "@/lib/seo";
import { BASKET_HREF } from "@/lib/routes";

// The course basket (/basket, where every "Add to basket" and the header's basket lead): our header and footer, the
// title and booking steps, the lines beside the order summary, more courses, need help.
// Components: components/basket; rules and copy: lib/basket.js and data/basket.js.

export const metadata = pageMetadata({ title: "Your basket | ReadTraining", description: "Review the courses and dates in your basket before you pay.", path: BASKET_HREF, noindex: true });

// the most booked courses; the page leaves out any already in the basket
const recommended = [...catalogueCourses].sort((a, b) => b.popularity - a.popularity).slice(0, 8).map(toCourseCard);

export default function CourseCartPage() {
  return (
    <div className="main-content rt-home fb-page rt-bk-page">
      <a href="#rt-bk-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-bk-main" tabIndex={-1}>
          <BasketPage recommended={recommended} />
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
    </div>
  );
}
