import React from "react";
import AccountShell from "@/components/account/AccountShell";
import BizBilling from "@/components/businessAccount/BizBilling";
import { businessAccount as biz } from "@/data/businessAccount";
import { pageMetadata } from "@/lib/seo";

// Business account: billing and invoices (components/businessAccount; copy: data/businessAccount.js; reads: lib/businessAccount.js).
// Private, so kept out of search.
export const metadata = pageMetadata({ title: "Billing and invoices | ReadTraining", description: "Your ReadTraining Business account.", path: "/business/billing", noindex: true });

export default function Page() {
  return (
    <AccountShell demo area="business" current="billing" title={biz.billing.title} lead={biz.billing.lead}>
      <BizBilling />
    </AccountShell>
  );
}
