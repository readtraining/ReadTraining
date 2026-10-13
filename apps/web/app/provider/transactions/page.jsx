import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderTransactions from "@/components/providerWorkspace/ProviderTransactions";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: transactions (components/providerWorkspace/ProviderTransactions; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.transactions;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/transactions", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="transactions" title={p.title} lead={p.lead}>
      <ProviderTransactions />
    </ProviderShell>
  );
}
