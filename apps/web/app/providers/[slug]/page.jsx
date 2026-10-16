import React from "react";
import { notFound } from "next/navigation";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import MarketingHero from "@/components/marketing/MarketingHero";
import FaqSection from "@/components/marketing/FaqSection";
import SubjectFacts from "@/components/testPrep/subject/SubjectFacts";
import ProviderAbout from "@/components/providers/ProviderAbout";
import ProviderCourses from "@/components/providers/ProviderCourses";

import { providerPages } from "@/data/providers";
import { PROVIDERS_HREF, fillName, getProvider, getProviderSlugs, joinList } from "@/lib/providers";
import { getPublicProvider } from "@/lib/publicProvider";
import { abs, breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";
import { loadTaxonomy } from "@/lib/taxonomyServer";
import { EmptyState } from "@/components/states/States";

// A listed provider (/providers/<slug>), in the marketing-page language of /about-us: centred dark hero with the provider's key
// facts on its edge > about (with the details card) > its courses as cards (lavender) > its terms and policies > need help >
// footer. Everything but the about text is worked out from the provider's courses (lib/providers.js); copy: data/providers.js.
// A provider that joined through the site (an organisation in the database, lib/publicProvider.js) has its profile from the
// moment it's created: the same page with what it hasn't added yet, kept out of search engines until it's approved.

export function generateStaticParams() {
  return getProviderSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const p = getProvider(slug);
  if (!p) {
    const r = await getPublicProvider(slug);
    if (!r) return { title: "Provider not found | ReadTraining" };
    return pageMetadata({ title: `${r.name} | Training courses on ReadTraining`, description: fillName(providerPages.newProvider.lead, r.name), path: `${PROVIDERS_HREF}/${r.slug}`, noindex: !r.approved });
  }
  return pageMetadata({
    title: `${p.name} | Training courses on ReadTraining`,
    description: `Book ${joinList(p.subjects.slice(0, 3))} courses from ${p.name}, an approved training provider based in ${p.city}.`,
    path: p.href,
  });
}

export default async function ProviderPage(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const p = getProvider(slug);
  if (!p) {
    const r = await getPublicProvider(slug);
    if (!r) notFound();
    return <NewProviderPage provider={r} />;
  }
  const d = providerPages.detail;

  const hero = {
    eyebrow: d.eyebrow,
    title: [p.name],
    lead: `Book ${joinList(p.subjects.slice(0, 3))} courses from ${p.name}, based in ${p.city}.`,
    primary: { label: "View courses", href: "#rt-prov-courses" },
    secondary: { label: "All providers", href: PROVIDERS_HREF },
  };
  const facts = [
    { icon: "icon-book", value: p.courses.length, label: p.courses.length === 1 ? "Course to book" : "Courses to book" },
    { icon: "icon-graduate-cap", value: p.subjects.length, label: p.subjects.length === 1 ? "Subject" : "Subjects" },
    { icon: "icon-online-learning-4", value: p.modes.length, label: p.modes.length === 1 ? "Way to learn" : "Ways to learn" },
    { icon: "icon-global-search", value: p.cities.length, label: p.cities.length === 1 ? "Venue city" : "Venue cities" },
  ];
  const crumbs = [{ label: "Home", href: "/" }, { label: "Listed training providers", href: PROVIDERS_HREF }, { label: p.name }];
  const orgLd = { "@context": "https://schema.org", "@type": "EducationalOrganization", name: p.name, url: abs(p.href), description: p.about, areaServed: "GB", address: { "@type": "PostalAddress", addressLocality: p.city, addressCountry: "GB" } };

  return (
    <div className="main-content rt-home fb-page rt-tpage rt-prov-page">
      <a href="#rt-prov-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-prov-main" tabIndex={-1}>
          <MarketingHero hero={hero} />
          <div className="container">
            <SubjectFacts facts={facts} />
          </div>
          <ProviderAbout provider={p} copy={{ ...d.about, title: fillName(d.about.title, p.name), badge: d.badge }} />
          <ProviderCourses courses={p.courses} copy={d.courses} text={fillName(d.courses.text, p.name)} />
          <FaqSection
            compact
            eyebrow={d.policies.eyebrow}
            title={d.policies.title}
            text={fillName(d.policies.text, p.name)}
            items={d.policies.items}
            idPrefix="prov-policy"
          />
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, p.href)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(orgLd) }} />
    </div>
  );
}

// The profile of a provider that has just joined: its name, and plainly what it hasn't added yet (about, courses); the shared
// terms and policies apply to it as to every provider.
function NewProviderPage({ provider }) {
  const n = providerPages.newProvider;
  const d = providerPages.detail;
  const href = `${PROVIDERS_HREF}/${provider.slug}`;
  const hero = {
    eyebrow: provider.approved ? d.eyebrow : n.eyebrow,
    title: [provider.name],
    lead: fillName(n.lead, provider.name),
    primary: n.primary,
    secondary: { label: "All providers", href: PROVIDERS_HREF },
  };
  const crumbs = [{ label: "Home", href: "/" }, { label: "Listed training providers", href: PROVIDERS_HREF }, { label: provider.name }];
  return (
    <div className="main-content rt-home fb-page rt-tpage rt-prov-page">
      <a href="#rt-prov-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-prov-main" tabIndex={-1}>
          <MarketingHero hero={hero} />
          <div className="container rt-prov-new">
            <EmptyState title={fillName(n.about.title, provider.name)} text={fillName(n.about.text, provider.name)} />
            <EmptyState title={n.courses.title} text={fillName(n.courses.text, provider.name)} action={n.courses.action} />
          </div>
          <FaqSection compact eyebrow={d.policies.eyebrow} title={d.policies.title} text={fillName(d.policies.text, provider.name)} items={d.policies.items} idPrefix="prov-policy" />
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, href)) }} />
    </div>
  );
}
