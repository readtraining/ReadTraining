import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import CreateBusiness from "@/components/businessAccount/CreateBusiness";
import { businessAccount } from "@/data/businessAccount";
import { pageMetadata } from "@/lib/seo";

// Create a business account (/business/create): for a signed-in person (proxy.js sends signed-out visitors to log in and back);
// open without a business, unlike the rest of /business. Same layout as provider onboarding. Copy: data/businessAccount.js.
const c = businessAccount.create;

export const metadata = pageMetadata({ title: `${c.title} | ReadTraining`, description: c.lead, path: "/business/create", noindex: true });

export default function CreateBusinessPage() {
  return (
    <div className="main-content rt-home rt-po-page">
      <a href="#rt-cb-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-cb-main" tabIndex={-1}>
          <section className="rt-bk__head">
            <div className="container">
              <p className="rt-acc__eyebrow">{c.eyebrow}</p>
              <h1 className="rt-bk__h1">{c.title}</h1>
              <p className="rt-acc__lead">{c.lead}</p>
            </div>
          </section>
          <div className="container rt-po">
            <CreateBusiness />
          </div>
        </main>
        <HomeFooter />
      </div>
    </div>
  );
}
