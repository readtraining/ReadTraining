import { notFound, permanentRedirect } from "next/navigation";
import CourseDetail from "@/components/courseDetail/CourseDetail";
import { loadCoursePage } from "@/lib/catalogueServer";
import { courseDetailFor } from "@/lib/courseDetailServer";
import { coursePath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { loadTaxonomy } from "@/lib/taxonomyServer";

// The course details page (/course/<slug>): a live course (API catalogue.course), with up to three more courses from its
// category and its free mock test when it has one (lib/testPrep.js). An old numeric link (/course/1012) is sent on to its
// address, keeping the query.
async function findCourse(slug) {
  const page = await loadCoursePage(slug);
  return page ? courseDetailFor(page) : null;
}

// What search engines are told: a private or unlisted course (opened from its address only) isn't indexed; a provider's own
// course on a shared page names that page as the one to index (canonical), as it is one of the dates the shared page lists and
// isn't in the search or the sitemap itself.
export async function generateMetadata(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const page = await loadCoursePage(slug);
  const course = page && (await courseDetailFor(page)).course;
  if (!course) return { title: "Course not found | ReadTraining" };
  const indexed = page.isPublic !== false && page.listed !== false; // (an answer saved before the API sent them: indexed)
  const path = coursePath(indexed && page.parent ? page.parent.slug : course.slug);
  const title = `${course.seoTitle || course.title} | ReadTraining`;
  const description = course.seoDescription || course.summary;
  const meta = pageMetadata({ title, description, path, noindex: !indexed });
  return {
    ...meta,
    openGraph: { ...meta.openGraph, images: course.imageSrc ? [{ url: course.imageSrc, width: 440, height: 248, alt: course.title }] : undefined },
    twitter: { ...meta.twitter, card: "summary_large_image" },
  };
}

export default async function page(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const query = (await props.searchParams) || {};
  const found = await findCourse(slug);
  if (!found) notFound();
  const { course, reviews, reviewsCourse } = found;
  if (slug !== course.slug) {
    const search = new URLSearchParams(Object.entries(query).flatMap(([k, v]) => [].concat(v).map((x) => [k, x]))).toString();
    permanentRedirect(`${coursePath(course.slug)}${search ? `?${search}` : ""}`);
  }
  // the published reviews that name this course's topic, with the topic's name (the Customer reviews filter uses the same)
  return <CourseDetail course={course} query={query} path={coursePath(course.slug)} reviews={reviews} reviewsCourse={reviewsCourse} />;
}
