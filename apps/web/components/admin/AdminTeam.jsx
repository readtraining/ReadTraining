"use client";

import React, { useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { CheckRow } from "@/components/courses/RadioRow";
import { CardChoice } from "@/components/providerWorkspace/providerParts";
import { EmptyState, ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { focusFirstError } from "@/lib/focusFirstError";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { RowMenu, formatWhen, Said, TableSkeleton, useSort, SortTh } from "./adminParts";
import { AdminStatus } from "./AdminStatus";

const copy = A.team;
const PRESETS = ["full", "support", "finance", "custom"];
const presetOptions = PRESETS.map((value) => ({ value, label: copy.presets[value].label, text: copy.presets[value].text }));

const TEAM_SORT = { name: (a) => a.name, access: (a) => a.preset, limit: (a) => (a.preset === "full" ? Infinity : a.refundLimit), last: (a) => (a.lastSignInAt ? Date.parse(a.lastSignInAt) : null) };

// Admin Users & Roles: the real admin team (API admin.team). Each admin with their access, refund limit, two-step sign-in and
// last sign-in; "Add an admin" for an existing account; per row Change access, Reset two-step sign-in and Remove. Your own row
// has no actions (the API refuses them too), and the API keeps at least one Full admin. The super admin (the platform's owner)
// has no actions for anyone else, and once there is one, only they can add, change or remove Full admins, or hand the role on.
export default function AdminTeam() {
  const utils = api.useUtils();
  const list = api.admin.team.list.useQuery();
  const [form, setForm] = useState(null); // { mode: "add" | "change", userId?, name?, email, preset, permissions, refundLimit }
  const [confirm, setConfirm] = useState(null); // { kind: "remove" | "reset", admin }
  const [said, setSaid] = useState("");
  const sorter = useSort();

  if (list.isLoading) return <TableSkeleton rows={4} />;
  if (list.error) return <ErrorState onRetry={() => list.refetch()} />;
  const { me, meSuper, hasSuper, switches, presets, admins } = list.data;
  // once there is a super admin, Full access is theirs to give and take
  const fullLocked = hasSuper && !meSuper;
  const c = copy.columns;
  const done = (text) => {
    setSaid(text);
    utils.admin.team.list.invalidate();
  };

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <p className="rt-acc__note rt-adm-team__count">{admins.length === 1 ? "1 admin" : `${admins.length} admins`}</p>
        <button type="button" className="button -sm -purple-1 text-white" onClick={() => setForm({ mode: "add", email: "", preset: "support", permissions: [], refundLimit: "100" })}>{copy.add}</button>
      </div>
      <Said text={said} />

      {admins.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead><tr><SortTh label={c.name} col="name" sorter={sorter} /><SortTh label={c.access} col="access" sorter={sorter} /><SortTh label={c.limit} col="limit" sorter={sorter} numeric /><th scope="col">{c.twoStep}</th><SortTh label={c.last} col="last" sorter={sorter} numeric /><th scope="col"><span className="rt-sr">Actions</span></th></tr></thead>
            <tbody>
              {sorter.apply(admins, TEAM_SORT).map((a) => {
                const mine = a.userId === me;
                return (
                  <tr key={a.userId}>
                    <td data-label={c.name}><span className="rt-adm-strong">{a.name}{mine ? " (you)" : ""}</span><small>{a.email}</small></td>
                    <td data-label={c.access}>{a.isSuper ? <span className="rt-adm-strong" title={copy.superNote}>{copy.superAdmin}</span> : copy.presets[a.preset].label}{a.isSuper && <small>{copy.presets.full.label}</small>}{a.preset === "custom" && <small>{a.permissions.length} of {switches.length} switches</small>}</td>
                    <td data-label={c.limit}>{a.preset === "full" ? <span className="rt-adm-muted">No limit</span> : a.permissions.includes("refunds") ? `£${a.refundLimit}` : <span className="rt-adm-muted">No refunds</span>}</td>
                    <td data-label={c.twoStep}>{a.twoStep ? <AdminStatus kind="twoStep" status="on">On</AdminStatus> : a.preset === "full" ? <AdminStatus kind="twoStep" status="next">At next sign-in</AdminStatus> : <AdminStatus kind="twoStep" status="off">Off</AdminStatus>}</td>
                    <td data-label={c.last}>{a.lastSignInAt ? formatWhen(new Date(a.lastSignInAt).getTime()) : <span className="rt-adm-muted">Not yet</span>}</td>
                    <td data-label={mine ? undefined : "Actions"}>
                      {!mine && (
                        <RowMenu
                          label={`Actions for ${a.name}`}
                          items={a.isSuper || (fullLocked && a.preset === "full") ? [
                            { label: "See their activity", href: `/admin/activity?q=${a.userId}` },
                          ] : [
                            { label: copy.changeTitle, onClick: () => setForm({ mode: "change", userId: a.userId, name: a.name, email: a.email, preset: a.preset, permissions: a.preset === "custom" ? a.permissions : [], refundLimit: String(a.refundLimit) }) },
                            { label: "See their activity", href: `/admin/activity?q=${a.userId}` },
                            ...(a.twoStep ? [{ label: "Reset two-step sign-in", onClick: () => setConfirm({ kind: "reset", admin: a }) }] : []),
                            ...(meSuper && a.preset === "full" ? [{ label: copy.handOver, onClick: () => setConfirm({ kind: "super", admin: a }) }] : []),
                            { label: "Remove from the admin team", danger: true, onClick: () => setConfirm({ kind: "remove", admin: a }) },
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title={copy.empty} />}

      <AccessSheet form={form} setForm={setForm} switches={switches} presets={presets} canGiveFull={!fullLocked} onDone={done} />
      <ConfirmSheet confirm={confirm} onClose={() => setConfirm(null)} onDone={done} />
    </div>
  );
}

// Add an admin, or change one admin's access: preset cards; with Custom, the switches; the refund limit when they can refund
// and aren't Full. Errors inline, focus on the first.
function AccessSheet({ form, setForm, switches, presets, canGiveFull, onDone }) {
  const add = api.admin.team.add.useMutation();
  const update = api.admin.team.update.useMutation();
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const ref = useRef(null);
  const close = () => {
    setForm(null);
    setErrors({});
    setGeneral("");
  };
  if (!form) return <Sheet open={false} onClose={close} title="" closeLabel="Close" />;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const allowed = form.preset === "custom" ? form.permissions : presets[form.preset];
  const needsLimit = form.preset !== "full" && allowed.includes("refunds");
  const busy = add.isPending || update.isPending;
  const err = (k) => errors[k] && <p className="rt-q__err" id={`rt-adm-t-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>;

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (form.mode === "add" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) found.email = "Enter an email address in the correct format, like name@example.com.";
    if (form.preset === "custom" && !form.permissions.length) found.permissions = "Choose at least one switch.";
    if (needsLimit && (!/^\d+$/.test(form.refundLimit.trim()) || Number(form.refundLimit) > 100000)) found.refundLimit = "Enter a whole number of pounds from 0 to 100000.";
    setErrors(found);
    setGeneral("");
    if (Object.keys(found).length) return focusFirstError(ref.current);
    const body = { preset: form.preset, permissions: form.preset === "custom" ? form.permissions : undefined, refundLimit: Number(form.refundLimit) || 0 };
    try {
      if (form.mode === "add") await add.mutateAsync({ email: form.email.trim(), ...body });
      else await update.mutateAsync({ userId: form.userId, ...body });
      onDone(form.mode === "add" ? `${form.email.trim()} added to the admin team` : `${form.name}'s access changed`);
      close();
    } catch (error) {
      const { fields, general: g } = errorsFrom(error);
      setErrors(fields);
      setGeneral(g);
      if (Object.keys(fields).length) focusFirstError(ref.current);
    }
  };

  return (
    <Sheet open onClose={close} title={form.mode === "add" ? copy.addTitle : `${copy.changeTitle}: ${form.name}`} closeLabel="Close">
      <form className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate ref={ref}>
        {form.mode === "add" ? (
          <div className="rt-field">
            <label htmlFor="rt-adm-t-email">Email address of their ReadTraining account</label>
            {err("email")}
            <input id="rt-adm-t-email" type="email" inputMode="email" spellCheck={false} autoComplete="off" value={form.email} onChange={(e) => set({ email: e.target.value })} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "rt-adm-t-email-e" : undefined} />
          </div>
        ) : <p className="rt-acc__note">{form.email}</p>}

        <CardChoice name="rt-adm-t-preset" legend="Access" value={form.preset} onChange={(preset) => set({ preset })} options={canGiveFull ? presetOptions : presetOptions.filter((o) => o.value !== "full")} />

        {form.preset === "custom" && (
          <fieldset className="rt-field" aria-describedby={errors.permissions ? "rt-adm-t-permissions-e" : undefined}>
            <legend>Switches</legend>
            {err("permissions")}
            <div className="rt-adm-team__switches">
              {switches.map((s) => (
                <CheckRow key={s} name="rt-adm-t-switch" opt={{ value: s, label: copy.switches[s] }} checked={form.permissions.includes(s)} onChange={() => set({ permissions: form.permissions.includes(s) ? form.permissions.filter((p) => p !== s) : [...form.permissions, s] })} />
              ))}
            </div>
          </fieldset>
        )}

        {needsLimit && (
          <div className="rt-field">
            <label htmlFor="rt-adm-t-limit">Refund and credit limit (£)</label>
            <small className="rt-field__hint" id="rt-adm-t-limit-hint">Above this, a Full or Finance admin decides.</small>
            {err("refundLimit")}
            <input id="rt-adm-t-limit" type="text" inputMode="numeric" className="rt-adm-num" value={form.refundLimit} onChange={(e) => set({ refundLimit: e.target.value })} aria-invalid={errors.refundLimit ? true : undefined} aria-describedby={`rt-adm-t-limit-hint${errors.refundLimit ? " rt-adm-t-refundLimit-e" : ""}`} />
          </div>
        )}

        {form.mode === "add" && <p className="rt-acc__note">{copy.addNote}</p>}
        {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy}>{form.mode === "add" ? copy.add : "Save access"}</button>
      </form>
    </Sheet>
  );
}

// Remove from the team, or reset two-step sign-in: what happens, then the button.
function ConfirmSheet({ confirm, onClose, onDone }) {
  const revoke = api.admin.team.revoke.useMutation();
  const reset = api.admin.team.resetTwoStep.useMutation();
  const handOver = api.admin.team.handOver.useMutation();
  const [general, setGeneral] = useState("");
  const close = () => {
    setGeneral("");
    onClose();
  };
  if (!confirm) return <Sheet open={false} onClose={close} title="" closeLabel="Close" />;
  const removing = confirm.kind === "remove";
  const handing = confirm.kind === "super";
  const { admin: a } = confirm;
  const go = async () => {
    try {
      if (removing) await revoke.mutateAsync({ userId: a.userId });
      else if (handing) await handOver.mutateAsync({ userId: a.userId });
      else await reset.mutateAsync({ userId: a.userId });
      onDone(removing ? `${a.name} removed from the admin team` : handing ? `${a.name} is now the super admin` : `${a.name}'s two-step sign-in reset`);
      close();
    } catch (error) {
      setGeneral(errorsFrom(error).general);
    }
  };
  return (
    <Sheet open onClose={close} title={removing ? copy.removeTitle : handing ? copy.handOverTitle : copy.resetTitle} closeLabel="Close">
      <div className="rt-q__form rt-biz__sheetform">
        <p className="rt-adm-strong">{a.name}<small>{a.email}</small></p>
        <p className="rt-acc__note">{removing ? copy.removeText : handing ? copy.handOverText : copy.resetText}</p>
        {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
        <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={go} disabled={revoke.isPending || reset.isPending || handOver.isPending}>{removing ? "Remove" : handing ? copy.handOver : "Reset two-step sign-in"}</button>
      </div>
    </Sheet>
  );
}
