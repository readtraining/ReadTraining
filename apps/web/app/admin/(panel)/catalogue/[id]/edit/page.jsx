import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminCourseEdit } from "@/components/admin/AdminStaffPages";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: edit a course in the same editor providers use. A shared course page with the admin's own scope ("admin": no
// prices or dates, changes go live on Save, published from here); a provider's course by the admin's switches as ReadTraining
// staff (components/admin/StaffEdit.jsx). Private, so kept out of search.
export async function generateMetadata(props) {
  const { id } = await props.params;
  return pageMetadata({ title: `Edit course | ${A.title}`, description: A.catalogue.lead, path: `/admin/catalogue/${id}/edit`, noindex: true });
}

export default async function Page(props) {
  const { id } = await props.params;
  return (
    <AdminShell current="catalogue" title={A.catalogue.title} detail="Edit course" parent={{ label: "Course", href: `/admin/catalogue/${id}` }} real>
      <AdminCourseEdit courseId={id} />
    </AdminShell>
  );
}
