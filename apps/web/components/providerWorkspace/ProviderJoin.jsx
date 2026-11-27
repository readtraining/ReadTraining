"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { AuthField, AuthNotice, AuthPage, PasswordToggle } from "@/components/auth/authParts";
import { LockIcon, UserIcon } from "@/components/others/authIcons";
import { PASSWORD_ERROR, weakPassword } from "@/lib/auth/useSignUpForm";
import { focusFirstError } from "@/lib/focusFirstError";
import { getHumanCheck } from "@/lib/humanCheck";
import { getSupabase } from "@/lib/supabase/client";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { Req } from "./settingsForm";

// Where a provider's team invite link lands (/provider/join). The link has signed the person in (app/auth/confirm); someone the
// invite made an account for adds their name and chooses a password, then they join (API provider.invites). Saving a password
// ends that sign-in, so the page signs in again with it before opening the workspace. A missing, used, expired or cancelled
// invite gets a plain line and no form.

const NAME = /^[\p{L}][\p{L}\p{M} '’.-]*$/u;
const checkName = (v, label) => (!v.trim() ? `Enter your ${label}.` : v.trim().length > 50 ? `Your ${label} must be 50 characters or fewer.` : !NAME.test(v.trim()) ? `Your ${label} can only use letters, spaces, hyphens and apostrophes.` : "");
const STATES = {
  expired: ["This invite link has expired", "Ask the person who invited you to send a new one."],
  used: ["This invite isn't waiting any more", "It has been used or cancelled."],
  nolink: ["Open your invite link", "This page opens from the link in your invite email."],
};

export default function ProviderJoin() {
  const formRef = useRef(null);
  const utils = api.useUtils();
  const join = api.provider.invites.join.useMutation();
  const [state, setState] = useState("loading"); // loading | form | expired | used | nolink
  const [me, setMe] = useState(null);
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
        const found = await utils.provider.invites.mine.fetch();
        const open = found.invites.find((i) => !i.expired);
        if (!open) return setState(found.invites.length ? "expired" : "used");
        setMe(found);
        setInvite(open);
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
    if (me.needsPassword) {
      const first = checkName(values.firstName, "first name");
      const last = checkName(values.lastName, "last name");
      if (first) found.firstName = first;
      if (last) found.lastName = last;
      if (!values.password) found.password = "Choose a password.";
      else if (weakPassword(values.password)) found.password = PASSWORD_ERROR;
      if (!values.confirmPassword) found.confirmPassword = "Confirm your password.";
      else if (values.password && values.confirmPassword !== values.password) found.confirmPassword = "Passwords don't match.";
    }
    setErrors(found);
    setNotice("");
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setBusy(true);
    let res;
    try {
      res = await join.mutateAsync({ organisationId: invite.organisationId, ...(me.needsPassword ? { firstName: values.firstName.trim(), lastName: values.lastName.trim(), password: values.password } : {}) });
    } catch (error) {
      const { fields, general } = errorsFrom(error);
      setErrors(fields);
      setNotice(general);
      setBusy(false);
      if (Object.keys(fields).length) focusFirstError(formRef.current);
      return;
    }
    // the workspace opens on the provider just joined (proxy.js reads this cookie), not on another one they were already on
    document.cookie = `rt-provider=${invite.organisationId}; path=/; max-age=31536000; samesite=lax`;
    // a new password ended the invite's sign-in: sign in with it, then into the workspace (a full load, so it opens fresh)
    if (res.signInAgain) {
      try {
        const supabase = getSupabase();
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        const { error } = await supabase.auth.signInWithPassword({ email: res.email, password: values.password, options: { captchaToken: await getHumanCheck() } });
        if (error) throw error;
      } catch {
        // joined and the password is saved: the sign-in page takes it from here
        return window.location.assign(`/login?next=${encodeURIComponent("/provider")}`);
      }
    }
    window.location.assign("/provider");
  };

  if (state === "loading") {
    return (
      <AuthPage title="Your invite">
        <p className="rt-adm-auth__wait" role="status">Checking your invite…</p>
      </AuthPage>
    );
  }

  if (state !== "form") {
    const [title, lead] = STATES[state];
    return (
      <AuthPage title={title} lead={lead}>
        <Link href="/" className="button -md -purple-1 text-white rt-btn-block">Go to ReadTraining</Link>
      </AuthPage>
    );
  }

  const lead = `${invite.invitedBy || "Your team"} invited you to join ${invite.provider} as ${invite.role}.`;
  return (
    <AuthPage title={`Join ${invite.provider}`} lead={lead}>
      <form method="post" className="rt-auth__form" onSubmit={submit} noValidate ref={formRef}>
        {notice && <AuthNotice>{notice}</AuthNotice>}
        {me.needsPassword && (
          <>
            <AuthField id="rt-join-first" label={<>First name<Req /></>} icon={<UserIcon />} error={errors.firstName} name="firstName" type="text" autoComplete="given-name" value={values.firstName} onChange={set} disabled={busy} maxLength={50} />
            <AuthField id="rt-join-last" label={<>Last name<Req /></>} icon={<UserIcon />} error={errors.lastName} name="lastName" type="text" autoComplete="family-name" value={values.lastName} onChange={set} disabled={busy} maxLength={50} />
            <AuthField id="rt-join-new" label={<>Password<Req /></>} hint="At least 8 characters, with a letter and a number." icon={<LockIcon />} error={errors.password} name="password" type={shown ? "text" : "password"} autoComplete="new-password" value={values.password} onChange={set} disabled={busy} trailing={<PasswordToggle shown={shown} onToggle={() => setShown((s) => !s)} disabled={busy} />} />
            <AuthField id="rt-join-repeat" label={<>Confirm password<Req /></>} icon={<LockIcon />} error={errors.confirmPassword} name="confirmPassword" type={shown ? "text" : "password"} autoComplete="new-password" value={values.confirmPassword} onChange={set} disabled={busy} />
          </>
        )}
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy}>{busy ? "Joining…" : "Join"}</button>
      </form>
    </AuthPage>
  );
}
