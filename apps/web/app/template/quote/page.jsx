import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import QuoteForm from "@/components/courseDetail/QuoteForm";
import { getCourseBySlug } from "@/lib/courses";

export const metadata = {
  title: "Get a group quote | ReadTraining",
  description: "Tell us how many people need training and we will send a quote for your team within one working day.",
  alternates: { canonical: "/template/quote" },
};

export default async function QuotePage(props) {
  const query = (await props.searchParams) || {};
  const course = query.course ? getCourseBySlug(String(query.course)) : null;
  const backHref = course ? `/template/courses/${course.slug || course.id}` : "/";

  return (
    <div className="main-content rt-home">
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-cd-main" className="rt-cd rt-q">
          <div className="rt-q__wrap">
            <h1>Get a group quote</h1>
            <p className="rt-q__lead">
              {course ? <>Training your team on <strong>{course.title}</strong>? </> : null}
              Tell us how many people need training and we will reply within one working day.
            </p>
            <QuoteForm courseTitle={course?.title} backHref={backHref} />
          </div>
        </main>
        <HomeFooter />
      </div>
    </div>
  );
}
