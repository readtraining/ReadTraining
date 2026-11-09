import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminClosures } from "@/components/admin/AdminClosures";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: account closure requests (components/admin/AdminClosures). Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.closures.title} | ${A.title}`, description: A.closures.lead, path: "/admin/closure-requests", noindex: true });

export default function Page() {
  return (
    <AdminShell current="closures" title={A.closures.title} lead={A.closures.lead}>
      <AdminClosures />
    </AdminShell>
  );
}
