import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderNotifications from "@/components/providerWorkspace/ProviderNotifications";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: notifications (components/providerWorkspace/ProviderNotifications; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.notifications;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/notifications", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="notifications" title={p.title} lead={p.lead}>
      <ProviderNotifications />
    </ProviderShell>
  );
}
