import React from "react";
import Link from "next/link";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderOrders from "@/components/providerWorkspace/ProviderOrders";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: orders (components/providerWorkspace/ProviderOrders; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.orders;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/orders", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="orders" title={p.title} lead={p.lead} actions={<Link href="/provider/orders/new" className="button -md -purple-1 text-white">Create order</Link>}>
      <ProviderOrders />
    </ProviderShell>
  );
}
