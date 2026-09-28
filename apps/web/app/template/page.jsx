import Link from "next/link";

export const metadata = {
  title: "Template pages | ReadTraining",
};

const groups = [
  {
    title: "Home pages",
    links: Array.from({ length: 10 }, (_, i) => `home-${i + 1}`),
  },
  {
    title: "Course lists",
    links: Array.from({ length: 8 }, (_, i) => `courses-list-${i + 1}`),
  },
  {
    title: "Course detail",
    links: [
      "courses/1",
      "courses-single-2/1",
      "courses-single-3/1",
      "courses-single-4/1",
      "courses-single-5/1",
      "courses-single-6/1",
      "lesson-single-1",
      "lesson-single-2",
      "course-cart",
      "course-checkout",
    ],
  },
  {
    title: "Dashboard",
    links: [
      "dashboard",
      "dshb-dashboard",
      "dshb-courses",
      "dshb-bookmarks",
      "dshb-listing",
      "dshb-reviews",
      "dshb-settings",
      "dshb-messages",
      "dshb-calendar",
      "dshb-quiz",
      "dshb-grades",
      "dshb-forums",
      "dshb-participants",
      "dshb-assignment",
      "dshb-survey",
      "dshb-dictionary",
      "dshb-administration",
    ],
  },
  {
    title: "Instructors",
    links: [
      "instructors-list-1",
      "instructors-list-2",
      "instructors/1",
      "instructors-single",
      "instructor-become",
    ],
  },
  {
    title: "Events",
    links: ["event-list-1", "event-list-2", "events/1", "event-cart", "event-checkout"],
  },
  {
    title: "Blog",
    links: ["blog-list-1", "blog-list-2", "blog-list-3", "blogs/1"],
  },
  {
    title: "Shop",
    links: ["shop-list", "shop/1", "shop-cart", "shop-checkout", "shop-order"],
  },
  {
    title: "Other",
    links: [
      "about-1",
      "about-2",
      "contact-1",
      "contact-2",
      "pricing",
      "help-center",
      "login",
      "signup",
      "terms",
      "ui-elements",
      "not-found",
    ],
  },
];

export default function TemplateIndex() {
  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "48px 24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 4 }}>Template pages</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        All Educrat pages, for reference while we design our own.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 28,
        }}
      >
        {groups.map((g) => (
          <section key={g.title}>
            <h2 style={{ fontSize: 16, marginBottom: 10 }}>{g.title}</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
              {g.links.map((l) => (
                <li key={l}>
                  <Link href={`/template/${l}`} style={{ color: "#6440fb" }}>
                    /template/{l}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
