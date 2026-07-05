import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { StudentDashboard } from "@/features/student/components/StudentDashboard";
import { courseService } from "@/features/teacher/services/courseService";
import { getAvailableThemes } from "@/app/actions/themes";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "student") {
    redirect("/signin");
  }

  const availableCourses = await courseService.getAllCourses();
  const myEnrollments = await courseService.getStudentEnrollments(session.user.id);
  const pendingEnrollments = await courseService.getStudentPendingEnrollments(session.user.id);

  const themes = await getAvailableThemes();

  return <StudentDashboard
    availableCourses={availableCourses}
    myEnrollments={myEnrollments}
    studentName={session.user.name}
    pendingEnrollments={pendingEnrollments}
    themes={themes}
  />;
}
