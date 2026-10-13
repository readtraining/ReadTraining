import React from "react";
import AccountShell from "@/components/account/AccountShell";
import BizAssignments from "@/components/businessAccount/BizAssignments";
import { businessAccount as biz } from "@/data/businessAccount";
import { pageMetadata } from "@/lib/seo";

// Business account: team training assignments (components/businessAccount; copy: data/businessAccount.js; reads: lib/businessAccount.js).
// Private, so kept out of search.
export const metadata = pageMetadata({ title: "Assign places | ReadTraining", description: "Your ReadTraining Business account.", path: "/business/assignments", noindex: true });

export default function Page() {
  return (
    <AccountShell area="business" current="assignments" title={biz.assignments.title} lead={biz.assignments.lead}>
      <BizAssignments />
    </AccountShell>
  );
}
