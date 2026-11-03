"use client";

import { createContext, useContext, useRef } from "react";
import { api } from "@/lib/trpc/react";
import { useAdminAccess } from "@/lib/adminContext";
import { useProviderAccess } from "@/lib/providerAccess";
import { refreshCourses } from "@/app/admin/actions";

// The course editor (components/providerWorkspace/ProviderCourseEditor) is used twice: by a provider for their own course
// (API provider.courses.*, with the provider's organisation) and by ReadTraining's team for a shared course page (API
// admin.courses.*, no provider; changes go live at once, published instead of sent for approval). This gives the editor and
// its parts one set of calls for either. Both sets of hooks are always created (the unused one never fetches), so the hooks
// run in the same order whichever editor this is.
export const CourseEndpoints = createContext(null);
/** Whether an API error is the refusal of a change made over a newer version of the course (another tab, or someone else). */
export const isStale = (error) => error?.data?.code === "CONFLICT" && /changed somewhere else/i.test(error?.message || "");
export const useEndpoints = () => useContext(CourseEndpoints);

export function useCourseEndpoints(scope, courseId) {
  const admin = scope === "admin";
  const { organisationId, can, status } = useProviderAccess();
  const adminAccess = useAdminAccess();
  const utils = api.useUtils();
  const ready = Boolean(courseId);

  const pGet = api.provider.courses.get.useQuery({ organisationId, courseId }, { enabled: !admin && ready && Boolean(organisationId), retry: false });
  const aGet = api.admin.courses.get.useQuery({ courseId }, { enabled: admin && ready, retry: false });
  const p = {
    update: api.provider.courses.update.useMutation(),
    submit: api.provider.courses.submit.useMutation(),
    discard: api.provider.courses.discardChange.useMutation(),
    upload: api.provider.courses.imageUploadUrl.useMutation(),
    add: api.provider.courses.addImage.useMutation(),
    images: api.provider.courses.setImages.useMutation(),
  };
  const a = {
    update: api.admin.courses.updateShared.useMutation(),
    status: api.admin.courses.setSharedStatus.useMutation(),
    upload: api.admin.courses.sharedImageUploadUrl.useMutation(),
    add: api.admin.courses.sharedAddImage.useMutation(),
    images: api.admin.courses.sharedSetImages.useMutation(),
  };
  const base = admin ? { courseId } : { organisationId, courseId };
  // The version of the course the editor's draft was loaded from. Every change sends it (`seen`: saves, images, send for approval,
  // publish, withdraw, pause), so one over a newer version (another tab, or someone else) is refused instead of overwriting it;
  // each change checked that way returns the new version, kept here.
  const version = useRef(null);
  const keep = (r) => {
    if (r?.version) version.current = r.version;
    return r;
  };
  const seen = () => version.current || undefined;
  // the editor's "changed somewhere else" banner: any part of the editor whose change is refused for that reason shows it
  const staleHandler = useRef(null);
  const writer = admin ? adminAccess?.permissions?.includes("catalogue") : null;

  return {
    admin,
    query: admin ? aGet : pGet,
    // what the person may change: the page wording, everything else, prices
    access: admin ? { page: writer, full: writer, pricing: false } : { full: can("provider.courses.edit"), page: can("provider.courses.editPage"), pricing: can("provider.pricing.edit") },
    // a provider still waiting for our approval builds its courses but can't send them for approval yet
    waiting: !admin && status !== "active",
    update: (patch) => (admin ? a.update : p.update).mutateAsync({ ...base, ...patch, seen: seen() }).then(keep),
    updating: p.update.isPending || a.update.isPending,
    submit: () => p.submit.mutateAsync({ ...base, seen: seen() }).then(keep),
    submitting: p.submit.isPending || a.status.isPending,
    setStatus: (status) => a.status.mutateAsync({ courseId, status, seen: seen() }).then(keep),
    discard: () => p.discard.mutateAsync({ ...base, seen: seen() }).then(keep),
    discarding: p.discard.isPending,
    uploadUrl: (contentType) => (admin ? a.upload : p.upload).mutateAsync({ ...base, contentType }),
    addImage: (path) => (admin ? a.add : p.add).mutateAsync({ ...base, path, seen: seen() }).then(keep),
    setImages: (images) => (admin ? a.images : p.images).mutateAsync({ ...base, images, seen: seen() }).then(keep),
    // the version the draft is based on: set when the draft is (re)loaded; `seen()` for a call made outside these (the gear)
    setVersion: (v) => (version.current = v || null),
    seen,
    keep,
    onStale: (fn) => (staleHandler.current = fn),
    // true (and the banner shown) when `error` is the refusal of a change over a newer version
    stale: (error) => {
      if (!isStale(error)) return false;
      staleHandler.current?.();
      return true;
    },
    fetch: () => (admin ? utils.admin.courses.get.fetch({ courseId }) : utils.provider.courses.get.fetch({ organisationId, courseId })),
    refresh: () => {
      if (admin) {
        utils.admin.courses.get.invalidate({ courseId });
        utils.admin.courses.list.invalidate();
        refreshCourses().catch(() => {}); // the public pages show a shared page's changes at once
      } else {
        utils.provider.courses.get.invalidate({ organisationId, courseId });
        utils.provider.courses.list.invalidate({ organisationId });
      }
    },
  };
}
