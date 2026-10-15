"use client";

import React, { Suspense, useCallback, useState } from "react";
import Toast from "@/components/courses/Toast";
import { useProvider } from "@/lib/providerWorkspace";
import { Loading } from "./providerParts";
import { TeamTab } from "./SettingsPeople";

// Team (Hurak's "Manage Team Members", from the account menu): the linked members with their roles, add a member by email and
// role, change a role, remove a member.
export default function ProviderTeam() {
  const data = useProvider();
  const [toast, setToast] = useState(null);
  const say = useCallback((message) => setToast({ message }), []);
  const clear = useCallback(() => setToast(null), []);
  return (
    <Suspense fallback={<Loading rows={2} />}>
      {data ? <TeamTab data={data} say={say} /> : <Loading rows={2} />}
      <Toast toast={toast} onDone={clear} />
    </Suspense>
  );
}
