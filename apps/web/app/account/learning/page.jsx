import React from "react";
import AccountShell from "@/components/account/AccountShell";
import AccountLearning from "@/components/account/AccountLearning";
import { account } from "@/data/account";
import { pageMetadata } from "@/lib/seo";

// Customer account: my learning (components/account; copy: data/account.js; reads: lib/account.js). Private, so kept out of search.
export const metadata = pageMetadata({ title: "My learning | ReadTraining", description: "Your ReadTraining account.", path: "/account/learning", noindex: true });

export default function Page() {
  return (
    <AccountShell demo current="learning" title={account.learning.title} lead={account.learning.lead}>
      <AccountLearning />
    </AccountShell>
  );
}
