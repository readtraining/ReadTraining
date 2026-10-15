import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminChanges from "@/components/admin/AdminChanges";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: changes, refunds and disputes (components/admin/AdminChanges). Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.changes.title} | ${A.title}`, description: A.changes.lead, path: "/admin/changes", noindex: true });

export default function Page() {
  return (
    <AdminShell current="changes" title={A.changes.title} lead={A.changes.lead}>
      <AdminChanges />
    </AdminShell>
  );
}
