import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AUTH_ROUTES } from "@/lib/routes";
import { safeNext } from "@/lib/safeNext";

// Runs before the account areas, the admin panel and the log in / sign up pages (Next.js 16 calls this file "proxy", formerly
// "middleware"). It refreshes the Supabase session cookies and checks the sign-in with getClaims(), which verifies the token's
// signature against the project's public keys (no network call), so a forged or expired cookie counts as signed out.
// - Signed-out visitors of /account, /business and /provider go to log in, and back afterwards via ?next=.
// - Signed-in visitors of /login and /signup go to their account (or a safe ?next=), unless the page carries a message.
// - The provider and business workspaces are checked on every request, page loads and in-app navigation alike: the API's
//   organisations.openWorkspace applies the shared permission table and logs refusals. Someone without that identity sees the
//   "no access" page at the same address; if the check can't be made, access is refused too (never let through by default).
//   The workspace that was opened travels to the layout in the x-rt-workspace request header (set only here).
// - The admin panel has its own sign-in at /admin/login. Every other /admin request is checked with the API's admin.open
//   (an active admin who has finished two-step sign-in where required); anyone else, signed in or not, goes to the admin login,
//   which never says why. The admin travels to the panel layout in the x-rt-admin header (set only here). An admin who opens
//   /admin/login while already signed in goes straight to the panel.
// /skill-saver only needs the fresh session: the page reads it on the server to show the right buttons and level.
const PROTECTED = ["/account", "/business", "/provider"];
const GUEST_ONLY = ["/login", "/signup"];
// the workspaces, and the pages under them a student may open to get one
const WORKSPACES = [
  { prefix: "/provider", type: "provider", open: ["/provider/onboarding"] },
  { prefix: "/business", type: "business", open: ["/business/create"] },
];
const WORKSPACE_HEADER = "x-rt-workspace";
const ADMIN_HEADER = "x-rt-admin";

const under = (path, p) => path === p || path.startsWith(`${p}/`);
const isProtected = (path) => PROTECTED.some((p) => under(path, p));
const redirectTo = (request, pathname, search = "") => {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.redirect(url);
};
const toLogin = (request, login = AUTH_ROUTES.login) =>
  redirectTo(request, login, `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`);
// a response that keeps the refreshed session cookies
const withCookies = (res, from) => {
  from.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
};

// Asks the API (as this person) one access question. Returns { status, data }; 503 when the API can't be reached.
async function askApi(request, procedure, input, accessToken) {
  const api = process.env.NEXT_PUBLIC_API_URL || request.nextUrl.origin;
  try {
    const res = await fetch(`${api}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, data: body?.result?.data?.json ?? null };
  } catch {
    return { status: 503, data: null };
  }
}

export async function proxy(request) {
  // nobody may send the workspace or admin header in from outside
  const headers = new Headers(request.headers);
  headers.delete(WORKSPACE_HEADER);
  headers.delete(ADMIN_HEADER);
  let response = NextResponse.next({ request: { headers } });
  const path = request.nextUrl.pathname;
  const isAdmin = under(path, AUTH_ROUTES.admin);
  const isAdminLogin = path === AUTH_ROUTES.adminLogin;
  // without the Supabase settings nobody can be signed in: account areas and the panel go to log in, everything else opens
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    if (isAdmin && !isAdminLogin && path !== AUTH_ROUTES.adminWelcome) return toLogin(request, AUTH_ROUTES.adminLogin);
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
  // link prefetches only warm the cache; the real navigation that follows is checked here (and the layouts check again)
  const prefetch = request.headers.get("next-router-prefetch") === "1";
  const accessToken = async () => (await supabase.auth.getSession()).data.session?.access_token;

  if (isAdmin) {
    // the invite page: the person signed in from their invite link but isn't an admin yet (the page checks the invite itself)
    if (path === AUTH_ROUTES.adminWelcome) return response;
    if (isAdminLogin) {
      if (!signedIn || prefetch) return response;
      const token = await accessToken();
      const { status } = token ? await askApi(request, "admin.open", { path }, token) : { status: 401 };
      if (status !== 200) return response;
      const next = safeNext(request.nextUrl.searchParams.get("next"), AUTH_ROUTES.admin);
      return withCookies(NextResponse.redirect(new URL(under(next.split("?")[0], AUTH_ROUTES.admin) ? next : AUTH_ROUTES.admin, request.url)), response);
    }
    if (!signedIn) return toLogin(request, AUTH_ROUTES.adminLogin);
    if (prefetch) return response;
    const token = await accessToken();
    let { status, data: admin } = token ? await askApi(request, "admin.open", { path }, token) : { status: 401, data: null };
    // the API didn't answer in time (not a refusal): ask once more, then show "we couldn't check your access" on this address
    // instead of signing the admin out
    if (status >= 500) ({ status, data: admin } = await askApi(request, "admin.open", { path }, token));
    if (status >= 500) return withCookies(NextResponse.rewrite(new URL("/no-access/admin?unavailable=1", request.url)), response);
    if (status !== 200 || !admin) return withCookies(redirectTo(request, AUTH_ROUTES.adminLogin, `?next=${encodeURIComponent(path + request.nextUrl.search)}`), response);
    headers.set(ADMIN_HEADER, encodeURIComponent(JSON.stringify(admin)));
    return withCookies(NextResponse.next({ request: { headers } }), response);
  }

  if (!signedIn && isProtected(path)) return toLogin(request);
  // a signed-in person normally skips log in and sign up, but not when the page carries a message for them: an email link
  // that expired or was already used (from /auth/confirm) must be explained, not silently turned into the account page
  const hasMessage = request.nextUrl.searchParams.has("error");
  if (signedIn && GUEST_ONLY.includes(path) && !hasMessage) {
    return redirectTo(request, safeNext(request.nextUrl.searchParams.get("next"), AUTH_ROUTES.afterLogin).split("?")[0]);
  }

  const space = WORKSPACES.find((w) => under(path, w.prefix) && !w.open.some((o) => under(path, o)));
  if (signedIn && space && !prefetch) {
    const token = await accessToken();
    let { status, data: workspace } = token ? await askApi(request, "organisations.openWorkspace", { type: space.type, path }, token) : { status: 401, data: null };
    // the API didn't answer in time (not a refusal): ask once more before saying access couldn't be checked
    if (status >= 500) ({ status, data: workspace } = await askApi(request, "organisations.openWorkspace", { type: space.type, path }, token));
    if (status === 401) return toLogin(request);
    if (status !== 200 || !workspace) {
      const url = request.nextUrl.clone();
      url.pathname = `/no-access/${space.type}`;
      url.search = status === 403 ? "" : "?unavailable=1";
      return withCookies(NextResponse.rewrite(url), response);
    }
    headers.set(WORKSPACE_HEADER, encodeURIComponent(JSON.stringify(workspace)));
    return withCookies(NextResponse.next({ request: { headers } }), response);
  }
  return response;
}

export const config = {
  matcher: ["/account/:path*", "/business/:path*", "/provider/:path*", "/admin/:path*", "/login", "/signup", "/skill-saver"],
};
