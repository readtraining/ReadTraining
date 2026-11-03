import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderTeam from "@/components/providerWorkspace/ProviderTeam";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: team (components/providerWorkspace/ProviderTeam; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.team;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/team", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="team" title={p.title} lead={p.lead}>
      <ProviderTeam />
    </ProviderShell>
  );
}
