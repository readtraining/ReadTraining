import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import ProviderOnboarding from "@/components/providerSignup/ProviderOnboarding";
import { PROVIDER_ONBOARDING_HREF, providerSignup } from "@/data/providerSignup";
import { pageMetadata } from "@/lib/seo";

// Provider onboarding (/provider/onboarding): after "Become a provider" creates the account (or a signed-in person continues),
// the provider details (company or instructor name, mobile, provider terms) that add a provider to this login and open the
// workspace. proxy.js sends signed-out visitors to log in and back; unlike the rest of /provider it needs no provider. An app
// page (DESIGN-SYSTEM.md): the account pages' head band, then one card. Copy: data/providerSignup.js.

const o = providerSignup.onboarding;

export const metadata = pageMetadata({ title: `${o.title} | ReadTraining`, description: o.lead, path: PROVIDER_ONBOARDING_HREF, noindex: true });

export default function ProviderOnboardingPage() {
  return (
    <div className="main-content rt-home rt-po-page">
      <a href="#rt-po-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-po-main" tabIndex={-1}>
          <section className="rt-bk__head">
            <div className="container">
              <p className="rt-acc__eyebrow">{o.eyebrow}</p>
              <h1 className="rt-bk__h1">{o.title}</h1>
              <p className="rt-acc__lead">{o.lead}</p>
            </div>
          </section>
          <div className="container rt-po">
            <ProviderOnboarding />
          </div>
        </main>
        <HomeFooter />
      </div>
    </div>
  );
}
