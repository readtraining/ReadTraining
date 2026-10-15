import React from "react";
import AccountShell from "@/components/account/AccountShell";
import AccountPurchases from "@/components/account/AccountPurchases";
import { account } from "@/data/account";
import { pageMetadata } from "@/lib/seo";

// Customer account: purchase history (components/account; copy: data/account.js; reads: lib/account.js). Private, so kept out of search.
export const metadata = pageMetadata({ title: "Purchase history | ReadTraining", description: "Your ReadTraining account.", path: "/account/purchases", noindex: true });

export default function Page() {
  return (
    <AccountShell current="purchases" title={account.purchases.title} lead={account.purchases.lead}>
      <AccountPurchases />
    </AccountShell>
  );
}
