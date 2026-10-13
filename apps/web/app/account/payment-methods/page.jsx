import React from "react";
import AccountShell from "@/components/account/AccountShell";
import AccountPayments from "@/components/account/AccountPayments";
import { account } from "@/data/account";
import { pageMetadata } from "@/lib/seo";

// Customer account: payment methods (components/account; copy: data/account.js; reads: lib/account.js). Private, so kept out of search.
export const metadata = pageMetadata({ title: "Payment methods | ReadTraining", description: "Your ReadTraining account.", path: "/account/payment-methods", noindex: true });

export default function Page() {
  return (
    <AccountShell current="payments" title={account.payments.title} lead={account.payments.lead}>
      <AccountPayments />
    </AccountShell>
  );
}
