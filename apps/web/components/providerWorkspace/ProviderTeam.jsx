"use client";

import React, { useCallback, useState } from "react";
import Toast from "@/components/courses/Toast";
import { useProviderAccess } from "@/lib/providerAccess";
import { EmptyState } from "@/components/states/States";
import { TeamTab } from "./SettingsPeople";

// Team (from the account menu): the provider's people with their roles; the owner and admins invite, change roles and remove
// (TeamTab, API provider.team).
export default function ProviderTeam() {
  const { can } = useProviderAccess();
  const [toast, setToast] = useState(null);
  const say = useCallback((message, { error = false } = {}) => setToast({ message, error }), []);
  const clear = useCallback(() => setToast(null), []);
  if (!can("provider.team.view")) return <EmptyState title="The team isn't part of your role" text="Ask your provider's owner or an admin if someone needs adding, changing or removing." />;
  return (
    <>
      <TeamTab say={say} />
      <Toast toast={toast} onDone={clear} />
    </>
  );
}
