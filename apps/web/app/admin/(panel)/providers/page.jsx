import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminProviders from "@/components/admin/AdminProviders";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: providers and applications (components/admin/AdminProviders). Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.providers.title} | ${A.title}`, description: A.providers.lead, path: "/admin/providers", noindex: true });

export default function Page() {
  return (
    <AdminShell current="providers" title={A.providers.title} lead={A.providers.lead}>
      <AdminProviders />
    </AdminShell>
  );
}
