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
import { HeaderAction } from "@/components/admin/adminParts";

const SHOW = [{ value: "", label: "In use" }, { value: "archive", label: "Archived" }, { value: "all", label: "All plans" }];
// the packages' prices as one range ("£299.00 – £449.00"), or one price when they are all the same
const priceRange = (tiers) => {
  const p = tiers.map((t) => t.pricePence);
  const lo = Math.min(...p);
  const hi = Math.max(...p);
  return lo === hi ? formatPrice(lo / 100) : `${formatPrice(lo / 100)} – ${formatPrice(hi / 100)}`;
};
const usedText = (u) => [u.dates ? `${u.dates} upcoming ${u.dates === 1 ? "date" : "dates"}` : "", u.courses ? `${u.courses} self-paced ${u.courses === 1 ? "course" : "courses"}` : ""].filter(Boolean).join(" and ") || (u.ever ? "Used by past dates" : "Not used yet");

// Price plans (Tiered Plans), from the API (provider.plans): each plan's packages and prices, and how many dates and
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
  // the plan being deleted, kept while its pop-up closes (so its words don't change as it fades)
  const [removing, setRemoving] = useState({ open: false, plan: null });
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
  // a link to one plan (/plans?plan=<id>, from a course's prices in the admin) opens it once the plans have loaded: an archived
  // plan with the archive shown; one that isn't this provider's (or no longer exists) opens nothing
  const linked = query.data && getQuery("plan");
  useEffect(() => {
    if (!linked) return;
    const p = query.data.find((x) => x.id === linked);
    if (p && edit) {
      if (p.archived) setShow("all");
      setEditor({ open: true, plan: p });
    } else setQuery("plan", "");
  }, [linked]); // eslint-disable-line react-hooks/exhaustive-deps -- once per link
  const closeEditor = () => {
    setEditor((x) => ({ ...x, open: false }));
    if (getQuery("plan")) setQuery("plan", "");
  };
  if (query.isError) return <ErrorState title="We couldn't load your price plans." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!query.data) return <Loading rows={3} />;

  const plans = query.data;
  const needle = q.trim().toLowerCase();
  const list = plans.filter((p) => !needle || p.name.toLowerCase().includes(needle)).filter((p) => (show === "all" ? true : show === "archive" ? p.archived : !p.archived));
  const filtered = Boolean(needle || show);
  const setParam = (k, setter) => (v) => { setter(v); setQuery(k, k === "q" ? v.trim() : v); };
  const clear = () => { setQ(""); setShow(""); ["q", "show"].forEach((k) => setQuery(k, "")); };
  const create = () => setEditor({ open: true, plan: null });
  // Delete is offered only for a plan nothing has ever used (as the API decides): one any date has used (past ones keep it) or a
  // self-paced course is on is archived instead, as everywhere in the workspace a delete shows only where it can work
  const deletable = (p) => !p.used.ever && !p.used.courses;
  const closeRemoving = () => setRemoving((r) => ({ ...r, open: false }));
  const editor_ = <PackageEditor open={editor.open} plan={editor.plan} onClose={closeEditor} onSaved={() => say("Plan saved")} />;

  if (!plans.length) {
    return (
      <>
        <EmptyState title="No price plans yet" text="A plan is optional: without one, each date has a single price." action={edit ? { label: "Create price plan", onClick: create } : undefined} />
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
          {edit && <HeaderAction><button type="button" className="button -md -purple-1 text-white" onClick={create}>Create price plan</button></HeaderAction>}
        </div>
      </div>
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "plan" : "plans"}`}</p>

      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table rt-pws-pkgs">
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col">Used on</th>
                <th scope="col" className="rt-adm-num">Prices</th>
                {edit && <th scope="col" className="-act"><span className="rt-sr">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                return (
                  <tr key={p.id}>
                    <td data-label="Plan">
                      {edit ? <button type="button" className="rt-pws-pkgs__name" onClick={() => setEditor({ open: true, plan: p })}>{p.name}</button> : <strong>{p.name}</strong>}
                      <small className="rt-adm-muted">{p.tiers.length} packages: {p.tiers.map((t) => t.name).join(", ")}</small>
                    </td>
                    <td data-label="Used on">{p.archived ? "Archived · " : ""}{usedText(p.used)}</td>
                    <td data-label="Prices" className="rt-adm-num-cell">{priceRange(p.tiers)}</td>
                    {edit && (
                    <td data-label="Actions" className="-act">
                        <RowMenu label={`Actions for ${p.name}`} items={[
                          { label: "Edit", onClick: () => setEditor({ open: true, plan: p }) },
                          { label: p.archived ? "Use again" : "Archive", onClick: () => !archive.isPending && archive.mutate({ organisationId, planId: p.id, archived: !p.archived }, { onSuccess: () => { refresh(); say(p.archived ? `${p.name} can be chosen again` : `${p.name} archived`); }, onError: fail }) },
                          ...(deletable(p) ? [{ label: "Delete", danger: true, onClick: () => setRemoving({ open: true, plan: p }) }] : []),
                        ]} />
                    </td>
                    )}
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

      {editor_}
      <Confirm danger open={removing.open} onClose={closeRemoving} title="Delete this plan?" confirmLabel="Delete plan" busy={remove.isPending}
        text={removing.plan ? `${removing.plan.name} and its packages will be deleted. This can’t be undone.` : ""}
        onConfirm={() => remove.mutate({ organisationId, planId: removing.plan.id }, { onSuccess: () => { refresh(); say("Plan deleted"); closeRemoving(); }, onError: (er) => { fail(er); closeRemoving(); } })} />
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
