import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderNewOrder from "@/components/providerWorkspace/ProviderNewOrder";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: newOrder (components/providerWorkspace/ProviderNewOrder; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.newOrder;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/orders/new", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="orders" title={p.title} lead={p.lead} back={{ label: "Orders", href: "/provider/orders" }}>
      <ProviderNewOrder />
    </ProviderShell>
  );
}
