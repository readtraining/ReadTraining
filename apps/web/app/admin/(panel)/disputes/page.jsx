import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminDisputes } from "@/components/admin/AdminRefunds";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: Disputes (components/admin/AdminRefunds), real money records. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.disputes.title} | ${A.title}`, description: A.disputes.lead, path: "/admin/disputes", noindex: true });

export default function Page() {
  return (
    <AdminShell current="disputes" title={A.disputes.title} lead={A.disputes.lead}>
      <AdminDisputes />
    </AdminShell>
  );
}
