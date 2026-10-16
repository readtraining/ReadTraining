import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";

// Where Supabase's links land, then on to ?next= (a path on this site only):
// - email links (confirm the account, reset the password, change the email): ?token_hash=…&type=… → verifyOtp. Works when the
//   link is opened in another browser or on another device, because nothing from the original browser is needed.
// - Google / Facebook and older email links: ?code=… → exchangeCodeForSession (PKCE).
// A missing, expired or used link goes to log in with a message.
const EMAIL_TYPES = ["signup", "email", "recovery", "email_change", "invite", "magiclink"];

export async function GET(request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const next = safeNext(params.get("next"), "/account", url.origin);
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");

  if (!params.get("error")) {
    const supabase = await getServerSupabase();
    if (tokenHash && EMAIL_TYPES.includes(type)) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return NextResponse.redirect(new URL(next, url.origin));
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
