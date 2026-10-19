import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminOrder from "@/components/admin/AdminOrder";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: one order (components/admin/AdminOrder). Private, so kept out of search.
export async function generateMetadata(props) {
  const { ref } = await props.params;
  return pageMetadata({ title: `Order ${ref} | ${A.title}`, description: A.orders.lead, path: `/admin/orders/${ref}`, noindex: true });
}

export default async function Page(props) {
  const { ref } = await props.params;
  return (
    <AdminShell current="orders" title={A.orders.title} detail={ref}>
      <AdminOrder reference={ref} />
    </AdminShell>
  );
}
