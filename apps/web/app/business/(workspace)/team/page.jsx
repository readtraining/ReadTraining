import React from "react";
import AccountShell from "@/components/account/AccountShell";
import BizTeam from "@/components/businessAccount/BizTeam";
import FormGate from "@/components/forms/FormGate";
import { businessAccount as biz } from "@/data/businessAccount";
import { pageMetadata } from "@/lib/seo";

// Business account: the team who manage the account (components/businessAccount/BizTeam; copy: data/businessAccount.js; reads:
// lib/businessAccount.js). Private, so kept out of search. The team only saves in this browser and sends no invites yet, so it
// stays behind the "coming soon" switch (lib/forms.js `businessTeam`) until it does.
export const metadata = pageMetadata({ title: "Team | ReadTraining", description: "Your ReadTraining Business account.", path: "/business/team", noindex: true });

export default function Page() {
  return (
    <AccountShell area="business" current="team" title={biz.team.title} lead={biz.team.lead}>
      <FormGate form="businessTeam">
        <BizTeam />
      </FormGate>
    </AccountShell>
  );
}
