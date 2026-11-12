import "server-only";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";

// Server side: one read from the site's API (a tRPC query), saved by Next's fetch cache under `tags` for `revalidate` seconds,
// for the public pages' loaders (lib/catalogueServer.js, lib/publicProvider.js, lib/siteReviewsServer.js, lib/taxonomyServer.js).
// It returns the API's answer; "no such thing" is an ordinary answer (null, or an empty list), never an error.
// When the API can't answer (down, an error, a rate limit, or nothing within TIMEOUT_MS) it THROWS, so a page is never saved
// without its courses because the API was away for a moment: the fetch cache keeps serving its last good answer while it asks
// again; a page Next has saved keeps its last good copy (a rebuild that fails is thrown away); a page rendered fresh shows its
// error page, which isn't saved.
// While the site is being built (on Vercel the pages are built before the API is running) a page that needs the API isn't built
// without it: connection() makes it render when it is asked for instead, with its data from the fetch cache. `whenBuilding` is a
// stand-in answer for the site-wide lists the root layout reads (otherwise every page of the site would be rendered on request);
// the browser fetches those itself (lib/navContext.js, lib/taxonomyContext.js) and the root layout rebuilds every page within 5
// minutes.
const API = process.env.NEXT_PUBLIC_API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:4000");
const TIMEOUT_MS = 8000;
const BUILDING = process.env.NEXT_PHASE === "phase-production-build";
let offlineAtBuild = false; // the build found no API: it doesn't wait for it again

export async function apiQuery(procedure, input, { revalidate = 60, tags = ["courses"], ...opts } = {}) {
  const url = `${API}/api/trpc/${procedure}${input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`}`;
  if (!(BUILDING && offlineAtBuild)) {
    try {
      const res = await fetch(url, { next: { revalidate, tags }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`the API answered ${res.status}`);
      const body = await res.json();
      if (!body?.result?.data || !("json" in body.result.data)) throw new Error("the API's answer has no data");
      return body.result.data.json;
    } catch (e) {
      if (!BUILDING) throw new Error(`${procedure}: ${e.name === "TimeoutError" ? `no answer from the API within ${TIMEOUT_MS / 1000}s` : e.message}`, { cause: e });
      offlineAtBuild = true;
    }
  }
  if ("whenBuilding" in opts) return opts.whenBuilding;
  await connection(); // during the build this stops the page being built: it renders on request
  throw new Error(`${procedure}: the API can't be reached while building`);
}

// A site-wide list every page reads (the menus, the catalogue list, the reviews): when the API can't answer, the last answer this
// server had, rather than taking every page down with it; with none yet, the error. Never an empty list in place of a real one.
export function withLastGood(load) {
  let last;
  return async (...args) => {
    try {
      last = await load(...args);
      return last;
    } catch (e) {
      unstable_rethrow(e);
      if (last !== undefined) return last;
      throw e;
    }
  };
}
