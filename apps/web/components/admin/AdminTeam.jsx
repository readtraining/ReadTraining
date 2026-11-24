"use client";

import React, { useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { CheckRow } from "@/components/courses/RadioRow";
import { ADMIN_TWO_STEP } from "@readtraining/permissions";
import { ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { focusFirstError } from "@/lib/focusFirstError";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { ColWidths, RowMenu, formatWhen, Said, TableSkeleton, useSort, SortTh, Empty, HeaderAction, Req } from "./adminParts";
import { AdminStatus } from "./AdminStatus";

const copy = A.team;
const PRESETS = ["full", "support", "finance", "custom"];
const presetOptions = PRESETS.map((value) => ({ value, label: copy.presets[value].label, text: copy.presets[value].text }));
// an admin's access in words: Full, Support, Finance, or the roles held together ("Support + Finance"), with single switches
const accessLabel = (a) => (a.preset === "custom" && a.roles?.length ? a.roles.map((r) => copy.presets[r].label).join(" + ") : copy.presets[a.preset].label);
// what the access form starts from: the ticked cards (full, support, finance, custom) and the single switches
const picked = (a) => (a.preset === "custom" ? [...(a.roles ?? []), ...(a.extra?.length || !a.roles?.length ? ["custom"] : [])] : [a.preset]);
const formFor = (a) => ({ mode: "change", userId: a.userId, name: a.name, email: a.email, picked: picked(a), permissions: a.preset === "custom" ? a.extra ?? [] : [], refundLimit: String(a.refundLimit) });

const TEAM_SORT = { name: (a) => a.name, access: (a) => a.preset, limit: (a) => (a.preset === "full" ? Infinity : a.refundLimit), last: (a) => (a.lastSignInAt ? Date.parse(a.lastSignInAt) : null) };

// Admin Users & Roles: the real admin team (API admin.team). Each admin with their access, refund limit, two-step sign-in and
// last sign-in; "Invite an admin" (no account needed: they get an email to choose a password; an existing account is added at
// once); per row Change access, Reset two-step sign-in and Remove, or for an invite not accepted yet Resend and Cancel. Your own
// row has no actions (the API refuses them too), and the API keeps at least one Full admin. The super admin (the platform's
// owner) has no actions for anyone else, and once there is one, only they can add, change or remove Full admins, or hand the
// role on.
export default function AdminTeam() {
  const utils = api.useUtils();
  const list = api.admin.team.list.useQuery();
  const resend = api.admin.team.resend.useMutation();
  const [form, setForm] = useState(null); // { mode: "add" | "change", userId?, name?, email, picked (ticked cards), permissions (single switches), refundLimit }
  const [confirm, setConfirm] = useState(null); // { kind: "remove" | "reset" | "super" | "cancel", admin }
  const [said, setSaid] = useState("");
  const sorter = useSort();
  const resendTo = async (a) => {
    try {
      const { emailed, outbox } = await resend.mutateAsync({ userId: a.userId });
      done(
        outbox ? `A new invite for ${a.email} was saved to the test outbox. This copy of the site doesn't send emails.`
        : emailed ? `A new invite was sent to ${a.email}` : `A new invite link was made, but the email to ${a.email} couldn't be sent. Try again in a moment.`,
      );
    } catch (error) {
      setSaid(errorsFrom(error).general);
    }
  };

  if (list.isLoading) return <TableSkeleton rows={4} />;
  if (list.error) return <ErrorState onRetry={() => list.refetch()} />;
  const { me, meSuper, hasSuper, grantable, myRefundLimit, switches, presets, admins } = list.data;
  // once there is a super admin, Full access is theirs to give and take, and nobody else gives (or changes someone who has)
  // more than they could give themselves
  const fullLocked = hasSuper && !meSuper;
  const outOfReach = (a) => a.permissions.some((p) => !grantable.includes(p));
  const firstPreset = ["support", "finance"].find((p) => presets[p].every((s) => grantable.includes(s))) ?? "custom";
  const c = copy.columns;
  const done = (text) => {
    setSaid(text);
    utils.admin.team.list.invalidate();
  };

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <p className="rt-acc__note rt-adm-team__count">{admins.length === 1 ? "1 admin" : `${admins.length} admins`}</p>
        {grantable.length ? (
          <HeaderAction><button type="button" className="button -md -purple-1 text-white" onClick={() => setForm({ mode: "add", email: "", picked: [firstPreset], permissions: [], refundLimit: "100" })}>{copy.add}</button></HeaderAction>
        ) : <p className="rt-acc__note">You can only give access you have yourself, so ask the super admin to invite people.</p>}
      </div>
      <Said text={said} />

      {admins.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <ColWidths widths={ADMIN_TWO_STEP ? ["28%", "17%", "15%", "13%", null, "64px"] : ["33%", "20%", "21%", null, "64px"]} />
            <thead><tr><SortTh label={c.name} col="name" sorter={sorter} /><SortTh label={c.access} col="access" sorter={sorter} /><SortTh label={c.limit} col="limit" sorter={sorter} numeric />{ADMIN_TWO_STEP && <th scope="col">{c.twoStep}</th>}<SortTh label={c.last} col="last" sorter={sorter} numeric /><th scope="col"><span className="rt-sr">Actions</span></th></tr></thead>
            <tbody>
              {sorter.apply(admins, TEAM_SORT).map((a) => {
                const mine = a.userId === me;
                return (
                  <tr key={a.userId}>
                    <td data-label={c.name}><span className="rt-adm-strong">{a.name}{mine ? " (you)" : ""}</span>{a.name !== a.email && <small>{a.email}</small>}</td>
                    <td data-label={c.access}>{a.isSuper ? <span className="rt-adm-strong" title={copy.superNote}>{copy.superAdmin}</span> : accessLabel(a)}{a.isSuper && <small>{copy.presets.full.label}</small>}{a.preset === "custom" && a.extra?.length > 0 && <small>{a.roles?.length ? `+ ${a.extra.length} more switches` : `${a.permissions.length} of ${switches.length} switches`}</small>}</td>
                    <td data-label={c.limit}>{a.preset === "full" ? <span className="rt-adm-muted">No limit</span> : a.permissions.includes("refunds") ? `£${a.refundLimit}` : <span className="rt-adm-muted">No refunds</span>}</td>
                    {ADMIN_TWO_STEP && <td data-label={c.twoStep}>{a.invite ? <span className="rt-adm-muted">–</span> : a.twoStep ? <AdminStatus kind="twoStep" status="on">On</AdminStatus> : a.preset === "full" ? <AdminStatus kind="twoStep" status="next">At next sign-in</AdminStatus> : <AdminStatus kind="twoStep" status="off">Off</AdminStatus>}</td>}
                    <td data-label={c.last}>
                      {a.invite ? (
                        <>
                          {a.invite.expired ? <AdminStatus kind="invite" status="expired">{copy.inviteExpired}</AdminStatus> : <AdminStatus kind="invite" status="sent">{copy.invited}</AdminStatus>}
                          <small>{copy.inviteSent(formatWhen(new Date(a.invite.sentAt).getTime()))}</small>
                        </>
                      ) : a.lastSignInAt ? formatWhen(new Date(a.lastSignInAt).getTime()) : <span className="rt-adm-muted">Not yet</span>}
                    </td>
                    <td data-label={mine ? undefined : "Actions"}>
                      {!mine && (
                        <RowMenu
                          label={`Actions for ${a.name}`}
                          items={a.isSuper || outOfReach(a) ? [
                            { label: "See their activity", href: `/admin/activity?q=${a.userId}` },
                          ] : a.invite ? [
                            { label: copy.resend, onClick: () => resendTo(a) },
                            { label: copy.changeTitle, onClick: () => setForm(formFor(a)) },
                            { label: copy.cancel, danger: true, onClick: () => setConfirm({ kind: "cancel", admin: a }) },
                          ] : [
                            { label: copy.changeTitle, onClick: () => setForm(formFor(a)) },
                            { label: "See their activity", href: `/admin/activity?q=${a.userId}` },
                            ...(ADMIN_TWO_STEP && a.twoStep ? [{ label: "Reset two-step sign-in", onClick: () => setConfirm({ kind: "reset", admin: a }) }] : []),
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
      ) : <Empty title={copy.empty} text="Admins you invite show here." />}

      <AccessSheet form={form} setForm={setForm} switches={switches.filter((s) => grantable.includes(s))} presets={presets} canGiveFull={!fullLocked} grantable={grantable} maxLimit={myRefundLimit ?? 100000} onDone={done} />
      <ConfirmSheet confirm={confirm} onClose={() => setConfirm(null)} onDone={done} />
    </div>
  );
}

// Add an admin, or change one admin's access: tick cards (Full on its own, or Support, Finance and Single switches together,
// one person holding them all); with Single switches, the switches; the refund limit when they can refund and aren't Full.
// Errors inline, focus on the first.
function AccessSheet({ form, setForm, switches, presets, canGiveFull, grantable, maxLimit, onDone }) {
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
  const full = form.picked.includes("full");
  const roles = form.picked.filter((p) => p === "support" || p === "finance");
  const single = form.picked.includes("custom");
  // ticking Full stands alone; ticking anything else takes Full off
  const tick = (value) => {
    const on = form.picked.includes(value);
    set({ picked: value === "full" ? (on ? [] : ["full"]) : on ? form.picked.filter((p) => p !== value) : [...form.picked.filter((p) => p !== "full"), value] });
  };
  const allowed = full ? presets.full : [...new Set([...roles.flatMap((r) => presets[r]), ...(single ? form.permissions : [])])];
  const needsLimit = !full && allowed.includes("refunds");
  const busy = add.isPending || update.isPending;
  const err = (k) => errors[k] && <p className="rt-q__err" id={`rt-adm-t-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>;

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (form.mode === "add" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) found.email = "Enter an email address in the correct format, like name@example.com.";
    if (!full && !roles.length && !(single && form.permissions.length)) found.permissions = single ? "Choose at least one switch." : "Choose the access they need.";
    if (needsLimit && (!/^\d+$/.test(form.refundLimit.trim()) || Number(form.refundLimit) > maxLimit)) found.refundLimit = `Enter a whole number of pounds from 0 to ${maxLimit}.`;
    setErrors(found);
    setGeneral("");
    if (Object.keys(found).length) return focusFirstError(ref.current);
    const body = full ? { preset: "full", refundLimit: 0 } : { preset: "custom", roles, permissions: single ? form.permissions : [], refundLimit: Number(form.refundLimit) || 0 };
    try {
      const email = form.email.trim();
      if (form.mode === "add") {
        const { invited, emailed, outbox } = await add.mutateAsync({ email, ...body });
        // a development copy saves emails to its test outbox instead of sending them: say so, so nobody waits for an email
        const test = " This copy of the site doesn't send emails: the email was saved to the test outbox.";
        onDone(
          invited
            ? outbox ? `${email} is invited.${test}` : emailed ? `Invite sent to ${email}` : `${email} is invited, but the email couldn't be sent. Use Resend invite on their row.`
            : outbox ? `${email} added to the admin team.${test}` : emailed ? `${email} added to the admin team. We've let them know by email.` : `${email} added to the admin team, but the email telling them couldn't be sent. Let them know yourself.`,
        );
      } else {
        const r = await update.mutateAsync({ userId: form.userId, ...body });
        // already what was asked (saved twice, or someone else made the same change): say so, not "changed"
        onDone(r.unchanged ? `${form.name} already has this access` : `${form.name}'s access changed`);
      }
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
            <label htmlFor="rt-adm-t-email">{copy.emailLabel}<Req /></label>
            {err("email")}
            <input id="rt-adm-t-email" type="email" inputMode="email" spellCheck={false} autoComplete="off" value={form.email} onChange={(e) => set({ email: e.target.value })} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "rt-adm-t-email-e" : undefined} />
          </div>
        ) : <p className="rt-acc__note">{form.email}</p>}

        <fieldset className="rt-field rt-pws-optcards" aria-describedby={errors.permissions && !single ? "rt-adm-t-permissions-e" : undefined}>
          <legend>Access<Req /></legend>
          {!single && err("permissions")}
          <div className="rt-pws-optcards__row">
            {presetOptions.filter((o) => (o.value === "full" ? canGiveFull : o.value === "custom" || presets[o.value].every((p) => grantable.includes(p)))).map((o) => (
              <label key={o.value} className={`rt-pws-optcard${form.picked.includes(o.value) ? " is-on" : ""}`}>
                <input type="checkbox" className="rt-fp__check" name="rt-adm-t-access" value={o.value} checked={form.picked.includes(o.value)} onChange={() => tick(o.value)} />
                <span><b>{o.label}</b><small>{o.text}</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        {single && (
          <fieldset className="rt-field rt-adm-team__fieldset" aria-describedby={errors.permissions ? "rt-adm-t-permissions-e" : undefined}>
            <legend>Switches<Req /></legend>
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
            <label htmlFor="rt-adm-t-limit">Refund and credit limit (£)<Req /></label>
            <small className="rt-field__hint" id="rt-adm-t-limit-hint">Above this, a Full or Finance admin decides.{maxLimit < 100000 && ` Up to £${maxLimit}, your own limit.`}</small>
            {err("refundLimit")}
            <input id="rt-adm-t-limit" type="text" inputMode="numeric" className="rt-adm-num" value={form.refundLimit} onChange={(e) => set({ refundLimit: e.target.value })} aria-invalid={errors.refundLimit ? true : undefined} aria-describedby={`rt-adm-t-limit-hint${errors.refundLimit ? " rt-adm-t-refundLimit-e" : ""}`} />
          </div>
        )}

        {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy}>{form.mode === "add" ? copy.send : "Save access"}</button>
      </form>
    </Sheet>
  );
}

// Remove from the team, cancel an invite, hand over the super admin role, or reset two-step sign-in: what happens, then the button.
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
  const { kind, admin: a } = confirm;
  // what each confirmation says and does (cancelling an invite is a removal of someone who never accepted)
  const sheet = {
    remove: { title: copy.removeTitle, text: copy.removeText, button: "Remove", run: () => revoke.mutateAsync({ userId: a.userId }), said: `${a.name} removed from the admin team` },
    cancel: { title: copy.cancelTitle, text: copy.cancelText, button: copy.cancel, run: () => revoke.mutateAsync({ userId: a.userId }), said: `Invite for ${a.email} cancelled` },
    super: { title: copy.handOverTitle, text: copy.handOverText, button: copy.handOver, run: () => handOver.mutateAsync({ userId: a.userId }), said: `${a.name} is now the super admin` },
    reset: { title: copy.resetTitle, text: copy.resetText, button: "Reset two-step sign-in", run: () => reset.mutateAsync({ userId: a.userId }), said: `${a.name}'s two-step sign-in reset` },
  }[kind];
  const go = async () => {
    try {
      await sheet.run();
      onDone(sheet.said);
      close();
    } catch (error) {
      setGeneral(errorsFrom(error).general);
    }
  };
  return (
    <Sheet open onClose={close} title={sheet.title} closeLabel="Close">
      <div className="rt-q__form rt-biz__sheetform">
        <p className="rt-adm-strong">{a.name}<small>{a.email}</small></p>
        <p className="rt-acc__note">{sheet.text}</p>
        {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
        <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={go} disabled={revoke.isPending || reset.isPending || handOver.isPending}>{sheet.button}</button>
      </div>
    </Sheet>
  );
}
