import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import FaqSection from "@/components/marketing/FaqSection";
import MarketingHero from "@/components/marketing/MarketingHero";
import CtaBand from "@/components/marketing/CtaBand";
import SubjectFacts from "@/components/testPrep/subject/SubjectFacts";
import ReviewsFeatured from "@/components/customerReviews/ReviewsFeatured";
import ReviewsList from "@/components/customerReviews/ReviewsList";
import ReviewsHow from "@/components/customerReviews/ReviewsHow";
import { customerReviews } from "@/data/customerReviews";
import { loadSiteContent } from "@/lib/siteContentServer";
import { breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";

// Customer reviews (/customer-reviews), in the marketing-page language of /about-us: centred dark hero with the rating facts on
// its edge > the featured video story > a selection of reviews, filterable by subject (lavender) > how we collect reviews >
// FAQs > call to action > need help > footer. No review structured data: the reviews have no individual ratings, and Google does
// not show self-published reviews of the site itself. Copy: data/customerReviews.js (numbers and reviews: the site's editable
// content, loaded first).

const PATH = "/customer-reviews";
export async function generateMetadata() {
  await loadSiteContent();
  const r = customerReviews();
  return pageMetadata({ title: r.title, description: r.description, path: PATH });
}

export default async function CustomerReviewsPage() {
  await loadSiteContent();
  const r = customerReviews();
  const crumbs = [{ label: "Home", href: "/" }, { label: r.hero.eyebrow }];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: r.faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className="main-content rt-home fb-page rt-tpage rt-reviews-page">
      <a href="#rt-reviews-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-reviews-main" tabIndex={-1}>
          <MarketingHero hero={r.hero} />
          <div className="container">
            <SubjectFacts facts={r.facts} />
          </div>
          <ReviewsFeatured featured={r.featured} />
          <ReviewsList list={r.list} />
          <ReviewsHow how={r.how} />
          <FaqSection eyebrow={r.faq.eyebrow} title={r.faq.title} items={r.faq.items} idPrefix="reviews-faq" className="layout-pt-lg layout-pb-lg bg-light-4" />
          <div className="rt-reviews__cta">
            <CtaBand cta={r.cta} id="rt-reviews-cta-h" />
          </div>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, PATH)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />
    </div>
  );
}
