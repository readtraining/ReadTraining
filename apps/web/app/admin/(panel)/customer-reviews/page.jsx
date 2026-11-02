import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminCustomerReviews from "@/components/admin/AdminCustomerReviews";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: Customer reviews (components/admin/AdminCustomerReviews), real. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.customerReviews.title} | ${A.title}`, description: A.customerReviews.lead, path: "/admin/customer-reviews", noindex: true });

export default function Page() {
  return (
    <AdminShell current="customerReviews" title={A.customerReviews.title} lead={A.customerReviews.lead}>
      <AdminCustomerReviews />
    </AdminShell>
  );
}
