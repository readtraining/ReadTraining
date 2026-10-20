import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import AccountNav from "./AccountNav";
import { businessAccount } from "@/data/businessAccount";
import { EmptyState } from "@/components/states/States";
import { SHOW_DEMO } from "@/lib/demo";

const DEMO = { label: "Demo data", note: "These records are examples for now. Your real bookings and payments show here once booking goes live." };
const BROWSE = { label: "Browse courses", href: "/courses" };
// what a demo page shows on the live site instead of made-up records (lib/demo.js): [title, text]
const DEMO_OFF = {
  "account:dashboard": ["Nothing booked yet", "When you book a course, your bookings, upcoming dates and certificates show here."],
  "account:learning": ["No courses yet", "Courses you book show here, with their dates, joining instructions and progress."],
  "account:purchases": ["No purchases yet", "Your orders and receipts show here once you book a course."],
  "account:payments": ["No saved payment methods", "Cards you choose to save at checkout show here."],
  "account:wallet": ["Your wallet is empty", "Refunds paid to your wallet and gift credit show here, ready to spend on your next course."],
  "account:bookings": ["Booking not found", "Your bookings show under My learning once you book a course."],
  "business:dashboard": ["Nothing booked yet", "Places you buy for your team, who is booked and what you owe show here."],
  "business:learners": ["No learners yet", "The people you book training for show here."],
  "business:assignments": ["No places to assign yet", "Places you buy show here, ready to give to your learners."],
  "business:bookings": ["No bookings yet", "Your team's bookings show here once you book a course."],
  "business:billing": ["No invoices yet", "Your invoices and what you owe show here once you book on account."],
};

// The layout every account page shares (the customer account, and the Business account with `area="business"`): the site header,
// the page head on the page tint (the basket's head: title, intro, an optional action on the right), then the area's menu beside
// the page's content, and the footer. `current` marks the menu item; `title` may be a component (the dashboard's greeting needs the
// name, read in the browser). `demo` marks a page whose records are still made up (bookings, payments and the business's learners
// become real with the booking and payment work), so nobody mistakes them for real ones.
export default function AccountShell({ area = "account", current, title, lead, action = null, demo = false, children }) {
  const off = demo && !SHOW_DEMO ? DEMO_OFF[`${area}:${current}`] : null;
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
                    {demo && SHOW_DEMO && <span className="rt-demo-tag" title={DEMO.note}>{DEMO.label}<span className="rt-sr">: {DEMO.note}</span></span>}
                  </div>
                  <h1 className="rt-bk__h1">{title}</h1>
                  {lead && <p className="rt-acc__lead">{lead}</p>}
                </div>
                {!off && action}
              </div>
            </div>
          </section>
          <div className="container rt-acc__layout">
            <AccountNav area={area} current={current} />
            <div className="rt-acc__main">{off ? <EmptyState title={off[0]} text={off[1]} action={BROWSE} /> : children}</div>
          </div>
        </main>
        <HomeFooter />
      </div>
    </div>
  );
}
