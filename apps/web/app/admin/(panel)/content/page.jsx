import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminContent from "@/components/admin/AdminContent";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Site content (components/admin/AdminContent): the numbers, featured courses, testimonials and video words the site shares.
// Every admin can look; changing needs the "content" switch. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.content.title} | ${A.title}`, description: A.content.lead, path: "/admin/content", noindex: true });

export default function Page() {
  return (
    <AdminShell current="content" title={A.content.title} lead={A.content.lead}>
      <AdminContent />
    </AdminShell>
  );
}
