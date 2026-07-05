import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { activityService } from "@/features/teacher/services/activityService";
import { courseService } from "@/features/teacher/services/courseService";
import { ActivityDetail } from "@/features/teacher/components/ActivityDetail";

export default async function Page({ params }: { params: Promise<{ courseId: string; activityId: string }> }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "teacher") {
        redirect("/signin");
    }

    const { courseId, activityId } = await params;

    const activity = await activityService.getActivityWithSubmissions(activityId);
    const students = await courseService.getCourseStudents(courseId);

    if (!activity) {
        return <div>Actividad no encontrada</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <ActivityDetail activity={activity} students={students} />
        </div>
    );
}
