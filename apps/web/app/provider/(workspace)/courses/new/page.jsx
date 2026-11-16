import { redirect } from "next/navigation";

// The old New course page: New course is now a pop-up (components/providerWorkspace/NewCourse.jsx). A saved link or bookmark
// opens the courses with the pop-up open.
export default function Page() {
  redirect("/provider/courses?newcourse=1");
}
