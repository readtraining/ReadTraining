import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderRequests from "@/components/providerWorkspace/ProviderRequests";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: requests (components/providerWorkspace/ProviderRequests; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.requests;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/requests", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="requests" title={p.title} lead={p.lead}>
      <ProviderRequests />
    </ProviderShell>
  );
}
