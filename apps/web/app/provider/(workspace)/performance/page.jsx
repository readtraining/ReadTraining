import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderPerformance from "@/components/providerWorkspace/ProviderPerformance";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: performance (components/providerWorkspace/ProviderPerformance; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.performance;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/performance", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="performance" title={p.title} lead={p.lead}>
      <ProviderPerformance />
    </ProviderShell>
  );
}
