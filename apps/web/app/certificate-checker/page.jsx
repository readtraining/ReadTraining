import React, { Suspense } from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import FaqSection from "@/components/marketing/FaqSection";
import MarketingHero from "@/components/marketing/MarketingHero";
import CheckerIntro from "@/components/certificateChecker/CheckerIntro";
import CheckerCard from "@/components/certificateChecker/CheckerCard";
import CheckerOfficial from "@/components/certificateChecker/CheckerOfficial";
import { certificateChecker as c } from "@/data/certificateChecker";
import { breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";

// Verify a certificate (/certificate-checker), in the marketing-page language of /contact-us: centred dark hero > what the check
// shows beside the checker (the main task, first; the result replaces the form) > the official registers for licences, cards
// and regulated qualifications (lavender) > FAQs > need help > footer. Copy: data/certificateChecker.js.

const PATH = "/certificate-checker";
const crumbs = [{ label: "Home", href: "/" }, { label: c.hero.eyebrow }];

export const metadata = pageMetadata({ title: c.title, description: c.description, path: PATH });

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: c.faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function CertificateCheckerPage() {
  return (
    <div className="main-content rt-home fb-page rt-tpage rt-cert-page">
      <a href="#rt-cert-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-cert-main" tabIndex={-1}>
          <MarketingHero hero={c.hero} />
          <CheckerIntro intro={c.intro}>
            <Suspense fallback={null}>
              <CheckerCard form={c.form} result={c.result} />
            </Suspense>
          </CheckerIntro>
          <CheckerOfficial official={c.official} />
          <FaqSection eyebrow={c.faq.eyebrow} title={c.faq.title} items={c.faq.items} idPrefix="cert-faq" />
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, PATH)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />
    </div>
  );
}
