import React from "react";
import CheckoutHeader from "@/components/checkout/CheckoutHeader";
import CheckoutFooter from "@/components/checkout/CheckoutFooter";
import CheckoutPage from "@/components/checkout/CheckoutPage";
import { pageMetadata } from "@/lib/seo";
import { loadTaxonomy } from "@/lib/taxonomyServer";

// The checkout (/checkout): the checkout header (no menu), the booking steps, the form beside the order summary. A slim legal-links footer only,
// for the same reason. Components: components/checkout; copy: data/checkout.js; rules: lib/basket.js and lib/checkout.js.
export const metadata = pageMetadata({ title: "Checkout | ReadTraining", description: "Pay for your courses securely.", path: "/checkout", noindex: true });

export default async function Checkout() {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  return (
    <div className="main-content rt-home fb-page rt-bk-page rt-ck-page">
      <a href="#rt-ck-main" className="rt-skip">Skip to main content</a>
      <CheckoutHeader />
      <main id="rt-ck-main" tabIndex={-1}>
        <CheckoutPage />
      </main>
      <CheckoutFooter />
    </div>
  );
}
