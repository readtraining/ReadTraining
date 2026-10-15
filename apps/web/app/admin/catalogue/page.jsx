import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminCatalogue from "@/components/admin/AdminCatalogue";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: the catalogue (components/admin/AdminCatalogue). Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.catalogue.title} | ${A.title}`, description: A.catalogue.lead, path: "/admin/catalogue", noindex: true });

export default function Page() {
  return (
    <AdminShell current="catalogue" title={A.catalogue.title} lead={A.catalogue.lead}>
      <AdminCatalogue />
    </AdminShell>
  );
}
