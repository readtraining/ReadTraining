import React from "react";
import AccountShell from "@/components/account/AccountShell";
import AccountDashboard, { Greeting } from "@/components/account/AccountDashboard";
import { account } from "@/data/account";
import { pageMetadata } from "@/lib/seo";

// Customer account: dashboard (components/account; copy: data/account.js; reads: lib/account.js). Private, so kept out of search.
export const metadata = pageMetadata({ title: "My account | ReadTraining", description: "Your ReadTraining account.", path: "/account", noindex: true });

export default function Page() {
  return (
    <AccountShell current="dashboard" title={<Greeting />} lead={account.dashboard.lead}>
      <AccountDashboard />
    </AccountShell>
  );
}
