import React from "react";
import AccountShell from "@/components/account/AccountShell";
import AccountSaved from "@/components/account/AccountSaved";
import { account } from "@/data/account";
import { pageMetadata } from "@/lib/seo";

// Customer account: saved courses (components/account; copy: data/account.js; reads: lib/account.js). Private, so kept out of search.
export const metadata = pageMetadata({ title: "Saved courses | ReadTraining", description: "Your ReadTraining account.", path: "/account/saved", noindex: true });

export default function Page() {
  return (
    <AccountShell current="saved" title={account.saved.title} lead={account.saved.lead}>
      <AccountSaved />
    </AccountShell>
  );
}
