import React from "react";
import AccountShell from "@/components/account/AccountShell";
import BizLearners from "@/components/businessAccount/BizLearners";
import { businessAccount as biz } from "@/data/businessAccount";
import { pageMetadata } from "@/lib/seo";

// Business account: learner management (components/businessAccount; copy: data/businessAccount.js; reads: lib/businessAccount.js).
// Private, so kept out of search.
export const metadata = pageMetadata({ title: "Learners | ReadTraining", description: "Your ReadTraining Business account.", path: "/business/learners", noindex: true });

export default function Page() {
  return (
    <AccountShell demo area="business" current="learners" title={biz.learners.title} lead={biz.learners.lead}>
      <BizLearners />
    </AccountShell>
  );
}
