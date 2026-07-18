import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TeacherDashboard } from "@/features/teacher/components/TeacherDashboard";
import { courseService } from "@/features/teacher/services/courseService";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as any;
  const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

  if (!session || (role !== "teacher" && role !== "admin")) {
    redirect("/signin");
  }

  const courses = await courseService.getTeacherCourses(session.user.id);
  const pendingEnrollments = await courseService.getPendingEnrollments(session.user.id);
  const stats = await courseService.getTeacherDashboardStats(session.user.id);

  const currentDate = new Date().toISOString();
  return (
    <TeacherDashboard 
      courses={courses} 
      pendingEnrollments={pendingEnrollments} 
      stats={stats}
      currentDate={currentDate} 
    />
  );
}
