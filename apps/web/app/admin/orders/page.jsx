import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminOrders from "@/components/admin/AdminOrders";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: orders and bookings (components/admin/AdminOrders). Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.orders.title} | ${A.title}`, description: A.orders.lead, path: "/admin/orders", noindex: true });

export default function Page() {
  return (
    <AdminShell current="orders" title={A.orders.title} lead={A.orders.lead}>
      <AdminOrders />
    </AdminShell>
  );
}
