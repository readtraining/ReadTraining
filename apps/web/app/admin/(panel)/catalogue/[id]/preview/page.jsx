import { notFound } from "next/navigation";
import CourseDetail from "@/components/courseDetail/CourseDetail";
import PreviewBar from "@/components/courseDetail/PreviewBar";
import { courseDetailFor } from "@/lib/courseDetailServer";
import { coursePath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { queryApiAsUser } from "@/lib/serverApi";
import { loadTaxonomy } from "@/lib/taxonomyServer";

// The shared course page editor's Preview: the real course page for this shared page whatever its status, with the dates of the
// live provider courses on it (API admin.courses.preview). Booking is off. Private, so kept out of search.
export async function generateMetadata(props) {
  const { id } = await props.params;
  return pageMetadata({ title: "Shared page preview | ReadTraining", description: "How this shared course page looks.", path: `/admin/catalogue/${id}/preview`, noindex: true });
}

const STATUS = {
  draft: "This is how the shared course page will look to visitors once it is published.",
  live: "This is how the shared course page looks to visitors.",
  paused: "This shared course page is paused, so visitors can't see it now. This is how it looks.",
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
  return (
    <>
      <PreviewBar back={`/admin/catalogue/${courseId}/edit`} status={STATUS[course.status] || STATUS.draft} />
      <CourseDetail course={{ ...detail.course, preview: true }} query={{}} path={coursePath(detail.course.slug)} reviews={detail.reviews} reviewsCourse={detail.reviewsCourse} />
    </>
  );
}
