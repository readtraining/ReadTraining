import React from "react";
import CheckoutHeader from "@/components/checkout/CheckoutHeader";
import Confirmation from "@/components/checkout/Confirmation";
import { pageMetadata } from "@/lib/seo";

// The payment result page (/checkout/confirmation): Booking confirmed after a successful payment, Payment not completed when it did not go through.
// No fixed title: the tab title follows the result (Booking confirmed, Payment not completed), set by Confirmation with React's
// <title>; a fixed one would be written around it and win. The page is kept out of search, so nothing is lost.
export const metadata = { ...pageMetadata({ title: "Your booking | ReadTraining", description: "The result of your booking.", path: "/checkout/confirmation", noindex: true }), title: undefined };

export default function CheckoutConfirmation() {
  return (
    <div className="main-content rt-home fb-page rt-bk-page rt-ck-page">
      <a href="#rt-ck-main" className="rt-skip">Skip to main content</a>
      <CheckoutHeader />
      <main id="rt-ck-main" tabIndex={-1}>
        <Confirmation />
      </main>
    </div>
  );
}
