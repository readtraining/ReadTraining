import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminApprovals from "@/components/admin/AdminApprovals";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: approvals inbox (components/admin/AdminApprovals). Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.approvals.title} | ${A.title}`, description: A.approvals.lead, path: "/admin/approvals", noindex: true });

export default function Page() {
  return (
    <AdminShell current="approvals" title={A.approvals.title} lead={A.approvals.lead}>
      <AdminApprovals />
    </AdminShell>
  );
}
