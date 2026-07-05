"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { courseService } from "../services/courseService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function addStudentToCourseAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const userId = formData.get("userId") as string;
    const courseId = formData.get("courseId") as string;

    if (!userId || !courseId) {
        throw new Error("Missing required fields");
    }

    const enrollment = await courseService.enrollStudent(userId, courseId, 'APPROVED');

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const [course, student] = await Promise.all([
        prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    ]);

    await auditLogger.logEnrollment(
        enrollment.id,
        course?.title || "Curso",
        userId,
        student?.name || "Estudiante"
    );

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function searchStudentsAction(query: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    return await courseService.searchStudents(query);
}

export async function removeStudentFromCourseAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const userId = formData.get("userId") as string;
    const courseId = formData.get("courseId") as string;

    if (!userId || !courseId) {
        throw new Error("Missing required fields");
    }

    // Get info before removal for audit log
    const [course, student] = await Promise.all([
        prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    ]);

    await courseService.removeStudentFromCourse(userId, courseId);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logUnenrollment(
        course?.title || "Curso",
        userId,
        student?.name || "Estudiante",
        session.user.id,
        session.user.name || "Profesor"
    );

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function getStudentsForTeacherAction() {
    const session = await getSession();
    if (!session?.user || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    return await courseService.getStudentsForTeacher(session.user.id);
}

export async function getStudentCourseEnrollmentAction(userId: string, courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    return await courseService.getStudentCourseEnrollment(userId, courseId);
}

export async function getMissingSubmissionsAction(activityId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    // 1. Get the activity to find the courseId
    const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: { courseId: true }
    });

    if (!activity) {
        throw new Error("Activity not found");
    }

    // 2. Get all APPROVED enrollments for the course
    const enrollments = await prisma.enrollment.findMany({
        where: {
            courseId: activity.courseId,
            status: "APPROVED"
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    profile: {
                        select: {
                            identificacion: true,
                            nombres: true,
                            apellido: true
                        }
                    }
                }
            }
        }
    });

    // 3. Get all submissions for the activity
    const submissions = await prisma.submission.findMany({
        where: { activityId },
        select: { userId: true }
    });

    const submittedUserIds = new Set(submissions.map(s => s.userId));

    // 4. Filter students who haven't submitted
    const missingStudents = enrollments
        .filter(enrollment => !submittedUserIds.has(enrollment.userId))
        .map(enrollment => enrollment.user);

    return missingStudents;
}

export async function getStudentMissingActivitiesAction(courseId: string, userId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    // 1. Get all activities for the course
    const activities = await prisma.activity.findMany({
        where: { courseId },
        select: {
            id: true,
            title: true,
            type: true,
            deadline: true,
            allowLinkSubmission: true
        },
        orderBy: { order: 'asc' }
    });

    // 2. Get all submissions for the student in this course
    const submissions = await prisma.submission.findMany({
        where: {
            userId,
            activity: { courseId }
        },
        select: { activityId: true }
    });

    const submittedActivityIds = new Set(submissions.map(s => s.activityId));

    // 3. Filter activities that haven't been submitted and require submission
    const missingActivities = activities.filter(activity => {
        // Skip if student already submitted
        if (submittedActivityIds.has(activity.id)) return false;

        // Check if activity requires submission
        if (activity.type === 'MANUAL' && !activity.allowLinkSubmission) {
            return false;
        }

        return true;
    });

    return missingActivities;
}

export async function getCourseStudentsAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    return await courseService.getCourseStudents(courseId);
}

export async function updateStudentStatusAction(enrollmentId: string, status: 'APPROVED' | 'REJECTED') {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const enrollment = await courseService.updateEnrollmentStatus(enrollmentId, status);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const [course, student] = await Promise.all([
        prisma.course.findUnique({ where: { id: enrollment.courseId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: enrollment.userId }, select: { name: true } })
    ]);

    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: enrollmentId,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Estado de matrícula actualizado para ${student?.name || "Estudiante"} en ${course?.title || "Curso"}: ${status}`,
        metadata: { status, enrollmentId },
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${enrollment.courseId}`);
    return enrollment;
}
