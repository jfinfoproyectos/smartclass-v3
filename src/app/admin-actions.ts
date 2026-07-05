"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { adminService } from "@/features/admin/services/adminService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

// Middleware to check admin role
async function requireAdmin() {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
    }
    return session;
}

// ============ DASHBOARD ============
export async function getAdminDashboardStatsAction() {
    await requireAdmin();
    return await adminService.getSystemStats();
}

export async function getRecentActivityAction(limit?: number) {
    await requireAdmin();
    return await adminService.getRecentActivity(limit);
}

// ============ USER MANAGEMENT ============
export async function getAllUsersAction(filters?: {
    role?: "teacher" | "student" | "admin";
    search?: string;
    courseId?: string;
    limit?: number;
    offset?: number;
}) {
    await requireAdmin();
    return await adminService.getAllUsers(filters);
}

export async function getAllCoursesForFilterAction() {
    await requireAdmin();
    return await adminService.getAllCoursesSimple();
}

export async function createUserAction(data: {
    email: string;
    name: string;
    role: "teacher" | "admin";
    password: string;
}) {
    await requireAdmin();


    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
    });

    if (existingUser) {
        throw new Error("Ya existe un usuario con este correo electrónico");
    }

    // Hash password
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user with account
    const user = await prisma.user.create({
        data: {
            id: crypto.randomUUID(),
            email: data.email,
            name: data.name,
            role: data.role,
            emailVerified: true,
            accounts: {
                create: {
                    id: crypto.randomUUID(),
                    accountId: crypto.randomUUID(),
                    providerId: "credential",
                    password: hashedPassword,
                }
            }
        }
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    const session = await getSession();
    await auditLogger.log({
        action: "CREATE",
        entity: "USER",
        entityId: user.id,
        userId: session?.user.id,
        userName: session?.user.name || "Admin",
        userRole: "admin",
        description: `Usuario ${data.role} creado: ${data.name} (${data.email})`,
        metadata: { email: data.email, role: data.role },
        success: true,
    });

    revalidatePath("/dashboard/admin/users");
    return user;
}

export async function getUserDetailsAction(userId: string) {
    await requireAdmin();
    return await adminService.getUserDetails(userId);
}


export async function updateUserRoleAction(userId: string, newRole: "teacher" | "student" | "admin") {
    const session = await requireAdmin();

    // Get user info before update
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, role: true }
    });

    const result = await adminService.updateUserRole(userId, newRole);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: userId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Rol de usuario actualizado: ${user?.name || "Usuario"} de ${user?.role} a ${newRole}`,
        metadata: { oldRole: user?.role, newRole, email: user?.email },
        success: true,
    });

    revalidatePath("/dashboard/admin/users");
    return result;
}


export async function toggleUserBanAction(userId: string, banned: boolean) {
    const session = await requireAdmin();

    // Get user info before update
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
    });

    const result = await adminService.toggleUserBan(userId, banned);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: userId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Usuario ${banned ? 'baneado' : 'desbaneado'}: ${user?.name || "Usuario"} (${user?.email})`,
        metadata: { banned, email: user?.email },
        success: true,
    });

    revalidatePath("/dashboard/admin/users");
    return result;
}



export async function deleteUserAction(userId: string) {
    const session = await requireAdmin();

    // Get user info before deletion
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, role: true }
    });

    const result = await adminService.deleteUser(userId);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "USER",
        entityId: userId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Usuario eliminado: ${user?.name || "Usuario"} (${user?.email || "Email desconocido"}) - Rol: ${user?.role}`,
        metadata: { email: user?.email, role: user?.role },
        success: true,
    });

    revalidatePath("/dashboard/admin/users");
    return result;
}


// ============ COURSE MANAGEMENT ============
export async function getAllCoursesAdminAction(filters?: {
    status?: 'active' | 'archived' | 'all';
    teacherId?: string;
    search?: string;
    limit?: number;
    offset?: number;
}) {
    await requireAdmin();
    return await adminService.getAllCoursesAdmin(filters);
}

export async function getCourseDetailsAdminAction(courseId: string) {
    await requireAdmin();
    return await adminService.getCourseDetailsAdmin(courseId);
}


export async function reassignCourseTeacherAction(courseId: string, newTeacherId: string) {
    const session = await requireAdmin();

    // Get course and teacher info
    const [course, newTeacher] = await Promise.all([
        prisma.course.findUnique({ where: { id: courseId }, select: { title: true, teacherId: true } }),
        prisma.user.findUnique({ where: { id: newTeacherId }, select: { name: true } })
    ]);

    const result = await adminService.reassignCourseTeacher(courseId, newTeacherId);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "COURSE",
        entityId: courseId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Curso "${course?.title || "Curso"}" reasignado a ${newTeacher?.name || "Nuevo profesor"}`,
        metadata: { courseName: course?.title, newTeacherId, newTeacherName: newTeacher?.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath(`/dashboard/admin/courses/${courseId}`);
    return result;
}






// ============ BULK OPERATIONS ============
export async function bulkArchiveCoursesAction(courseIds: string[]) {
    await requireAdmin();

    const { courseService } = await import("@/features/teacher/services/courseService");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const results = await Promise.all(
        courseIds.map(id =>
            courseService.updateCourse(id, { endDate: yesterday })
        )
    );

    revalidatePath("/dashboard/admin/courses");
    return results;
}

export async function bulkDeleteUsersAction(userIds: string[]) {
    await requireAdmin();

    const results = await Promise.all(
        userIds.map(id => adminService.deleteUser(id))
    );

    revalidatePath("/dashboard/admin/users");
    return results;
}

