import React from "react";
import AccountShell from "@/components/account/AccountShell";
import BizBookings from "@/components/businessAccount/BizBookings";
import { businessAccount as biz } from "@/data/businessAccount";
import { pageMetadata } from "@/lib/seo";

// Business account: booking history (components/businessAccount; copy: data/businessAccount.js; reads: lib/businessAccount.js).
// Private, so kept out of search.
export const metadata = pageMetadata({ title: "Bookings | ReadTraining", description: "Your ReadTraining Business account.", path: "/business/bookings", noindex: true });

export default function Page() {
  return (
    <AccountShell area="business" current="bookings" title={biz.bookings.title} lead={biz.bookings.lead}>
      <BizBookings />
    </AccountShell>
  );
}
