import React, { Suspense } from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import FaqSection from "@/components/marketing/FaqSection";
import MarketingHero from "@/components/marketing/MarketingHero";
import ContactRoutes from "@/components/contactUs/ContactRoutes";
import ContactChannels from "@/components/contactUs/ContactChannels";
import ContactForm from "@/components/contactUs/ContactForm";
import { contact } from "@/data/contact";
import { topBar } from "@/data/home";
import { abs, breadcrumbLd, jsonLd, pageMetadata, SITE_URL } from "@/lib/seo";

// Contact us (/contact-us), in the site's marketing-page language (as /about-us and /for-business; `fb-page rt-tpage`): centred
// dark hero > ways to reach us beside the form (the main task, first) > how can we help (one tile per need, linking to a page or
// to the form with its topic chosen; lavender band) > FAQs (only what the tiles do not answer) > footer. The page is about contacting us, so the shared "Need help?" section is left
// out (it would repeat the channels). Copy: data/contact.js.

const PATH = "/contact-us";
const crumbs = [{ label: "Home", href: "/" }, { label: contact.hero.eyebrow }];

export const metadata = pageMetadata({ title: contact.title, description: contact.description, path: PATH });

const contactPageLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: contact.title,
  url: abs(PATH),
  mainEntity: {
    "@type": "Organization",
    name: "ReadTraining",
    url: SITE_URL,
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer service", telephone: topBar.phone, email: topBar.email, areaServed: "GB", availableLanguage: "en-GB" }],
  },
};
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: contact.faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function ContactPage() {
  return (
    <div className="main-content rt-home fb-page rt-tpage rt-contact-page">
      <a href="#rt-contact-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-contact-main" tabIndex={-1}>
          <MarketingHero hero={contact.hero} />
          <ContactChannels channels={contact.channels}>
            <Suspense fallback={null}>
              <ContactForm form={contact.form} />
            </Suspense>
          </ContactChannels>
          <ContactRoutes routes={contact.routes} />
          <FaqSection eyebrow={contact.faq.eyebrow} title={contact.faq.title} items={contact.faq.items} idPrefix="contact-faq" />
        </main>
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(contactPageLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, PATH)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />
    </div>
  );
}
