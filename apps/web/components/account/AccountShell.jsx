import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import AccountNav from "./AccountNav";
import { businessAccount } from "@/data/businessAccount";

const DEMO = { label: "Demo data", note: "These records are examples for now. Your real bookings and payments show here once booking goes live." };

// The layout every account page shares (the customer account, and the Business account with `area="business"`): the site header,
// the page head on the page tint (the basket's head: title, intro, an optional action on the right), then the area's menu beside
// the page's content, and the footer. `current` marks the menu item; `title` may be a component (the dashboard's greeting needs the
// name, read in the browser). `demo` marks a page whose records are still made up (bookings, payments and the business's learners
// become real with the booking and payment work), so nobody mistakes them for real ones.
export default function AccountShell({ area = "account", current, title, lead, action = null, demo = false, children }) {
  return (
    <div className="main-content rt-home fb-page rt-acc-page">
      <a href="#rt-acc-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-acc-main" tabIndex={-1}>
          <section className="rt-bk__head rt-acc__head">
            <div className="container">
              <div className="rt-bk__headrow">
                <div>
                  <div className="rt-acc__eyebrowrow">
                    <p className="rt-acc__eyebrow">{area === "business" ? businessAccount.title : "My account"}</p>
                    {demo && <span className="rt-demo-tag" title={DEMO.note}>{DEMO.label}<span className="rt-sr">: {DEMO.note}</span></span>}
                  </div>
                  <h1 className="rt-bk__h1">{title}</h1>
                  {lead && <p className="rt-acc__lead">{lead}</p>}
                </div>
                {action}
              </div>
            </div>
          </section>
          <div className="container rt-acc__layout">
            <AccountNav area={area} current={current} />
            <div className="rt-acc__main">{children}</div>
          </div>
        </main>
        <HomeFooter />
      </div>
    </div>
  );
}
