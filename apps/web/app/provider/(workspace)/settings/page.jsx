import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderSettings from "@/components/providerWorkspace/ProviderSettings";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: settings (components/providerWorkspace/ProviderSettings; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.settings;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/settings", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="settings" title={p.title} lead={p.lead}>
      <ProviderSettings />
    </ProviderShell>
  );
}
