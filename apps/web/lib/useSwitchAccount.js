"use client";

import { useRouter } from "next/navigation";
import { account } from "@/data/account";
import { api } from "@/lib/trpc/react";
import { useMe } from "@/lib/useMe";

const c = account.switchAccount;
const initialsOf = (s = "") => s.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// Switch account (Hurak's model: one login, several identities). The entries are the identities this login really has (from
// the API), the current one marked, then "Become a provider" / "Create a business account" for the ones it hasn't got.
// `current`: { kind: "student" } or { kind: "provider" | "business", organisationId }. go(entry) logs the switch, then opens it.
export function useSwitchAccount(current) {
  const { data } = useMe();
  const router = useRouter();
  const log = api.organisations.switchIdentity.useMutation();
  const ids = data?.identities ?? [];
  const myInitials = data ? initialsOf(`${data.profile.firstName} ${data.profile.lastName}`) : "";
  const isCurrent = (i) => i.kind === current?.kind && (i.kind === "student" || i.organisationId === current?.organisationId);
  const entries = ids
    .filter((i) => i.kind !== "admin")
    .map((i) =>
      i.kind === "student"
        ? { key: "student", kind: "student", mark: myInitials, label: c.student.label, sub: c.student.sub, href: c.student.href, current: isCurrent(i) }
        : { key: i.organisationId, kind: i.kind, organisationId: i.organisationId, mark: initialsOf(i.name), label: i.name, sub: c[i.kind].sub, href: c[i.kind].href, current: isCurrent(i) },
    );
  if (data && !ids.some((i) => i.kind === "provider")) entries.push({ key: "add-provider", kind: "add", mark: "+", label: c.becomeProvider.label, sub: c.becomeProvider.sub, href: c.becomeProvider.href });
  if (data && !ids.some((i) => i.kind === "business")) entries.push({ key: "add-business", kind: "add", mark: "+", label: c.createBusiness.label, sub: c.createBusiness.sub, href: c.createBusiness.href });

  const go = async (entry) => {
    if (entry.current) return;
    if (entry.kind !== "add") {
      // the switch is recorded in the activity log; a failed log never stops the switch
      await log.mutateAsync({ to: entry.kind, organisationId: entry.organisationId }).catch(() => {});
    }
    router.push(entry.href);
  };
  return { ready: Boolean(data), entries, go, title: c.title, currentLabel: c.current };
}
