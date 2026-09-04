import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { activityService } from "@/features/teacher/services/activityService";
import { courseService } from "@/features/teacher/services/courseService";
import { ActivityDetail } from "@/features/teacher/components/ActivityDetail";
import prisma from "@/lib/prisma";

export default async function Page({ params }: { params: Promise<{ courseId: string; activityId: string }> }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "teacher") {
        redirect("/signin");
    }

    const { courseId, activityId } = await params;

    const activity = await activityService.getActivityWithSubmissions(activityId);
    if (!activity) {
        return <div>Actividad no encontrada</div>;
    }

    const isActivityScope = (activity as any).groupScope === "ACTIVITY";

    const [students, studentGroups] = await Promise.all([
        courseService.getCourseStudents(courseId),
        prisma.studentGroup.findMany({
            where: isActivityScope ? { activityId } : { courseId, activityId: null },
            include: {
                leader: {
                    select: { id: true, name: true, image: true, profile: true }
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, image: true, profile: true }
                        }
                    }
                }
            }
        })
    ]);

    return (
        <div className="flex-1 p-4 sm:p-6 sm:pt-4">
            <ActivityDetail activity={activity} students={students} studentGroups={studentGroups} />
        </div>
    );
}
