import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ActivityManager } from "@/features/teacher/components/ActivityManager";
import { StudentManager } from "@/features/teacher/components/StudentManager";
import { activityService } from "@/features/teacher/services/activityService";
import { courseService } from "@/features/teacher/services/courseService";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Roulette } from "@/features/teacher/components/Roulette";
import { BookOpenText } from "lucide-react";
import { GroupGenerator } from "@/features/teacher/components/GroupGenerator";
import { GroupContentShare } from "@/features/teacher/components/GroupContentShare";
import { sharedContentService } from "@/features/teacher/services/sharedContentService";
import { evaluationService } from "@/features/teacher/services/evaluationService";
import { EvaluationAssignmentManager } from "@/features/teacher/components/EvaluationAssignmentManager";
import { GradesManager } from "@/features/teacher/components/GradesManager";
import { gradeService } from "@/features/teacher/services/gradeService";

import { CourseStatistics } from "@/features/teacher/components/CourseStatistics";
import { getCourseAttendanceReportAction } from "@/features/teacher/actions/reportActions";
import { ProjectAnalytics } from "@/features/documentation/components/admin/ProjectAnalytics";
import { getTeacherDocProjectsAction } from "@/features/documentation/actions/adminDocsActions";

export default async function Page({ 
    params,
    searchParams 
}: { 
    params: Promise<{ courseId: string }>,
    searchParams: Promise<{ tab?: string }> 
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "teacher") {
        redirect("/signin");
    }

    const { courseId } = await params;
    const { tab } = await searchParams;
    const activeTab = tab || "activities";

    const course = await courseService.getCourseById(courseId);

    if (!course) {
        return <div className="p-8 text-center font-bold">Curso no encontrado</div>;
    }

    // Verify ownership
    if (course.teacher.id !== session.user.id) {
        return <div className="p-8 text-center font-bold text-destructive">No tienes permiso para ver este curso</div>;
    }

    const [
        activitiesResult, 
        studentsResult, 
        sharedContentsResult, 
        evaluationAssignmentsResult, 
        teacherEvaluationsResult, 
        gradesDataResult, 
        attendanceReportResult, 
        availableProjectsResult
    ] = await Promise.allSettled([
        activityService.getCourseActivities(courseId),
        courseService.getCourseStudents(courseId),
        sharedContentService.getByCourse(courseId),
        evaluationService.getCourseEvaluationAttempts(courseId),
        evaluationService.getTeacherEvaluations(session.user.id),
        gradeService.getCourseGradesData(courseId),
        getCourseAttendanceReportAction(courseId),
        getTeacherDocProjectsAction()
    ]);

    // Handle results with fallbacks
    const activities = activitiesResult.status === 'fulfilled' ? activitiesResult.value : [];
    const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
    const sharedContents = sharedContentsResult.status === 'fulfilled' ? sharedContentsResult.value : [];
    const evaluationAssignments = evaluationAssignmentsResult.status === 'fulfilled' ? evaluationAssignmentsResult.value : [];
    const teacherEvaluations = teacherEvaluationsResult.status === 'fulfilled' ? teacherEvaluationsResult.value : [];
    const gradesData = gradesDataResult.status === 'fulfilled' ? gradesDataResult.value : { students: [], activities: [], evaluations: [], categories: [] };
    const attendanceReport = attendanceReportResult.status === 'fulfilled' ? attendanceReportResult.value : [];
    const availableProjects = availableProjectsResult.status === 'fulfilled' ? availableProjectsResult.value : [];

    if (activitiesResult.status === 'rejected') console.error("Error loading activities:", activitiesResult.reason);
    if (gradesDataResult.status === 'rejected') console.error("Error loading grades:", gradesDataResult.reason);

    const attendanceDateColumns = attendanceReport.length > 0 
        ? Object.keys(attendanceReport[0]).filter(key => key !== 'ID' && key !== 'Estudiante' && key !== 'Correo').sort()
        : [];

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar flex flex-col min-h-0">
            <TabsContent value="activities" className="mt-0 outline-none">
                <ActivityManager courseId={courseId} activities={activities} />
            </TabsContent>
            <TabsContent value="students" className="mt-0 outline-none">
                <StudentManager 
                    courseId={courseId} 
                    initialStudents={students} 
                    courseTitle={course.title}
                />
            </TabsContent>
            <TabsContent value="roulette" className="mt-0 outline-none">
                <Roulette students={students} courseId={courseId} />
            </TabsContent>
            <TabsContent value="groups" className="mt-0 outline-none">
                <GroupGenerator students={students} />
            </TabsContent>
            <TabsContent value="evaluations" className="mt-0 outline-none">
                <EvaluationAssignmentManager 
                    courseId={courseId}
                    attempts={evaluationAssignments}
                    teacherEvaluations={teacherEvaluations}
                />
            </TabsContent>
            <TabsContent value="grades" className="mt-0 outline-none">
                <GradesManager courseId={courseId} initialData={gradesData} courseTitle={course.title} />
            </TabsContent>
            <TabsContent value="stats" className="mt-0 outline-none">
                <CourseStatistics 
                    courseId={courseId}
                    courseTitle={course.title}
                    attendanceData={attendanceReport}
                    attendanceDateColumns={attendanceDateColumns}
                    gradesData={gradesData}
                />
            </TabsContent>
            <TabsContent value="share" className="mt-0 outline-none">
                <GroupContentShare courseId={courseId} initialContent={sharedContents} />
            </TabsContent>
            <TabsContent value="docs" className="mt-0 outline-none h-full">
                <ProjectAnalytics 
                    courseId={course.id}
                    docProjectId={course.docProjectId} 
                    availableProjects={availableProjects as any || []} 
                />
            </TabsContent>
        </div>
    );
}
