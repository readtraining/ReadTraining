import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminReviews from "@/components/admin/AdminReviews";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: Review moderation (components/admin/AdminReviews), on demo reviews. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.reviews.title} | ${A.title}`, description: A.reviews.lead, path: "/admin/reviews", noindex: true });

export default function Page() {
  return (
    <AdminShell current="reviews" title={A.reviews.title} lead={A.reviews.lead}>
      <AdminReviews />
    </AdminShell>
  );
}
