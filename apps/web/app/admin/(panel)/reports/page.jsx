import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminReports from "@/components/admin/AdminReports";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: Reports (components/admin/AdminReports), on demo orders. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.reports.title} | ${A.title}`, description: A.reports.lead, path: "/admin/reports", noindex: true });

export default function Page() {
  return (
    <AdminShell current="reports" title={A.reports.title} lead={A.reports.lead}>
      <AdminReports />
    </AdminShell>
  );
}
