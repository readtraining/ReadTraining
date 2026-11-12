import { notFound } from "next/navigation";
import CourseDetail from "@/components/courseDetail/CourseDetail";
import PreviewBar from "@/components/courseDetail/PreviewBar";
import { courseDetailFor } from "@/lib/courseDetailServer";
import { coursePath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { queryApiAsUser } from "@/lib/serverApi";
import { loadTaxonomy } from "@/lib/taxonomyServer";

// A course's Preview for the admin (API admin.courses.preview): the real course page whatever its status. A shared page shows
// with the dates of the live provider courses on it (from its editor); a provider's course with its own dates and, when a change
// waits for approval, that change shown as if approved (from the course's admin page, to check it before deciding). Booking is
// off. Private, so kept out of search.
export async function generateMetadata(props) {
  const { id } = await props.params;
  return pageMetadata({ title: "Course preview | ReadTraining", description: "How this course page looks.", path: `/admin/catalogue/${id}/preview`, noindex: true });
}

const SHARED = {
  draft: "This is how the shared course page will look to visitors once it is published.",
  live: "This is how the shared course page looks to visitors.",
  paused: "This shared course page is paused, so visitors can't see it now. This is how it looks.",
};
const PROVIDER = {
  draft: "This provider's course is a draft. This is how its page will look once it is approved and live.",
  changes: "This provider's course is back with them for changes. This is how its page will look once it is approved and live.",
  pending: "This is how the course page will look once it is approved.",
  live: "This is the live course page.",
  paused: "This course is paused, so learners can't see it now. This is how its page looks.",
};

export default async function Page(props) {
  const { id } = await props.params;
  const courseId = Number(id);
  if (!Number.isInteger(courseId) || courseId < 1) notFound();
  await loadTaxonomy();
  const [{ data: page }, { data: course }] = await Promise.all([
    queryApiAsUser("admin.courses.preview", { courseId }),
    queryApiAsUser("admin.courses.get", { courseId }),
  ]);
  if (!page || !course) notFound();
  const detail = await courseDetailFor(page);
  const shared = course.kind === "shared";
  const status = shared ? SHARED[course.status] || SHARED.draft : course.pendingChanges ? "This is how the course page will look if the waiting change is approved." : PROVIDER[course.status] || PROVIDER.draft;
  return (
    <>
      <PreviewBar back={shared ? `/admin/catalogue/${courseId}/edit` : `/admin/catalogue/${courseId}`} status={status} />
      <CourseDetail course={{ ...detail.course, preview: true }} query={{}} path={coursePath(detail.course.slug)} reviews={detail.reviews} reviewsCourse={detail.reviewsCourse} />
    </>
  );
}
