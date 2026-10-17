# Setting up a Supabase project for ReadTraining

The tables, security rules, triggers and storage bucket all come from the migrations in `packages/db/migrations`. The settings
below live in the Supabase dashboard and are not in the migrations, so every project (development, test copy, live) is set
up by hand from this list, identically. Tick every line for each project.

## 1. Create the project

- Region **London (eu-west-2)**, a strong database password kept in a password manager.
- Copy the project's values into the root `.env` (never commit it):
  - development / test copy: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
    `DATABASE_URL` (transaction pooler, port 6543), `DIRECT_URL` (session/direct, port 5432);
  - live: the same values under `LIVE_SUPABASE_URL`, `LIVE_PUBLISHABLE_KEY`, `LIVE_SERVICE_ROLE_KEY`, `LIVE_DATABASE_URL`,
    `LIVE_DIRECT_URL`.

## 2. Build the database

- Development / test copy: `pnpm db:migrate`. Live: `pnpm live db:migrate`.
- Then **Advisors → Security** and **Performance**: no errors or warnings for our tables.
- First admin: `pnpm admin:grant <email>` (live: `pnpm live admin:grant <email>`). The person signs up on that site first.

## 3. Authentication settings

Three commands set almost all of this section through the Supabase Management API (they need `SUPABASE_ACCESS_TOKEN` in `.env`,
a token with Auth config and Project Settings write access for that project), and read every value back:

- `pnpm supabase:auth [--live]`: confirm email, minimum password 8, secure email and password change, current password
  required, TOTP, SMTP as ReadTraining, email rate limit.
- `pnpm supabase:templates [--live]`: the four email templates, their subjects and the sender name.
- `pnpm supabase:google [--live] [--site https://…]`: Google sign-in and the allowed return addresses.

The list below is what they set, for checking in the dashboard or setting by hand. JWT signing keys and the Site URL are
still set in the dashboard.

**Sign In / Providers**
- [ ] Email: on. **Confirm email**: on.
- [ ] **Secure email change**: on (both the old and the new address must confirm).
- [ ] **Secure password change**: on, and **Require current password when updating**: on.
- [ ] Minimum password length **8**.
- [ ] Google: on, with the project's Google Client ID and secret (Google Cloud → Credentials). Facebook: off until Meta has
      verified the business.

**Multi-factor**
- [ ] TOTP (app authenticator): enrolment and verification **enabled** (admins need it).

**URL Configuration**
- [ ] Site URL: the site's address (`http://localhost:3000` in development).
- [ ] Redirect URLs: `<site>/auth/confirm**` and `<site>/auth/callback**`. For Vercel previews only our own team's
      addresses (`https://*-<team>.vercel.app/**`), never a bare `*.vercel.app`.

**JWT signing keys**
- [ ] Asymmetric keys (ES256) on; the API verifies tokens with `getClaims()`.

**Emails → SMTP Settings**
- [ ] Custom SMTP on: host `smtp-relay.brevo.com`, port `587`, the Brevo SMTP login and key, sender name **ReadTraining**,
      sender email = the address verified in Brevo (later the client's domain). The API's welcome email uses the same values
      (`SMTP_*` and `EMAIL_FROM` in `.env`).
- [ ] Rate limits (Authentication → Rate Limits): emails per hour raised to what launch needs (Supabase's default is low).

**Emails → Templates**: paste each file from `supabase/templates/` (switch the editor to Source) and set the subject.

| Template | File | Subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | Confirm your email address |
| Reset password | `reset-password.html` | Reset your ReadTraining password |
| Change email address | `change-email.html` | Confirm your new email address |
| Reauthentication | `reauthentication.html` | Your ReadTraining confirmation code |

The links in the templates go to `/auth/confirm` with a token hash (`{{ .RedirectTo }}&token_hash=…&type=…`), which works
even when the email is opened in another browser.

## 4. Check it works

- Sign up with an inbox you can open: the confirmation email arrives, the link opens the site signed in, then the welcome email
  arrives once.
- Forgot password: the reset email arrives and the new password works.
- Change email in Account settings: both addresses get a link; after both are clicked the new email shows.
- Google sign-in creates an account with the name and photo; signing in again finds the same account.
- `/admin/login` with the first admin, including setting up two-step sign-in.

## 5. Moving a project to the client later

Supabase → Project Settings → General → **Transfer project** to the client's organisation keeps the database, users and keys,
so nothing above needs doing again; the client then adds the Pro plan (daily backups) and the restore test is done once.
