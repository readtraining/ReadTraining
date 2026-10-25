"use client";

import React, { useCallback, useEffect, useState } from "react";
import { account } from "@/data/account";
import { toCatalogueCourse } from "@/lib/catalogueData";
import { api } from "@/lib/trpc/react";
import { savedCourseIds } from "@/lib/wishlist";
import CatalogueCourseCard from "@/components/courses/CatalogueCourseCard";
import Toast from "@/components/courses/Toast";
import { EmptyState } from "@/components/states/States";

const copy = account.saved;

// Saved courses: the courses saved with the heart, newest first, as the course list's cards. Everything on a card works as it does
// there: the heart removes it (it leaves this list), "Add to basket" opens the date pop-up, "More details" opens the course.
// The courses are the live listings (API catalogue.listings); a saved course that is no longer live is left out.
export default function AccountSaved() {
  const listings = api.catalogue.listings.useQuery();
  const [ids, setIds] = useState(null);
  const [toast, setToast] = useState(null);
  const reload = useCallback(() => setIds([...savedCourseIds()].reverse()), []);
  useEffect(reload, [reload]);
  const notify = useCallback((t) => {
    setToast(t);
    reload(); // a heart taken off leaves the list
  }, [reload]);
  if (!ids || !listings.data) return null;
  const byId = new Map(listings.data.map((l) => [l.id, l]));
  const courses = ids.map((id) => byId.get(id)).filter(Boolean).map(toCatalogueCourse);

  return (
    <div className="rt-acc__stack">
      {courses.length ? (
        <>
          <p className="rt-acc__count" aria-live="polite">{courses.length} saved {courses.length === 1 ? "course" : "courses"}</p>
          <div className="rt-acc__savedlist">
            {courses.map((c, i) => <CatalogueCourseCard key={c.id} course={c} index={i} onNotify={notify} />)}
          </div>
        </>
      ) : (
        <EmptyState large icon="icon-bookmark" headingLevel={2} title={copy.empty.title} text={copy.empty.text} action={{ href: copy.empty.cta.href, label: copy.empty.cta.label }} />
      )}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
