"use client";

import React, { Suspense, useCallback, useState } from "react";
import Toast from "@/components/courses/Toast";
import { useProvider } from "@/lib/providerWorkspace";
import { useProviderAccess } from "@/lib/providerAccess";
import { EmptyState } from "@/components/states/States";
import FormGate from "@/components/forms/FormGate";
import { Loading } from "./providerParts";
import { TeamTab } from "./SettingsPeople";

// Team (Hurak's "Manage Team Members", from the account menu): the linked members with their roles, add a member by email and
// role, change a role, remove a member. Owners and admins only. Its records are still demo ones (lib/providerWorkspace.js), so it
// stays behind the "coming soon" switch (lib/forms.js `providerTeam`) until it saves through the API.
export default function ProviderTeam() {
  const { can } = useProviderAccess();
  const data = useProvider();
  const [toast, setToast] = useState(null);
  const say = useCallback((message) => setToast({ message }), []);
  const clear = useCallback(() => setToast(null), []);
  if (!can("provider.team.view")) return <EmptyState title="The team isn't part of your role" text="Ask your provider's owner or an admin if someone needs adding, changing or removing." />;
  return (
    <FormGate form="providerTeam">
      <Suspense fallback={<Loading rows={2} />}>
        {data ? <TeamTab data={data} say={say} /> : <Loading rows={2} />}
        <Toast toast={toast} onDone={clear} />
      </Suspense>
    </FormGate>
  );
}
