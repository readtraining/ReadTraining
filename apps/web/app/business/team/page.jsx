import React from "react";
import AccountShell from "@/components/account/AccountShell";
import BizTeam from "@/components/businessAccount/BizTeam";
import { businessAccount as biz } from "@/data/businessAccount";
import { pageMetadata } from "@/lib/seo";

// Business account: the team who manage the account (components/businessAccount/BizTeam; copy: data/businessAccount.js; reads:
// lib/businessAccount.js). Private, so kept out of search.
export const metadata = pageMetadata({ title: "Team | ReadTraining", description: "Your ReadTraining Business account.", path: "/business/team", noindex: true });

export default function Page() {
  return (
    <AccountShell area="business" current="team" title={biz.team.title} lead={biz.team.lead}>
      <BizTeam />
    </AccountShell>
  );
}
