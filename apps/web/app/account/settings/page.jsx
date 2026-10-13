import React from "react";
import AccountShell from "@/components/account/AccountShell";
import AccountProfile from "@/components/account/AccountProfile";
import { account } from "@/data/account";
import { pageMetadata } from "@/lib/seo";

// Customer account: account settings (personal details, address, emails, password) (components/account; copy: data/account.js; reads: lib/account.js). Private, so kept out of search.
export const metadata = pageMetadata({ title: "Account settings | ReadTraining", description: "Your ReadTraining account.", path: "/account/settings", noindex: true });

export default function Page() {
  return (
    <AccountShell current="settings" title={account.profile.title} lead={account.profile.lead}>
      <AccountProfile />
    </AccountShell>
  );
}
