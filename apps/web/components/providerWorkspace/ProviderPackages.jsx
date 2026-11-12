"use client";

import React, { useCallback, useEffect, useState } from "react";
import Toast from "@/components/courses/Toast";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { errorsFrom } from "@/lib/useMe";
import { formatPrice } from "@/lib/format";
import PackageEditor from "./PackageEditor";
import { Loading, RowMenu, Search, ToolSelect, getQuery, setQuery } from "./providerParts";
import { Confirm } from "./settingsForm";
import { EmptyState, ErrorState } from "@/components/states/States";

const SHOW = [{ value: "", label: "In use" }, { value: "archive", label: "Archived" }, { value: "all", label: "All plans" }];
const usedText = (u) => [u.dates ? `${u.dates} upcoming ${u.dates === 1 ? "date" : "dates"}` : "", u.courses ? `${u.courses} self-paced ${u.courses === 1 ? "course" : "courses"}` : ""].filter(Boolean).join(" and ") || "Not used yet";

// Price plans (Hurak's Tiered Plans), from the API (provider.plans): each plan's packages and prices, and how many dates and
// courses use it. A plan is the provider's own pricing: saving it changes what learners see at once. A date chooses its plan in its own form ("Tiered" pricing); a self-paced course in its
// course pricing. Edit opens the plan; a plan is archived (dates on it keep it) or, when nothing
// ever used it, deleted. Search and the archive filter are kept in the address.
export default function ProviderPackages() {
  const { organisationId, can } = useProviderAccess();
  const edit = can("provider.pricing.edit");
  const utils = api.useUtils();
  const query = api.provider.plans.list.useQuery({ organisationId }, { enabled: Boolean(organisationId) });
  const archive = api.provider.plans.setArchived.useMutation();
  const remove = api.provider.plans.remove.useMutation();
  const [q, setQ] = useState("");
  const [show, setShow] = useState("");
  const [editor, setEditor] = useState({ open: false, plan: null });
  const [removing, setRemoving] = useState(null);
  const [toast, setToast] = useState(null);
  const clearToast = useCallback(() => setToast(null), []);
  const say = (message) => setToast({ message });
  const fail = (er) => say(errorsFrom(er).general || "That didn’t work. Please try again.");
  const refresh = () => utils.provider.plans.list.invalidate();

  useEffect(() => {
    setQ(getQuery("q") || "");
    const s = getQuery("show");
    if (SHOW.some((x) => x.value === s)) setShow(s);
  }, []);
  if (query.isError) return <ErrorState title="We couldn't load your price plans." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!query.data) return <Loading rows={3} />;

  const plans = query.data;
  const needle = q.trim().toLowerCase();
  const list = plans.filter((p) => !needle || p.name.toLowerCase().includes(needle)).filter((p) => (show === "all" ? true : show === "archive" ? p.archived : !p.archived));
  const filtered = Boolean(needle || show);
  const setParam = (k, setter) => (v) => { setter(v); setQuery(k, k === "q" ? v.trim() : v); };
  const clear = () => { setQ(""); setShow(""); ["q", "show"].forEach((k) => setQuery(k, "")); };
  const create = () => setEditor({ open: true, plan: null });
  const inUse = Boolean(removing && removing.used.dates + removing.used.courses);
  const editor_ = <PackageEditor open={editor.open} plan={editor.plan} onClose={() => setEditor((x) => ({ ...x, open: false }))} onSaved={() => say("Plan saved")} />;

  if (!plans.length) {
    return (
      <>
        <EmptyState title="No price plans yet" text="Create packages like Basic, Plus and Pro once, then choose the plan on any of your dates." action={edit ? { label: "Create price plan", onClick: create } : undefined} />
        {editor_}
        <Toast toast={toast} onDone={clearToast} />
      </>
    );
  }

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Search value={q} onChange={setParam("q", setQ)} label="Search your price plans" />
        <div className="rt-adm-toolbar__end">
          <ToolSelect id="rt-plan-show" label="Show" value={show} onChange={setParam("show", setShow)} options={SHOW} />
          {filtered && <button type="button" className="rt-cd__link" onClick={clear}>Clear filters</button>}
          {edit && <button type="button" className="button -md -purple-1 text-white" onClick={create}>Create price plan</button>}
        </div>
      </div>
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "plan" : "plans"}`}</p>

      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table rt-pws-pkgs">
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col">Packages</th>
                <th scope="col"><span className="rt-sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                return (
                  <tr key={p.id}>
                    <td data-label="Plan">
                      {edit ? <button type="button" className="rt-pws-pkgs__name" onClick={() => setEditor({ open: true, plan: p })}>{p.name}</button> : <strong>{p.name}</strong>}
                      <small className="rt-adm-muted">{p.archived ? "Archived · " : ""}{usedText(p.used)}</small>
                    </td>
                    <td data-label="Packages">
                      <ul className="rt-pws-pkgs__tiers">
                        {p.tiers.map((t) => <li key={t.name}><span>{t.name}</span> <b className="rt-pws-money__num">{formatPrice(t.pricePence / 100)}</b></li>)}
                      </ul>
                    </td>
                    <td data-label="Actions">
                      {edit && (
                        <RowMenu label={`Actions for ${p.name}`} items={[
                          { label: "Edit", onClick: () => setEditor({ open: true, plan: p }) },
                          { label: p.archived ? "Use again" : "Archive", onClick: () => archive.mutate({ organisationId, planId: p.id, archived: !p.archived }, { onSuccess: () => { refresh(); say(p.archived ? `${p.name} can be chosen again` : `${p.name} archived`); }, onError: fail }) },
                          { label: "Delete", onClick: () => setRemoving(p) },
                        ]} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        // every plan archived, nothing searched: say so and open the archive, rather than "clear filters" with none set
        filtered ? (
          <EmptyState title="No plans match these filters." action={{ label: "Clear filters", onClick: clear }} />
        ) : (
          <EmptyState title="No plans in use" text="Your plans are archived. Use one again from the archive, or create a new one." action={{ label: "Show archived plans", onClick: () => setParam("show", setShow)("archive") }} />
        )
      )}
      <p className="rt-acc__note">Choose a plan on a date (its pricing: Tiered) or on a self-paced course. Archived plans stay on the dates that use them, but can&apos;t be chosen for others.</p>

      {editor_}
      {/* a plan in use only says why it can't go (no "will be deleted" above it) */}
      <Confirm open={Boolean(removing)} onClose={() => setRemoving(null)} title={inUse ? "This plan can’t be deleted" : "Delete this plan?"} confirmLabel="Delete plan" busy={remove.isPending}
        text={removing && !inUse ? `${removing.name} and its packages will be deleted. This can’t be undone.` : ""}
        blocked={inUse ? `${usedText(removing.used)} use this plan, so it can’t be deleted. Archive it instead.` : ""}
        onConfirm={() => remove.mutate({ organisationId, planId: removing.id }, { onSuccess: () => { refresh(); say("Plan deleted"); setRemoving(null); }, onError: (er) => { fail(er); setRemoving(null); } })} />
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
