import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminRequests from "@/components/admin/AdminRequests";
import { admin as A } from "@/data/admin";
import { adminWork as W } from "@/data/adminWork";
import { pageMetadata } from "@/lib/seo";

// Platform admin, Phase 2: Requests and fulfilment (components/admin/AdminRequests). Private, so kept out of search.
export const metadata = pageMetadata({ title: `Requests and fulfilment | ${A.title}`, description: W.requests.lead, path: "/admin/requests", noindex: true });

export default function Page() {
  return (
    <AdminShell current="requests" title={W.requests.title} lead={W.requests.lead}>
      <AdminRequests />
    </AdminShell>
  );
}
