"use client";

import React, { useCallback, useState } from "react";
import Toast from "@/components/courses/Toast";
import { ErrorState } from "@/components/states/States";
import ProviderCourseEditor from "@/components/providerWorkspace/ProviderCourseEditor";
import ProviderCohorts from "@/components/providerWorkspace/ProviderCohorts";
import ProviderPackages from "@/components/providerWorkspace/ProviderPackages";
import { InfoTab, TermsTab, VenuesTab } from "@/components/providerWorkspace/SettingsProfile";
import { FaqsTab } from "@/components/providerWorkspace/SettingsFaqs";
import { api } from "@/lib/trpc/react";
import { DetailSkeleton, Empty, PageLink, Tabs, getQuery, setQuery } from "./adminParts";
import StaffEdit from "./StaffEdit";

// The admin's edit pages for a provider's work (StaffEdit hosts the provider's own editors inside the admin):
// a course (/admin/catalogue/<id>/edit; a shared page keeps the admin's own editor), and the provider's price plans, dates, and
// profile and logo, terms, FAQs and venues (/admin/providers/<slug>/plans | dates | profile).

export function AdminCourseEdit({ courseId }) {
  const course = api.admin.courses.get.useQuery({ courseId: Number(courseId) }, { retry: (n, e) => e?.data?.code !== "NOT_FOUND" && n < 2 });
  if (course.isLoading) return <DetailSkeleton />;
  if (course.error?.data?.code === "NOT_FOUND") return <Empty kind="missing" />;
  if (course.error) return <ErrorState onRetry={() => course.refetch()} />;
  if (course.data.kind !== "provider") return <ProviderCourseEditor courseId={courseId} scope="admin" />;
  return (
    <StaffEdit provider={course.data.provider}>
      <ProviderCourseEditor courseId={courseId} />
    </StaffEdit>
  );
}

function ProviderFrame({ slug, children }) {
  const p = api.admin.staff.provider.useQuery({ slug }, { retry: (n, e) => e?.data?.code !== "NOT_FOUND" && n < 2 });
  if (p.isLoading) return <DetailSkeleton />;
  if (p.error?.data?.code === "NOT_FOUND") return <Empty kind="missing" />;
  if (p.error) return <ErrorState onRetry={() => p.refetch()} />;
  // whose work this is, from the first look (the breadcrumb says which part: Dates, Price plans, Profile and venues)
  return (
    <StaffEdit provider={p.data} heading={<h1 className="rt-adm__h1 rt-adm-staffhead"><PageLink href={`/admin/providers/${p.data.slug}`}>{p.data.name}</PageLink></h1>}>
      {children}
    </StaffEdit>
  );
}

export function AdminProviderPlans({ slug }) {
  return <ProviderFrame slug={slug}><ProviderPackages /></ProviderFrame>;
}

export function AdminProviderDates({ slug }) {
  return <ProviderFrame slug={slug}><ProviderCohorts /></ProviderFrame>;
}

const TABS = [
  { key: "info", label: "Profile", Panel: InfoTab },
  { key: "terms", label: "Cancellation and terms", Panel: TermsTab },
  { key: "faqs", label: "FAQs", Panel: FaqsTab },
  { key: "venues", label: "Venues", Panel: VenuesTab },
];
export function AdminProviderProfile({ slug }) {
  const [tab, setTab] = useState(() => (TABS.some((t) => t.key === getQuery("tab")) ? getQuery("tab") : "info"));
  const [toast, setToast] = useState(null);
  const [said, setSaid] = useState("");
  // a toast, or only read out when the page already shows the change (`shown`: a logo, the FAQs' order)
  const say = useCallback((message, { shown = false, error = false } = {}) => (shown ? setSaid(message) : setToast({ message, error })), []);
  const Panel = TABS.find((t) => t.key === tab).Panel;
  return (
    <ProviderFrame slug={slug}>
      <div className="rt-acc__stack">
        <Tabs tabs={TABS.map(({ key, label }) => ({ key, label }))} value={tab} onChange={(k) => { setTab(k); setQuery("tab", k); }} label="Provider details" />
        <Panel say={say} />
      </div>
      <Toast toast={toast} onDone={() => setToast(null)} />
      <p className="rt-sr" aria-live="polite">{said}</p>
    </ProviderFrame>
  );
}
