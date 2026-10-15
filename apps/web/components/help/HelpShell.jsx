import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import CtaBand from "@/components/marketing/CtaBand";
import DocHeader from "@/components/doc/DocHeader";
import HelpSidebar from "./HelpSidebar";
import { getHelpPage } from "@/lib/help";
import { breadcrumbLd, jsonLd } from "@/lib/seo";

// The layout of the Help Centre's topic and article pages, in the legal pages' docs layout (.rt-doc__*): the site header, then
// in the site container the side column (topics or the topic's articles) beside the page header (breadcrumb, title, intro) and
// the content (`children`), then "Still need help?" and the footer. `crumbs` is [{ label, href? }].
export default function HelpShell({ crumbs, title, lead, path, side, children }) {
  const page = getHelpPage();
  return (
    <div className="main-content rt-home rt-doc-page rt-help-page">
      <a href="#rt-help-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-help-main" tabIndex={-1}>
          <div className="rt-doc__body">
            <div className="container rt-doc__layout">
              <HelpSidebar {...side} />
              <div className="rt-doc__main">
                <DocHeader crumbs={crumbs} title={title} lead={lead} />
                {children}
              </div>
            </div>
          </div>
          <div className="rt-help__cta">
            <CtaBand cta={page.stillNeedHelp} id="rt-help-cta-h" />
          </div>
        </main>
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, path)) }} />
    </div>
  );
}
