"use server";

import { updateTag } from "next/cache";
import { getAdminAccess } from "@/lib/adminAccess";

// After an admin changes the catalogue's one list, the site's saved copy (lib/taxonomyServer.js, tag "taxonomy") is marked
// out of date, so the filters and menus pick the change up within seconds (Next refreshes it in the background on the next
// page views) instead of within 5 minutes. Only for admins who can
// change the catalogue; the change itself is checked and saved by the API.
export async function refreshCatalogueList() {
  const admin = await getAdminAccess();
  if (!admin?.permissions?.includes("catalogue")) return { ok: false };
  updateTag("taxonomy");
  return { ok: true };
}
