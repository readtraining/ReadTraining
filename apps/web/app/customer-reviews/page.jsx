import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import FaqSection from "@/components/marketing/FaqSection";
import MarketingHero from "@/components/marketing/MarketingHero";
import CtaBand from "@/components/marketing/CtaBand";
import SubjectFacts from "@/components/testPrep/subject/SubjectFacts";
import ReviewsList from "@/components/customerReviews/ReviewsList";
import ReviewsHow from "@/components/customerReviews/ReviewsHow";
import { customerReviews } from "@/data/customerReviews";
import { faqItems } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";
import { loadReviews } from "@/lib/siteReviewsServer";
import { loadTaxonomy } from "@/lib/taxonomyServer";
import { breadcrumbLd, faqPageLd, jsonLd, pageMetadata } from "@/lib/seo";

// Customer reviews (/customer-reviews), in the marketing-page language of /about-us: centred dark hero with the rating facts on
// its edge > a selection of our reviews, filterable by course (lavender) > about our reviews >
// FAQs > call to action > need help > footer. No review structured data: Google does
// not show self-published reviews of the site itself. Copy: data/customerReviews.js (numbers and reviews: the site's editable
// content, loaded first; the reviews: admin › Customer reviews, lib/siteReviewsServer.js). Until a review is published the page
// shows an honest empty state instead of the list, asks search engines not to index it, and is left out of the sitemap and
// the footer.

const PATH = "/customer-reviews";
export async function generateMetadata() {
  const [, reviews] = await Promise.all([loadSiteContent(), loadReviews()]);
  const r = customerReviews();
  return pageMetadata({ title: r.title, description: r.description, path: PATH, noindex: !reviews.length });
}

export default async function CustomerReviewsPage() {
  const [, reviews] = await Promise.all([loadSiteContent(), loadReviews(), loadTaxonomy()]);
  const r = customerReviews(reviews);
  const crumbs = [{ label: "Home", href: "/" }, { label: r.hero.eyebrow }];
  const faq = faqItems("customer-reviews", r.faq.items);
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
          <ReviewsList list={r.list} />
          <ReviewsHow how={r.how} />
          <FaqSection eyebrow={r.faq.eyebrow} title={r.faq.title} items={faq} idPrefix="reviews-faq" className="layout-pt-lg layout-pb-lg bg-light-4" />
          <div className="rt-reviews__cta">
            <CtaBand cta={r.cta} id="rt-reviews-cta-h" />
          </div>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, PATH)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageLd(faq)) }} />
    </div>
  );
}
