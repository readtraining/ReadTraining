import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminCoupons from "@/components/admin/AdminCoupons";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: Coupons (components/admin/AdminCoupons), real. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.coupons.title} | ${A.title}`, description: A.coupons.lead, path: "/admin/coupons", noindex: true });

export default function Page() {
  return (
    <AdminShell current="coupons" title={A.coupons.title} lead={A.coupons.lead}>
      <AdminCoupons />
    </AdminShell>
  );
}
