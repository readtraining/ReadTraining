import { coursePages } from "@/data/coursePages";
import { catalogueCourses } from "@/data/courseCatalogue";
import { getPostCards } from "@/lib/blog";
import { CATALOGUE_HREF } from "@/lib/routes";

// Reads for the course pages (/courses/[slug]), server side. Swap the course selection for an API query later.

export const COURSES_HREF = "/courses";
export const coursePageHref = (slug) => `${COURSES_HREF}/${slug}`;

const select = ({ method, subject, ids }) => {
  if (method) return catalogueCourses.filter((c) => c.methods.includes(method));
  if (subject) return catalogueCourses.filter((c) => c.subject === subject);
  return ids.map((id) => catalogueCourses.find((c) => c.id === id)).filter(Boolean);
};

export const getCoursePageSlugs = () => coursePages.map((p) => p.slug);

export function getCoursePage(slug) {
  const page = coursePages.find((p) => p.slug === slug);
  if (!page) return null;
  const courses = select(page.select);
  return {
    ...page,
    href: coursePageHref(page.slug),
    courses,
    // what CourseCatalogue reads to become this page
    scope: {
      title: page.title,
      lead: page.lead,
      crumb: page.label,
      allHref: CATALOGUE_HREF,
      links: coursePages.filter((p) => p.slug !== slug).map((p) => ({ label: p.label, href: coursePageHref(p.slug) })),
      subject: page.select.subject,
      hide: page.hide,
      filters: page.filters !== false,
      about: page.about,
    },
    guides: page.blog ? getPostCards().filter((p) => p.category.key === page.blog) : [],
  };
}
