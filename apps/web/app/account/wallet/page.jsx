import React from "react";
import AccountShell from "@/components/account/AccountShell";
import AccountWallet from "@/components/account/AccountWallet";
import { account } from "@/data/account";
import { pageMetadata } from "@/lib/seo";

// Customer account: wallet (components/account; copy: data/account.js; reads: lib/account.js). Private, so kept out of search.
export const metadata = pageMetadata({ title: "Wallet | ReadTraining", description: "Your ReadTraining account.", path: "/account/wallet", noindex: true });

export default function Page() {
  return (
    <AccountShell current="wallet" title={account.wallet.title} lead={account.wallet.lead}>
      <AccountWallet />
    </AccountShell>
  );
}
