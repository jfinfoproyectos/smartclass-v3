import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { courseService } from "@/features/teacher/services/courseService";
import { TeacherCourseHeader } from "@/features/teacher/components/TeacherCourseHeader";
import { getAvailableThemes } from "@/app/actions/themes";
import { getVisualSettingsAction } from "@/app/actions/settings";
import { CourseTabsWrapper } from "@/features/teacher/components/CourseTabsWrapper";

export default async function CourseLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ courseId: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "teacher") {
        redirect("/signin");
    }

    const { courseId } = await params;
    // We don't have access to searchParams in layout (directly as props in some versions, but in Next 15 they are available)
    // Actually, layouts don't get searchParams. Only Pages do.
    // However, the TeacherCourseHeader uses useSearchParams() internally.
    
    const course = await courseService.getCourseById(courseId);

    if (!course || course.teacher.id !== session.user.id) {
        redirect("/dashboard/teacher");
    }

    const [themes, visualSettings] = await Promise.all([
        getAvailableThemes(),
        getVisualSettingsAction()
    ]);

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <CourseTabsWrapper>
                <TeacherCourseHeader 
                    courseId={courseId} 
                    courseTitle={course.title} 
                    courseExternalUrl={course.externalUrl}
                    userName={session.user.name || "Instructor"}
                    themes={themes}
                    themeMode={visualSettings.themeMode}
                    allowThemeColorChange={visualSettings.allowThemeColorChange}
                />
                <div className="flex-1 overflow-y-auto relative flex flex-col">
                    {children}
                </div>
            </CourseTabsWrapper>
        </div>
    );
}
