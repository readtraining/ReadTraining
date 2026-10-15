import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderHelp from "@/components/providerWorkspace/ProviderHelp";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: help (components/providerWorkspace/ProviderHelp; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.help;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/help", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="help" title={p.title} lead={p.lead}>
      <ProviderHelp />
    </ProviderShell>
  );
}
