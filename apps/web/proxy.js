import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Runs before the account pages and the log in / sign up pages (Next.js 16 calls this file "proxy", formerly "middleware"). It
// refreshes the Supabase session cookies, sends signed-out visitors of /account and /business to log in (and back afterwards
// via ?next=), and sends signed-in visitors of /login and /signup to their account. The pages still check on their own.
const PROTECTED = ["/account", "/business"];
const GUEST_ONLY = ["/login", "/signup"];

export async function proxy(request) {
  let response = NextResponse.next({ request });
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
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!data.user && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  if (data.user && GUEST_ONLY.includes(path)) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    url.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next.split("?")[0] : "/account";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/account/:path*", "/business/:path*", "/login", "/signup"],
};
