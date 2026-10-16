import { notFound, redirect } from "next/navigation";
import CourseDetail from "@/components/courseDetail/CourseDetail";
import { locationFinderHref } from "@/data/home/menu";
import { getCourseLocation } from "@/lib/courseLocations";
import { SITE_URL } from "@/lib/seo";
import { loadTaxonomy } from "@/lib/taxonomyServer";

// A course in a town or city (/course-locations/door-supervisor-course-in-london), the Locations menu's links, as the client's
// site: the course page limited to that town's venues, with the venues listed under the learning options. A town where the
// course has no venue goes to the course finder for that town instead. Copy and dates: lib/courseLocations.js.

export async function generateMetadata(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const loc = getCourseLocation(slug);
  if (!loc) return { title: "Course not found | ReadTraining" };
  const path = `/course-locations/${slug}`;
  const title = `${loc.course.title} | ReadTraining`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: loc.course.summary,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "ReadTraining", title, description: loc.course.summary, url: path },
    twitter: { card: "summary", title, description: loc.course.summary },
  };
}

export default async function CourseLocationPage(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const query = (await props.searchParams) || {};
  const loc = getCourseLocation(slug);
  if (!loc) notFound();
  if (loc.venues.length === 0) redirect(locationFinderHref(loc.place, loc.city));
  return <CourseDetail course={loc.course} query={query} path={`/course-locations/${slug}`} local={{ city: loc.city, venues: loc.venues }} />;
}
