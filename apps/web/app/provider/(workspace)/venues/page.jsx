import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderVenues from "@/components/providerWorkspace/ProviderVenues";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: venues (components/providerWorkspace/ProviderVenues; records: API provider.venues).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.venues;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: "Your venues on ReadTraining.", path: "/provider/venues", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="venues" title={p.title}>
      <ProviderVenues />
    </ProviderShell>
  );
}
