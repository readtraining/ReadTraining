import { notFound } from "next/navigation";
import CourseDetail from "@/components/courseDetail/CourseDetail";
import PreviewBar from "@/components/courseDetail/PreviewBar";
import { courseDetailFor } from "@/lib/courseDetailServer";
import { coursePath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { queryApiAsUser } from "@/lib/serverApi";
import { loadTaxonomy } from "@/lib/taxonomyServer";
import { getWorkspace } from "@/lib/workspace";

// The course editor's Preview: the real course page (components/courseDetail/CourseDetail, as /course/<slug> builds it) for this
// provider's course whatever its status, with its dates and prices, and a change waiting for approval shown as if approved
// (API provider.courses.preview). Booking is off. Private, so kept out of search.
export async function generateMetadata(props) {
  const { id } = await props.params;
  return pageMetadata({ title: "Course preview | ReadTraining", description: "How this course page will look once it is live.", path: `/provider/courses/${id}/preview`, noindex: true });
}

const STATUS = {
  draft: "This is how the course page will look once it is approved and live.",
  changes: "This is how the course page will look once it is approved and live.",
  pending: "This is how the course page will look once our team approves it.",
  live: "This is the live course page.",
  paused: "This course is paused, so learners can't see it now. This is how its page looks.",
};

export default async function Page(props) {
  const { id } = await props.params;
  const courseId = Number(id);
  if (!Number.isInteger(courseId) || courseId < 1) notFound();
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { workspace } = await getWorkspace("provider");
  const [{ data: page }, { data: course }] = await Promise.all([
    queryApiAsUser("provider.courses.preview", { organisationId: workspace?.id, courseId }),
    queryApiAsUser("provider.courses.get", { organisationId: workspace?.id, courseId }),
  ]);
  if (!page || !course) notFound();
  const detail = await courseDetailFor(page);
  const status = course.pendingChanges ? "This is how the course page will look once our team approves your changes." : STATUS[course.status] || STATUS.draft;
  return (
    <>
      <PreviewBar back={`/provider/courses/${courseId}`} status={status} missing={course.status === "draft" || course.status === "changes" ? course.missing || [] : []} />
      <CourseDetail course={{ ...detail.course, preview: true }} query={{}} path={coursePath(detail.course.slug)} reviews={detail.reviews} reviewsCourse={detail.reviewsCourse} />
    </>
  );
}
