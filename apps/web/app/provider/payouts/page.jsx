import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderPayouts from "@/components/providerWorkspace/ProviderPayouts";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: payouts (components/providerWorkspace/ProviderPayouts; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.payouts;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/payouts", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="payouts" title={p.title} lead={p.lead}>
      <ProviderPayouts />
    </ProviderShell>
  );
}
