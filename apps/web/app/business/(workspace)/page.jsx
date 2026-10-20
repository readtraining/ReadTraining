import React from "react";
import AccountShell from "@/components/account/AccountShell";
import BizDashboard from "@/components/businessAccount/BizDashboard";
import { businessAccount as biz } from "@/data/businessAccount";
import { pageMetadata } from "@/lib/seo";
import WorkspaceName from "@/components/account/WorkspaceName";

// Business account: dashboard (components/businessAccount; copy: data/businessAccount.js; reads: lib/businessAccount.js).
// Private, so kept out of search.
export const metadata = pageMetadata({ title: "Business account | ReadTraining", description: "Your ReadTraining Business account.", path: "/business", noindex: true });

export default function Page() {
  return (
    <AccountShell demo area="business" current="dashboard" title={<WorkspaceName />} lead={biz.dashboard.lead}>
      <BizDashboard />
    </AccountShell>
  );
}
