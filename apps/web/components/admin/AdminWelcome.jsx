"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { AdminAuthPage } from "@/components/admin/AdminLogin";
import { AuthField, AuthNotice, PasswordToggle } from "@/components/auth/authParts";
import { LockIcon, UserIcon } from "@/components/others/authIcons";
import { PASSWORD_ERROR, weakPassword } from "@/lib/auth/useSignUpForm";
import { focusFirstError } from "@/lib/focusFirstError";
import { AUTH_ROUTES } from "@/lib/routes";
import { getSupabase } from "@/lib/supabase/client";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";

// Where an admin invite link lands (/admin/welcome). The link has signed the person in (app/auth/confirm); here they add their
// name and choose a password, which starts their admin access. The password is saved by the API, which ends that sign-in, so
// the page then signs in with it and carries on as a normal admin sign-in (straight in, or the two-step step when it's needed).
// A missing, used, expired or cancelled invite gets a plain explanation and no form.

const NAME = /^[\p{L}][\p{L}\p{M} '’.-]*$/u;
const checkName = (v, label) => (!v.trim() ? `Enter your ${label}.` : v.trim().length > 50 ? `Your ${label} must be 50 characters or fewer.` : !NAME.test(v.trim()) ? `Your ${label} can only use letters, spaces, hyphens and apostrophes.` : "");

export default function AdminWelcome() {
  const router = useRouter();
  const formRef = useRef(null);
  const utils = api.useUtils();
  const accept = api.admin.acceptInvite.useMutation();
  const check = api.admin.check.useMutation();
  const signedIn = api.admin.signedIn.useMutation();
  const [state, setState] = useState("loading"); // loading | form | expired | used | nolink
  const [invite, setInvite] = useState(null);
  const [values, setValues] = useState({ firstName: "", lastName: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    (async () => {
      if (new URLSearchParams(window.location.search).get("error") === "link") return setState("expired");
      try {
        const { data } = await getSupabase().auth.getSession();
        if (!data.session) return setState("nolink");
        const found = await utils.admin.invite.fetch();
        if (!found.pending) return setState("used");
        if (found.expired) return setState("expired");
        setInvite(found);
        setValues((v) => ({ ...v, firstName: found.firstName, lastName: found.lastName }));
        setState("form");
      } catch {
        setState("nolink");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((x) => ({ ...x, [name]: "" }));
    if (notice) setNotice("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const found = {};
    const first = checkName(values.firstName, "first name");
    const last = checkName(values.lastName, "last name");
    if (first) found.firstName = first;
    if (last) found.lastName = last;
    if (!values.password) found.password = "Choose a password.";
    else if (weakPassword(values.password)) found.password = PASSWORD_ERROR;
    if (!values.confirmPassword) found.confirmPassword = "Confirm your password.";
    else if (values.password && values.confirmPassword !== values.password) found.confirmPassword = "Passwords don't match.";
    setErrors(found);
    setNotice("");
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setBusy(true);
    let email;
    try {
      ({ email } = await accept.mutateAsync({ firstName: values.firstName.trim(), lastName: values.lastName.trim(), password: values.password }));
    } catch (error) {
      const { fields, general } = errorsFrom(error);
      setErrors(fields);
      setNotice(general);
      setBusy(false);
      if (Object.keys(fields).length) focusFirstError(formRef.current);
      return;
    }
    // saved: sign in with the new password (the old sign-in ended), then on into the panel
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      const { error } = await supabase.auth.signInWithPassword({ email, password: values.password });
      if (error) throw error;
      const { step } = await check.mutateAsync({ attempt: true });
      if (step === "ready") {
        await signedIn.mutateAsync({ enrolled: false }).catch(() => {});
        router.replace(AUTH_ROUTES.admin);
      } else router.replace(AUTH_ROUTES.adminLogin);
      router.refresh();
    } catch {
      // the password is saved; the normal sign-in page takes it from here
      router.replace(`${AUTH_ROUTES.adminLogin}?welcome=1`);
    }
  };

  if (state === "loading") {
    return (
      <AdminAuthPage title="Admin invite">
        <p className="rt-adm-auth__wait" role="status">Checking your invite…</p>
      </AdminAuthPage>
    );
  }

  if (state !== "form") {
    const copy = {
      expired: ["This invite link has expired", "Invite links work once and for 24 hours. Ask the person who invited you to send a new one from Admin › Team."],
      used: ["This invite isn't waiting any more", "It has already been used, or it was cancelled. If you've set your password, sign in to the admin with your email and password."],
      nolink: ["Open your invite link", "This page opens from the link in your invite email. If the link has expired, ask the person who invited you to send a new one."],
    }[state];
    return (
      <AdminAuthPage title={copy[0]} lead={copy[1]}>
        <Link href={AUTH_ROUTES.adminLogin} className="button -md -purple-1 text-white rt-btn-block">Go to admin sign-in</Link>
      </AdminAuthPage>
    );
  }

  return (
    <AdminAuthPage title="Set up your admin account" lead={`You've been invited to the ReadTraining admin as a${/^[aeiou]/i.test(invite.role) ? "n" : ""} ${invite.role} admin. Add your name and choose a password for ${invite.email}.`}>
      <form className="rt-auth__form" onSubmit={submit} noValidate ref={formRef}>
        {notice && <AuthNotice>{notice}</AuthNotice>}
        <AuthField id="rt-adm-first" label="First name" icon={<UserIcon />} error={errors.firstName} name="firstName" type="text" autoComplete="given-name" value={values.firstName} onChange={set} disabled={busy} maxLength={50} />
        <AuthField id="rt-adm-last" label="Last name" icon={<UserIcon />} error={errors.lastName} name="lastName" type="text" autoComplete="family-name" value={values.lastName} onChange={set} disabled={busy} maxLength={50} />
        <AuthField
          id="rt-adm-new"
          label="Password"
          hint="At least 8 characters, with a letter and a number."
          icon={<LockIcon />}
          error={errors.password}
          name="password"
          type={shown ? "text" : "password"}
          autoComplete="new-password"
          value={values.password}
          onChange={set}
          disabled={busy}
          trailing={<PasswordToggle shown={shown} onToggle={() => setShown((s) => !s)} disabled={busy} />}
        />
        <AuthField id="rt-adm-repeat" label="Confirm password" icon={<LockIcon />} error={errors.confirmPassword} name="confirmPassword" type={shown ? "text" : "password"} autoComplete="new-password" value={values.confirmPassword} onChange={set} disabled={busy} />
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy}>{busy ? "Setting up…" : "Set password and continue"}</button>
      </form>
    </AdminAuthPage>
  );
}
