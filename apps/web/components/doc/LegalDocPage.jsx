import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import DocTabsBar from "./DocTabsBar";
import DocSidebar from "./DocSidebar";
import DocHeader from "./DocHeader";
import DocToc from "./DocToc";
import DocSections from "./DocSections";
import InfoCard from "./InfoCard";
import BackToTop from "./BackToTop";
import { formatLongDate, getCompany, getLegalDocument, getLegalNav } from "@/lib/legal";
import { breadcrumbLd, jsonLd, pageMetadata, webPageLd } from "@/lib/seo";

// One legal page (Terms, Privacy, Cookies and the ones to come), inside the site container: a tab bar of the legal documents
// under the site header, then the test prep guide's docs layout: the contents column pinned beside the document (scrollspy),
// and the document itself: header (breadcrumb, title, dates, Print), text and the company and contact details, in one
// readable column. Phones and tablets: the same tab bar, and the collapsible contents above the text instead of the column.

export function legalMetadata(slug) {
  const doc = getLegalDocument(slug);
  // a draft (placeholders, not yet reviewed by a solicitor) stays out of search results
  return pageMetadata({ title: `${doc.title} | ReadTraining`, description: doc.description, path: doc.href, noindex: doc.draft });
}

export default function LegalDocPage({ slug }) {
  const doc = getLegalDocument(slug);
  const company = getCompany();
  const crumbs = [{ label: "Home", href: "/" }, { label: doc.title }]; // add a "Legal" level once a legal hub page exists
  // "Effective from" only when it differs from the update; no version when there is none
  const meta = [
    { label: "Last updated", value: formatLongDate(doc.updated), dateTime: doc.updated },
    doc.effective !== doc.updated && { label: "Effective from", value: formatLongDate(doc.effective), dateTime: doc.effective },
    doc.version && { label: "Version", value: doc.version },
  ].filter(Boolean);
  const toc = doc.sections.map((s) => ({ id: s.id, num: s.num, label: s.title }));
  const contact = doc.contact || {};
  const email = contact.email || company.email;
  const tel = `tel:${company.phone.replace(/\s+/g, "")}`;

  return (
    <div className="main-content rt-home rt-doc-page">
      <a href="#rt-doc-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-doc-main" tabIndex={-1}>
          <DocTabsBar items={getLegalNav()} current={doc.slug} />
          <div className="rt-doc__body">
            <div className="container rt-doc__layout">
              <DocSidebar items={toc} />
              <div className="rt-doc__main">
                <DocHeader crumbs={crumbs} title={doc.title} lead={doc.lead} meta={meta} />
                <div className="rt-doc__mtoc">
                  <DocToc title="Contents" items={toc} />
                </div>
                <article className="rt-doc__text" aria-labelledby="rt-doc-title">
                  {doc.draft && (
                    <p className="rt-doc__draft" role="note">
                      <strong>Draft for review.</strong> This document is being finalised and checked. Details in [brackets] will be completed before it takes effect.
                    </p>
                  )}
                  <DocSections sections={doc.sections} />
                </article>
                <aside className="rt-doc__end" aria-label="About this document">
                  <InfoCard
                    icon="icon-badge"
                    title="Who we are"
                    rows={[
                      { label: "Company", value: company.name },
                      { label: "Trading as", value: company.tradingName },
                      { label: "Company number", value: `${company.number} (${company.register})` },
                      { label: "Registered office", value: company.office },
                      { label: "VAT number", value: company.vat },
                    ].filter((r) => r.value)}
                  />
                  <InfoCard
                    icon="icon-message"
                    title={contact.title || "Questions about this document?"}
                    text={contact.text || "Our team can explain anything here."}
                    rows={[
                      { label: "Email", value: email, href: `mailto:${email}` },
                      { label: "Phone", value: company.phone, href: tel },
                      { label: "Hours", value: company.hours },
                    ]}
                  >
                    <a href={`mailto:${email}${contact.subject ? `?subject=${encodeURIComponent(contact.subject)}` : ""}`} className="button -md -purple-1 text-white rt-btn-block">Email us</a>
                  </InfoCard>
                </aside>
              </div>
            </div>
          </div>
          <BackToTop targetId="rt-doc-title" />
        </main>
        <div className="rt-doc__noprint">
          <HomeHelp />
        </div>
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, doc.href)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(webPageLd({ name: doc.title, description: doc.description, path: doc.href, datePublished: doc.published, dateModified: doc.updated })) }} />
    </div>
  );
}
