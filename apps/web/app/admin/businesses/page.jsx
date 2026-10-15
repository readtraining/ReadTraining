import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminBusinesses from "@/components/admin/AdminBusinesses";
import { admin as A } from "@/data/admin";
import { adminWork as W } from "@/data/adminWork";
import { pageMetadata } from "@/lib/seo";

// Platform admin, Phase 2: Business accounts (components/admin/AdminBusinesses). Private, so kept out of search.
export const metadata = pageMetadata({ title: `Business accounts | ${A.title}`, description: W.businesses.lead, path: "/admin/businesses", noindex: true });

export default function Page() {
  return (
    <AdminShell current="businesses" title={W.businesses.title} lead={W.businesses.lead}>
      <AdminBusinesses />
    </AdminShell>
  );
}
