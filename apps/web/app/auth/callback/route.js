import { NextResponse } from "next/server";
import { getServerSupabase, safeNext } from "@/lib/supabase/server";

// Where Supabase's email links land (confirm the account, reset the password): swaps the one-time code for a session, then opens
// ?next= (the account, or /reset-password). A missing, expired or used link goes to log in with a message.
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const failed = url.searchParams.get("error_description") || url.searchParams.get("error");

  if (code && !failed) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
