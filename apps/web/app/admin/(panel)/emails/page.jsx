import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminEmails from "@/components/admin/AdminEmails";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: Emails list (components/admin/AdminEmails), real. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.emails.title} | ${A.title}`, description: A.emails.lead, path: "/admin/emails", noindex: true });

export default function Page() {
  return (
    <AdminShell current="emails" title={A.emails.title} lead={A.emails.lead}>
      <AdminEmails />
    </AdminShell>
  );
}
