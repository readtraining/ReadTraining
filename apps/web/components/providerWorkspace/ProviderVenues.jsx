"use client";

import React, { useCallback, useState } from "react";
import Toast from "@/components/courses/Toast";
import { VenuesTab } from "./SettingsProfile";

// Venues (/provider/venues): search, each venue with its linked courses, add, edit, archive (VenuesTab).
export default function ProviderVenues() {
  const [toast, setToast] = useState(null);
  const say = useCallback((message) => setToast({ message }), []);
  return (
    <>
      <VenuesTab say={say} />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}