// ============ SYSTEM SETTINGS ============
export async function getSystemSettingsAction() {
    await requireAdmin();



    let settings = await prisma.systemSettings.findUnique({
        where: { id: "settings" }
    });

    if (!settings) {
        settings = await prisma.systemSettings.create({
            data: {
                id: "settings",
                geminiApiKeyMode: "GLOBAL"
            }
        });
    }

    return {
        ...settings,
        institutionName: settings.institutionName,
        institutionLogo: settings.institutionLogo,
        institutionHeroImage: settings.institutionHeroImage,
        hasGlobalKey: !!settings.encryptedGlobalApiKey,
        hasGithubToken: !!settings.encryptedGithubToken,
        footerText: settings.footerText
    };
}


export async function updateSystemSettingsAction(data: {
    footerText?: string;
    auditLogEnabled?: boolean;
    appThemeMode?: string;
    appThemeColor?: string;
    appAllowThemeColorChange?: boolean;
    appCodeTheme?: string;
    appAllowCodeThemeChange?: boolean;
}) {
    const session = await requireAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
        geminiApiKeyMode: "USER", // Siempre forzar modo por usuario
        footerText: data.footerText,
        appThemeMode: data.appThemeMode,
        appThemeColor: data.appThemeColor,
        appAllowThemeColorChange: data.appAllowThemeColorChange,
        appCodeTheme: data.appCodeTheme,
        appAllowCodeThemeChange: data.appAllowCodeThemeChange,
    };

    if (data.auditLogEnabled !== undefined) {
        updateData.auditLogEnabled = data.auditLogEnabled;
    }

    const settings = await prisma.systemSettings.upsert({
        where: { id: "settings" },
        update: updateData,
        create: {
            id: "settings",
            ...updateData
        }
    });

    // 🎯 AUDIT LOG
    const { auditLogger, clearAuditCache } = await import("@/features/admin/services/auditLogger");
    
    // Clear the memory cache since settings just changed
    clearAuditCache();

    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: "system-settings",
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Configuración del sistema actualizada por el administrador`,
        metadata: { auditLogEnabled: data.auditLogEnabled },
        success: true,
    });

    revalidatePath("/dashboard/admin/settings");
    return settings;
}


export async function getSystemHealthAction() {
    await requireAdmin();



    try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1`;

        // Get database stats
        const [userCount, courseCount, activityCount] = await Promise.all([
            prisma.user.count(),
            prisma.course.count(),
            prisma.activity.count()
        ]);

        return {
            status: 'healthy' as const,
            database: {
                connected: true,
                users: userCount,
                courses: courseCount,
                activities: activityCount
            },
            timestamp: new Date()
        };
    } catch (error) {
        return {
            status: 'unhealthy' as const,
            database: {
                connected: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            timestamp: new Date()
        };
    }
}

// ============ AUDIT LOGS ============

export async function getAuditLogsAction(filters?: {
    action?: string;
    entity?: string;
    userId?: string;
    success?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}) {
    await requireAdmin();
    const { auditLogger } = await import("@/features/admin/services/auditLogger");

    return await auditLogger.getLogs({
        action: filters?.action as "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "OTHER" | undefined,
        entity: filters?.entity as "USER" | "COURSE" | "ACTIVITY" | "EVALUATION" | "SYSTEM" | "OTHER" | undefined,
        userId: filters?.userId,
        success: filters?.success,
        startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
        limit: filters?.limit,
        offset: filters?.offset,
    });
}

export async function getAuditStatsAction(startDate?: string, endDate?: string) {
    await requireAdmin();
    const { auditLogger } = await import("@/features/admin/services/auditLogger");

    return await auditLogger.getStats(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
    );
}

export async function clearAuditLogsAction() {
    const session = await requireAdmin();
    const { auditLogger } = await import("@/features/admin/services/auditLogger");

    const result = await auditLogger.clearAllLogs();

    // Log the action itself (this will be the first new log!)
    await auditLogger.log({
        action: "DELETE",
        entity: "SYSTEM",
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Historial de auditoría eliminado por ${session.user.name || "Admin"}`,
        metadata: { deletedCount: result.count },
        success: true,
    });

    revalidatePath("/dashboard/admin/settings");
    return result;
}

export async function deleteCourseAction(courseId: string) {
    const session = await requireAdmin();
    const { courseService } = await import("@/features/teacher/services/courseService");
    const { auditLogger } = await import("@/features/admin/services/auditLogger");

    // Get course info first for logging
    const course = await courseService.getCourseById(courseId);

    // Delete course
    await courseService.deleteCourse(courseId);

    // Log deletion
    await auditLogger.logCourseDelete(
        courseId,
        course?.title || "Curso desconocido",
        session.user.id,
        session.user.name || "Admin"
    );

    revalidatePath("/dashboard/admin/courses");
    return { success: true };
}

// ============ GEMINI API USAGE ============

export async function getGeminiApiLogsAction(filters?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}) {
    await requireAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
        action: "OTHER",
        entity: "SYSTEM",
        metadata: {
            contains: '"GEMINI_API_USAGE"'
        }
    };

    if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: filters?.limit || 50,
            skip: filters?.offset || 0,
        }),
        prisma.auditLog.count({ where }),
    ]);

    // Calculate total requests directly from logs without DB aggregation to keep schema simple
    const allMatchingLogs = await prisma.auditLog.findMany({
        where,
        select: { metadata: true }
    });

    let totalRequests = 0;
    allMatchingLogs.forEach(log => {
        if (log.metadata) {
            try {
                const meta = JSON.parse(log.metadata);
                if (meta.requestsCount) totalRequests += meta.requestsCount;
            } catch { }
        }
    });

    return { logs, total, totalRequests };
}
