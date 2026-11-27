"use client";

import React, { useCallback, useState } from "react";
import Toast from "@/components/courses/Toast";
import { VenuesTab } from "./SettingsProfile";
import { useProviderAccess } from "@/lib/providerAccess";
import { EmptyState } from "@/components/states/States";
import { pw } from "@/data/providerWorkspace";

// Venues (/provider/venues): search, each venue with its linked courses, add, edit, archive (VenuesTab).
export default function ProviderVenues() {
  const { staff, status } = useProviderAccess();
  // an account our team hasn't approved yet can't add venues: the page says why, as Courses and Price plans do
  if (!staff && (status === "pending" || status === "changes_requested")) return <EmptyState title={pw.notApproved.title} text={pw.notApproved.text} action={pw.notApproved.action} />;
  return <VenuesPage />;
}

function VenuesPage() {
  const [toast, setToast] = useState(null);
  const say = useCallback((message, { error = false } = {}) => setToast({ message, error }), []);
  return (
    <>
      <VenuesTab say={say} />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}
