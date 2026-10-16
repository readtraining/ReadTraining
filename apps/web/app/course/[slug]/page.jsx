import { notFound, permanentRedirect } from "next/navigation";
import CourseDetail from "@/components/courseDetail/CourseDetail";
import { getCourseBySlug } from "@/lib/courses";
import { coursePath } from "@/lib/routes";
import { SITE_URL } from "@/lib/seo";
import { loadTaxonomy } from "@/lib/taxonomyServer";

// The course details page (/course/<slug>). An old numeric link (/course/1) is sent on to the course's slug, keeping its query.
export async function generateMetadata(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const course = getCourseBySlug(slug);
  if (!course) return { title: "Course not found | ReadTraining" };
  const path = coursePath(course.slug);
  const title = `${course.title} | ReadTraining`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: course.summary,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "ReadTraining", title, description: course.summary, url: path, images: course.imageSrc ? [{ url: course.imageSrc, width: 440, height: 248, alt: course.title }] : undefined },
    twitter: { card: "summary_large_image", title, description: course.summary },
  };
}

export default async function page(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const query = (await props.searchParams) || {};
  const course = getCourseBySlug(slug);
  if (!course) notFound();
  if (slug !== course.slug) {
    const search = new URLSearchParams(Object.entries(query).flatMap(([k, v]) => [].concat(v).map((x) => [k, x]))).toString();
    permanentRedirect(`${coursePath(course.slug)}${search ? `?${search}` : ""}`);
  }
  return <CourseDetail course={course} query={query} path={coursePath(course.slug)} />;
}
