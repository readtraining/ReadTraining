import "server-only";
import { cache } from "react";
import { apiQuery, withLastGood } from "@/lib/apiServer";

// Server side: the customer reviews the website shows (API content.reviews: the published ones, newest first), saved by
// Next for a minute under the tag "reviews". An admin's change marks it out of date (app/admin/actions.js refreshReviews), so
// pages pick it up within seconds. The root layout reads them for every page, so when the API can't answer they are the last
// ones this server had, else the error (lib/apiServer.js withLastGood); while the site is built, none (pages rebuild within 5
// minutes). cache(): one request asks once.
export const loadReviews = cache(withLastGood(async () => (await apiQuery("content.reviews", undefined, { tags: ["reviews"], whenBuilding: [] })) ?? []));
