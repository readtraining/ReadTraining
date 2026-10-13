import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderOrder from "@/components/providerWorkspace/ProviderOrder";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: one order (components/providerWorkspace/ProviderOrder). Private, so kept out of search.
const p = pw.pages.order;
export async function generateMetadata(props) {
  const { ref } = await props.params;
  return pageMetadata({ title: `${p.title} | ${pw.title}`, description: pw.pages.orders.lead, path: `/provider/orders/${ref}`, noindex: true });
}

export default async function Page(props) {
  const { ref } = await props.params;
  return (
    <ProviderShell current="orders" title={p.title} back={{ label: "Orders", href: "/provider/orders" }}>
      <ProviderOrder reference={ref} />
    </ProviderShell>
  );
}
