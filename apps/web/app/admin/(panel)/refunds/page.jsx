import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminRefunds } from "@/components/admin/AdminRefunds";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: Refunds (components/admin/AdminRefunds), real money records. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.refunds.title} | ${A.title}`, description: A.refunds.lead, path: "/admin/refunds", noindex: true });

export default function Page() {
  return (
    <AdminShell current="refunds" title={A.refunds.title} lead={A.refunds.lead}>
      <AdminRefunds />
    </AdminShell>
  );
}
