import React from "react";
import { notFound } from "next/navigation";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import FaqSection from "@/components/marketing/FaqSection";
import CtaBand from "@/components/marketing/CtaBand";
import { Eyebrow } from "@/components/marketing/parts";
import SubjectHero from "@/components/testPrep/subject/SubjectHero";
import SubjectFacts from "@/components/testPrep/subject/SubjectFacts";
import SubjectArticle from "@/components/testPrep/subject/SubjectArticle";
import LicenceRequest from "@/components/licences/LicenceRequest";
import LicenceActions from "@/components/licences/LicenceActions";
import CscsFinder from "@/components/licences/CscsFinder";
import CscsCards from "@/components/licences/CscsCards";
import CscsCardArt from "@/components/licences/CscsCardArt";
import LicenceRoute from "@/components/licences/LicenceRoute";
import LicenceEligibility from "@/components/licences/LicenceEligibility";
import LicenceBand from "@/components/licences/LicenceBand";
import LicenceCourses from "@/components/licences/LicenceCourses";
import LicenceTiles from "@/components/licences/LicenceTiles";
import { licencesHub as hub } from "@/data/licences";
import { getGroup, getLicence, getLicenceSlugs, licenceCosts, licenceCourses, licenceHref, relatedLicences } from "@/lib/licences";
import { loadCatalogue } from "@/lib/catalogueServer";
import { faqItems } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";
import { breadcrumbLd, faqPageLd, jsonLd, pageMetadata } from "@/lib/seo";

// A licence or card guide (/licences/<slug>): one template for every licence, driven by data/licences.js, in the learner pages'
// language (the test prep subject page's dark hero and key facts strip, then the For Business / Skill Saver sections).
// Order: hero (breadcrumb, industry, H1, intro, main action + "See the steps") > key facts > the CSCS card finder (CSCS only) >
// all CSCS cards (CSCS only) > how to get it, with the costs (#route) > who can apply, with the documents > the guide (contents column + article) > the dark
// band (apply for you / jobs / request training) > training courses (#training) > related licences > FAQs > call to action.
// "Apply for me" and "Request training" open the page's one pop-up (LicenceRequest).

export function generateStaticParams() {
  return getLicenceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props) {
  const { slug } = await props.params;
  const l = getLicence(slug);
  if (!l) return { title: "Licence not found | ReadTraining" };
  return pageMetadata({ title: `${l.seoTitle || l.title} | ReadTraining`, description: l.description, path: licenceHref(slug) });
}

export default async function LicencePage(props) {
  await loadSiteContent();
  const { slug } = await props.params;
  const l = getLicence(slug);
  if (!l) notFound();
  const faqs = faqItems(`licence-${slug}`, l.faqs);
  const courses = await loadCatalogue(); // the live courses: this licence's training and its prices

  const t = hub.page;
  const path = licenceHref(slug);
  const group = getGroup(l.group);
  const crumbs = [{ label: "Home", href: "/" }, { label: hub.hero.eyebrow, href: "/licences" }, { label: l.short }];
  const related = relatedLicences(l);
  // CSCS: three drawn cards fanned out beside the hero's text
  const heroVisual = l.heroCards ? (
    <div className="rt-cscs-fan">
      {l.heroCards.map((key) => <CscsCardArt key={key} card={l.cards.find((c) => c.key === key)} size="lg" />)}
    </div>
  ) : null;

  return (
    <div className="main-content rt-home fb-page rt-lic-page">
      <a href="#rt-lic-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-lic-main" tabIndex={-1}>
          <LicenceRequest licence={l}>
            <SubjectHero crumbs={crumbs} title={l.title} lead={l.lead} label={group?.label} top visual={heroVisual}>
              <LicenceActions primary={l.primary} secondary={l.finder ? { label: t.findLabel, href: "#cards" } : { label: t.stepsLabel, href: "#route" }} />
            </SubjectHero>
            <div className="container">
              <SubjectFacts facts={l.facts} />
            </div>

            {l.finder && <CscsFinder finder={l.finder} cards={l.cards} service={l.service} />}
            {l.cardsSection && <CscsCards copy={l.cardsSection} labels={l.finder.labels} cards={l.cards} service={l.service} />}
            <LicenceRoute licence={l} costs={licenceCosts(l, courses)} copy={t} />
            <LicenceEligibility licence={l} copy={t} />
            {l.guide?.length > 0 && (
              <section className="fb-section -white rt-lic__guide" aria-label={t.guideLabel}>
                <div className="container">
                  <SubjectArticle sections={l.guide} />
                </div>
              </section>
            )}
            <LicenceBand band={l.band} />
            <LicenceCourses courses={licenceCourses(l, courses)} training={l.training} copy={t} />
            {related.length > 0 && (
              <section className="fb-section -lavender" aria-labelledby="rt-lic-related-h">
                <div className="container">
                  <div className="fb-head -center">
                    <Eyebrow>{t.relatedEyebrow}</Eyebrow>
                    <h2 className="fb-title" id="rt-lic-related-h">{t.relatedTitle}</h2>
                  </div>
                  <LicenceTiles items={related} label={t.tileLink} />
                </div>
              </section>
            )}
            <FaqSection eyebrow="FAQs" title={`${t.faqTitle} ${l.short}`} items={faqs} idPrefix="lic-faq" className="layout-pt-lg layout-pb-lg rt-lic__anchor" id="faqs" />
            <CtaBand cta={l.cta || hub.cta} id="rt-lic-cta-h" />
          </LicenceRequest>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, path)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageLd(faqs)) }} />
    </div>
  );
}
