import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeNext } from "@/lib/safeNext";

// Runs before the account areas and the log in / sign up pages (Next.js 16 calls this file "proxy", formerly "middleware").
// It refreshes the Supabase session cookies and checks the sign-in with getClaims(), which verifies the token's signature
// against the project's public keys (no network call), so a forged or expired cookie counts as signed out.
// - Signed-out visitors of /account, /business, /provider and /admin go to log in, and back afterwards via ?next=.
// - Signed-in visitors of /login and /signup go to their account (or a safe ?next=).
// Being signed in is all this checks. What a person may open (provider team role, admin switches) is checked on the server
// by the pages and the API; the pages also check the sign-in again.
// /skill-saver only needs the fresh session: the page reads it on the server to show the right buttons and level.
const PROTECTED = ["/account", "/business", "/provider", "/admin"];
const GUEST_ONLY = ["/login", "/signup"];

const isProtected = (path) => PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
function toLogin(request) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export async function proxy(request) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  // without the Supabase settings nobody can be signed in: account areas go to log in, everything else opens as normal
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return isProtected(path) ? toLogin(request) : response;
  }
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && isProtected(path)) return toLogin(request);
  // a signed-in person normally skips log in and sign up, but not when the page carries a message for them: an email link
  // that expired or was already used (from /auth/confirm) must be explained, not silently turned into the account page
  const hasMessage = request.nextUrl.searchParams.has("error");
  if (signedIn && GUEST_ONLY.includes(path) && !hasMessage) {
    const url = request.nextUrl.clone();
    url.pathname = safeNext(request.nextUrl.searchParams.get("next"), "/account").split("?")[0];
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/account/:path*", "/business/:path*", "/provider/:path*", "/admin/:path*", "/login", "/signup", "/skill-saver"],
};
