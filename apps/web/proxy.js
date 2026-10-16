import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeNext } from "@/lib/safeNext";

// Runs before the account areas and the log in / sign up pages (Next.js 16 calls this file "proxy", formerly "middleware").
// It refreshes the Supabase session cookies and checks the sign-in with getClaims(), which verifies the token's signature
// against the project's public keys (no network call), so a forged or expired cookie counts as signed out.
// - Signed-out visitors of /account, /business, /provider and /admin go to log in, and back afterwards via ?next=.
// - Signed-in visitors of /login and /signup go to their account (or a safe ?next=), unless the page carries a message.
// - The provider and business workspaces are checked on every request, page loads and in-app navigation alike: the API's
//   organisations.openWorkspace applies the shared permission table and logs refusals. Someone without that identity sees the
//   "no access" page at the same address; if the check can't be made, access is refused too (never let through by default).
//   The workspace that was opened travels to the layout in the x-rt-workspace request header (set only here).
// What admins may open is checked on the server by the admin pages and the API.
// /skill-saver only needs the fresh session: the page reads it on the server to show the right buttons and level.
const PROTECTED = ["/account", "/business", "/provider", "/admin"];
const GUEST_ONLY = ["/login", "/signup"];
// the workspaces, and the pages under them a student may open to get one
const WORKSPACES = [
  { prefix: "/provider", type: "provider", open: ["/provider/onboarding"] },
  { prefix: "/business", type: "business", open: ["/business/create"] },
];
const WORKSPACE_HEADER = "x-rt-workspace";

const under = (path, p) => path === p || path.startsWith(`${p}/`);
const isProtected = (path) => PROTECTED.some((p) => under(path, p));
function toLogin(request) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

// Asks the API whether this person may open this workspace. Returns { status, workspace }.
async function checkWorkspace(request, type, accessToken) {
  const api = process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin;
  const input = encodeURIComponent(JSON.stringify({ json: { type, path: request.nextUrl.pathname } }));
  try {
    const res = await fetch(`${api}/api/trpc/organisations.openWorkspace?input=${input}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, workspace: body?.result?.data?.json ?? null };
  } catch {
    return { status: 503, workspace: null };
  }
}

export async function proxy(request) {
  // nobody may send the workspace header in from outside
  const headers = new Headers(request.headers);
  headers.delete(WORKSPACE_HEADER);
  let response = NextResponse.next({ request: { headers } });
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
        response = NextResponse.next({ request: { headers } });
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

  const space = WORKSPACES.find((w) => under(path, w.prefix) && !w.open.some((o) => under(path, o)));
  // link prefetches only warm the cache; the real navigation that follows is checked here
  if (signedIn && space && request.headers.get("next-router-prefetch") !== "1") {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const { status, workspace } = token ? await checkWorkspace(request, space.type, token) : { status: 401, workspace: null };
    if (status === 401) return toLogin(request);
    if (status !== 200 || !workspace) {
      const url = request.nextUrl.clone();
      url.pathname = `/no-access/${space.type}`;
      url.search = status === 403 ? "" : "?unavailable=1";
      const denied = NextResponse.rewrite(url);
      response.cookies.getAll().forEach((c) => denied.cookies.set(c));
      return denied;
    }
    headers.set(WORKSPACE_HEADER, encodeURIComponent(JSON.stringify(workspace)));
    const allowed = NextResponse.next({ request: { headers } });
    response.cookies.getAll().forEach((c) => allowed.cookies.set(c));
    return allowed;
  }
  return response;
}

export const config = {
  matcher: ["/account/:path*", "/business/:path*", "/provider/:path*", "/admin/:path*", "/login", "/signup", "/skill-saver"],
};
