import Link from "next/link";
import { catalogueCourses, filterGroups, subSubjects } from "@/data/courseCatalogue";

// Breadcrumb for a course details page: Subject / Sub-subject / Course title (current, not a link).
// Subject and sub-subject link back to the catalogue with that filter applied.
// Home and Courses are left out for now; add <Link href="/">Home</Link> / <Link href={catalogue}>Courses</Link> back in front when needed.
export default function CourseDetailsCrumbs({ id }) {
  const course = catalogueCourses.find((c) => String(c.id) === String(id));
  if (!course) return null;

  const subject = filterGroups[0].options.find((o) => o.value === course.subject);
  const sub = (subSubjects[course.subject] || []).find((x) => x.value === course.sub);
  const catalogue = "/template/courses-list-1";

  return (
    <section className="breadcrumbs">
      <div className="container">
        <nav className="rt-dcrumbs" aria-label="Breadcrumb">
          {subject && <Link href={`${catalogue}?subject=${subject.value}`}>{subject.label}</Link>}
          {subject && sub && (
            <>
              <span className="rt-dcrumbs__sep" aria-hidden="true">/</span>
              <Link href={`${catalogue}?subject=${subject.value}&sub=${sub.value}`}>{sub.label}</Link>
            </>
          )}
          {subject && <span className="rt-dcrumbs__sep" aria-hidden="true">/</span>}
          <span className="rt-dcrumbs__current" aria-current="page">{course.title}</span>
        </nav>
      </div>
    </section>
  );
}
