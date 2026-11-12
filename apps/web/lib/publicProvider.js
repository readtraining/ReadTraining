import "server-only";
import { cache } from "react";
import { apiQuery } from "@/lib/apiServer";

// The real providers for the public pages (server only), from the API: one provider's public profile with its live courses
// (organisations.providerProfile; null when there's no such provider, or it is suspended or not approved), and the directory of
// providers with a live course (organisations.providerDirectory). Saved by Next for a minute under the tag "courses", like the
// catalogue; when the API can't answer they throw (lib/apiServer.js), so a profile never turns into "not found" and the
// directory never empties because the API was away. cache(): a page and its metadata share one request.

export const getPublicProvider = cache(async (slug) => apiQuery("organisations.providerProfile", { slug: String(slug).slice(0, 80) }));

export const getProviderDirectory = cache(async () => (await apiQuery("organisations.providerDirectory")) || []);
