import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CourseManagement } from "@/features/admin/components/CourseManagement";
import { getAllCoursesAdminAction, getAllUsersAction } from "@/app/admin-actions";

export default async function AdminCoursesPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const [{ courses, total }, { users: allUsers }] = await Promise.all([
        getAllCoursesAdminAction({ limit: 100 }),
        getAllUsersAction({ role: "teacher", limit: 500 })
    ]);

    return (
        <div className="p-8">
            <CourseManagement
                initialCourses={courses}
                teachers={allUsers}
                totalCount={total}
            />
        </div>
    );
}
