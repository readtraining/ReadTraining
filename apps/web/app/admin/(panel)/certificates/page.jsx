import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminCertificates from "@/components/admin/AdminCertificates";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: the certificate register (components/admin/AdminCertificates; demo records for now). Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.certificates.title} | ${A.title}`, description: A.certificates.lead, path: "/admin/certificates", noindex: true });

export default function Page() {
  return (
    <AdminShell current="certificates" title={A.certificates.title} lead={A.certificates.lead}>
      <AdminCertificates />
    </AdminShell>
  );
}
