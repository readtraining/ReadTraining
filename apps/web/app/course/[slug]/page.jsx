import { notFound, permanentRedirect } from "next/navigation";
import CourseDetail from "@/components/courseDetail/CourseDetail";
import { getCourseBySlug } from "@/lib/courses";
import { toCourseDetail } from "@/lib/catalogueData";
import { loadCoursePage, loadListings } from "@/lib/catalogueServer";
import { coursePath } from "@/lib/routes";
import { SITE_URL } from "@/lib/seo";
import { loadTaxonomy } from "@/lib/taxonomyServer";

// The course details page (/course/<slug>): a real course (API catalogue.course, with up to three more courses from its
// category), or, until the sample catalogue is removed, one of the sample courses (data/courseCatalogue.js; an old numeric link
// such as /course/1 is sent on to its slug, keeping the query).
async function findCourse(slug) {
  const page = await loadCoursePage(slug);
  if (page) {
    const related = (await loadListings()).filter((l) => l.slug !== page.slug && l.slug !== page.parent?.slug && l.category && l.category === page.category).slice(0, 3);
    return toCourseDetail(page, related);
  }
  return getCourseBySlug(slug); // DEMO
}

export async function generateMetadata(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const course = await findCourse(slug);
  if (!course) return { title: "Course not found | ReadTraining" };
  const path = coursePath(course.slug);
  const title = `${course.seoTitle || course.title} | ReadTraining`;
  const description = course.seoDescription || course.summary;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "ReadTraining", title, description, url: path, images: course.imageSrc ? [{ url: course.imageSrc, width: 440, height: 248, alt: course.title }] : undefined },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function page(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const query = (await props.searchParams) || {};
  const course = await findCourse(slug);
  if (!course) notFound();
  if (slug !== course.slug) {
    const search = new URLSearchParams(Object.entries(query).flatMap(([k, v]) => [].concat(v).map((x) => [k, x]))).toString();
    permanentRedirect(`${coursePath(course.slug)}${search ? `?${search}` : ""}`);
  }
  return <CourseDetail course={course} query={query} path={coursePath(course.slug)} />;
}
