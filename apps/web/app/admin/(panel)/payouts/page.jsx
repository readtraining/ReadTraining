import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminPayouts } from "@/components/admin/AdminPayouts";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: Payouts (components/admin/AdminPayouts), real money records. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.payouts.title} | ${A.title}`, description: A.payouts.lead, path: "/admin/payouts", noindex: true });

export default function Page() {
  return (
    <AdminShell current="payouts" title={A.payouts.title} lead={A.payouts.lead}>
      <AdminPayouts />
    </AdminShell>
  );
}
