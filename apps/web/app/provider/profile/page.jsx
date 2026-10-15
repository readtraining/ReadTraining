import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderProfile from "@/components/providerWorkspace/ProviderProfile";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: profile (components/providerWorkspace/ProviderProfile; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.profile;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/profile", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="profile" title={p.title} lead={p.lead}>
      <ProviderProfile />
    </ProviderShell>
  );
}
