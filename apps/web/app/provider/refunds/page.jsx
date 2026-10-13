import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderRefunds from "@/components/providerWorkspace/ProviderRefunds";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: refunds (components/providerWorkspace/ProviderRefunds; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.refunds;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/refunds", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="refunds" title={p.title} lead={p.lead}>
      <ProviderRefunds />
    </ProviderShell>
  );
}
