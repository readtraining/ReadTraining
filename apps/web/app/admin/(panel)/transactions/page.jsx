import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminTransactions } from "@/components/admin/AdminPayouts";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: Transactions (components/admin/AdminPayouts), real money records. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.ledger.title} | ${A.title}`, description: A.ledger.lead, path: "/admin/transactions", noindex: true });

export default function Page() {
  return (
    <AdminShell current="ledger" title={A.ledger.title} lead={A.ledger.lead}>
      <AdminTransactions />
    </AdminShell>
  );
}
