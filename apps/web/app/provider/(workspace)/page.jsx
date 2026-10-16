import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderDashboard from "@/components/providerWorkspace/ProviderDashboard";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: dashboard (components/providerWorkspace/ProviderDashboard; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.dashboard;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="dashboard" title={p.title} lead={p.lead}>
      <ProviderDashboard />
    </ProviderShell>
  );
}
