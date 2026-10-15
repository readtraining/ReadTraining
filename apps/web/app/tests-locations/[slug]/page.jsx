import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import FaqSection from "@/components/marketing/FaqSection";
import { Eyebrow } from "@/components/marketing/parts";
import SubjectHero from "@/components/testPrep/subject/SubjectHero";
import SubjectFacts from "@/components/testPrep/subject/SubjectFacts";
import SubjectArticle from "@/components/testPrep/subject/SubjectArticle";
import TestBooking, { BookTestButton } from "@/components/hseTest/TestBooking";
import TestTypes from "@/components/hseTest/TestTypes";
import BookingBand from "@/components/hseTest/BookingBand";
import { CentreCard } from "@/components/hseTest/CentreFinder";
import { hseTest as t } from "@/data/hseTest";
import { centreParams, getCentreByParam, nearbyCentres } from "@/lib/hseTest";
import { centreName, PROVIDER } from "@/lib/testCentreSearch";
import { HSE_TEST_HREF, TEST_CENTRES_HREF, testCentreHref } from "@/lib/routes";
import { breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";

// A test centre (/tests-locations/cscs-citb-tests-<town>, the client's URL): dark hero (book here, other centres) > key facts >
// the centre's address with a map link beside "on the day" > which test do I need > book with us (preselects this centre) >
// the test explained (structure, results) > other centres nearby > FAQs (this centre first) > need help. Copy: data/hseTest.js.

export function generateStaticParams() {
  return centreParams().map((slug) => ({ slug }));
}

export async function generateMetadata(props) {
  const { slug } = await props.params;
  const c = getCentreByParam(slug);
  if (!c) return { title: "Test centre not found | ReadTraining" };
  return pageMetadata({
    title: `CSCS & CITB test in ${c.town} | ReadTraining`,
    description: `Book your CITB Health, Safety and Environment (CSCS) test at the ${centreName(c)}, ${c.postcode}. What to bring, the test format and how to book.`,
    path: testCentreHref(c.slug),
  });
}

export default async function TestCentrePage(props) {
  const { slug } = await props.params;
  const c = getCentreByParam(slug);
  if (!c) notFound();

  const k = t.centre;
  const name = centreName(c);
  const address = c.address.join(", ");
  const path = testCentreHref(c.slug);
  const crumbs = [{ label: "Home", href: "/" }, { label: "Test centres", href: TEST_CENTRES_HREF }, { label: c.town }];
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${c.postcode}`)}`;
  const faqs = [
    { q: k.whereQ.replace("{town}", c.town), a: k.whereA.replace("{name}", name).replace("{address}", address).replace("{postcode}", c.postcode).replace("{provider}", PROVIDER) },
    ...t.faqs,
  ];
  const sections = t.sections.filter((s) => ["structure", "results", "prepare"].includes(s.id));
  const nearby = nearbyCentres(c);
  const placeLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name,
    address: { "@type": "PostalAddress", streetAddress: address, addressLocality: c.town, postalCode: c.postcode, addressCountry: "GB" },
    geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div className="main-content rt-home fb-page rt-lic-page">
      <a href="#rt-tl-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-tl-main" tabIndex={-1}>
          <TestBooking>
            <SubjectHero crumbs={crumbs} title={`CSCS & CITB test in ${c.town}`} lead={k.lead.replace("{name}", name)} label={c.nation} top>
              <div className="rt-tps__actions">
                <BookTestButton centre={c.slug}>{t.directory.book}</BookTestButton>
                <Link href={TEST_CENTRES_HREF} className="button -md -outline-white text-white">{t.centres.all}</Link>
              </div>
            </SubjectHero>
            <div className="container">
              <SubjectFacts facts={t.facts.slice(0, 3).concat({ icon: "icon-location", value: c.postcode, label: c.town })} />
            </div>

            <section className="fb-section -white" aria-labelledby="rt-tl-addr-h">
              <div className="container">
                <div className="rt-tl__grid">
                  <div className="rt-tl__card">
                    <h2 className="rt-tl__h2" id="rt-tl-addr-h">{k.addressTitle}</h2>
                    <p className="rt-tl__name">{name}</p>
                    <address className="rt-tl__addr">{c.address.map((line) => <span key={line}>{line}</span>)}<span>{c.town}</span><span>{c.postcode}</span></address>
                    <p className="rt-tl__run">{k.run.replace("{provider}", PROVIDER)}</p>
                    <a href={map} className="button -md -outline-purple-1 text-purple-1" target="_blank" rel="noopener noreferrer">{k.map}<span className="rt-sr"> (opens in a new tab)</span></a>
                    <p className="rt-tl__note">{k.mapNote}</p>
                  </div>
                  <div>
                    <Eyebrow>{k.dayTitle}</Eyebrow>
                    <SubjectArticle sections={t.sections.filter((s) => s.id === "bring")} />
                  </div>
                </div>
              </div>
            </section>

            <TestTypes />
            <BookingBand centre={c.slug} />

            <section className="fb-section -white" aria-label="About the test">
              <div className="container">
                <SubjectArticle sections={sections} />
                <p className="rt-tl__more"><Link href={HSE_TEST_HREF} className="fb-textlink">More about the HS&E test<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link></p>
              </div>
            </section>

            {nearby.length > 0 && (
              <section className="fb-section -lavender" aria-labelledby="rt-tl-near-h">
                <div className="container">
                  <div className="fb-head -center">
                    <h2 className="fb-title" id="rt-tl-near-h">{k.nearby}</h2>
                  </div>
                  <ul className="rt-tc__grid">
                    {nearby.map((n) => <CentreCard key={n.slug} c={n} />)}
                  </ul>
                  <div className="rt-lic__more">
                    <Link href={TEST_CENTRES_HREF} className="button -md -outline-purple-1 text-purple-1">{t.centres.all}</Link>
                  </div>
                </div>
              </section>
            )}

            <FaqSection eyebrow={c.town} title="Frequently asked questions" items={faqs} idPrefix={`tl-faq-${c.slug}`} className="layout-pt-lg layout-pb-lg bg-light-4" />
          </TestBooking>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, path)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(placeLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />
    </div>
  );
}
