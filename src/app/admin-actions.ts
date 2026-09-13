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
export async function getUsersSummaryStatsAction() {
    await requireAdmin();
    return await adminService.getUsersSummaryStats();
}

export async function getAllUsersAction(filters?: {
    role?: "teacher" | "student" | "admin" | "all";
    search?: string;
    courseId?: string;
    teacherId?: string;
    status?: "all" | "active" | "banned";
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

    // Hash password using Better Auth standard format
    const { hashPassword } = await import("better-auth/crypto");
    const hashedPassword = await hashPassword(data.password);

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

    // 🔔 PUSH NOTIFICATION
    try {
        const { sendPushNotification } = await import("@/lib/push-notifications");
        await sendPushNotification(userId, {
            title: "Actualización de Cuenta 🔐",
            body: `Tu rol en SmartClass ha sido actualizado a "${newRole}".`,
            url: `/dashboard`
        });
    } catch (pushError) {
        console.error("Failed to send role update push notification:", pushError);
    }

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

    // 🔔 PUSH NOTIFICATION
    try {
        const { sendPushNotification } = await import("@/lib/push-notifications");
        await sendPushNotification(userId, {
            title: banned ? "Cuenta Suspendida 🚫" : "Cuenta Reactivada ✔️",
            body: banned 
                ? "Tu cuenta de SmartClass ha sido suspendida por el administrador."
                : "Tu cuenta de SmartClass ha sido reactivada. Ya puedes iniciar sesión.",
            url: banned ? "/" : "/dashboard"
        });
    } catch (pushError) {
        console.error("Failed to send ban toggle push notification:", pushError);
    }

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

export async function resetUserPasswordByAdminAction(userId: string, customPassword?: string) {
    const session = await requireAdmin();

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            profile: true,
            accounts: true,
        }
    });

    if (!user) {
        throw new Error("Usuario no encontrado");
    }

    const identificacion = user.profile?.identificacion?.trim();
    const newPassword = customPassword?.trim() || identificacion;

    if (!newPassword) {
        throw new Error("El usuario no tiene número de identificación registrado en su perfil para usarlo como contraseña predeterminada.");
    }

    // Hash password using Better Auth standard format
    const { hashPassword } = await import("better-auth/crypto");
    const hashedPassword = await hashPassword(newPassword);

    // Update or create credential account
    const credentialAccount = user.accounts.find(a => a.providerId === "credential");

    if (credentialAccount) {
        await prisma.account.update({
            where: { id: credentialAccount.id },
            data: { password: hashedPassword }
        });
    } else {
        await prisma.account.create({
            data: {
                id: crypto.randomUUID(),
                accountId: crypto.randomUUID(),
                userId: user.id,
                providerId: "credential",
                password: hashedPassword,
            }
        });
    }

    // 🎯 AUDIT LOG
    try {
        const { auditLogger } = await import("@/features/admin/services/auditLogger");
        await auditLogger.log({
            action: "UPDATE",
            entity: "USER",
            entityId: userId,
            userId: session.user.id,
            userName: session.user.name || "Admin",
            userRole: "admin",
            description: `Contraseña restablecida para ${user.name || user.email} (${user.email}) asignando por defecto su identificación (${identificacion})`,
            metadata: { email: user.email, hasCustomPassword: !!customPassword },
            success: true,
        });
    } catch (e) {
        console.error("Audit log error:", e);
    }

    // 🔔 PUSH NOTIFICATION
    try {
        const { sendPushNotification } = await import("@/lib/push-notifications");
        await sendPushNotification(userId, {
            title: "Contraseña Restablecida 🔐",
            body: "Tu contraseña ha sido restablecida. Puedes ingresar con tu número de identificación.",
            url: "/dashboard"
        });
    } catch (pushError) {
        console.error("Failed to send reset password push notification:", pushError);
    }

    revalidatePath("/dashboard/admin/users");
    return {
        success: true,
        message: `Contraseña restablecida exitosamente para ${user.name || user.email}`,
        passwordAssigned: newPassword
    };
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

export async function createCourseAdminAction(data: {
    title: string;
    description?: string;
    teacherId: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    classDays?: string;
}) {
    const session = await requireAdmin();

    if (!data.title?.trim()) {
        throw new Error("El título del curso es requerido.");
    }
    if (!data.teacherId) {
        throw new Error("Debes asignar un profesor al curso.");
    }

    // Verify teacher exists
    const teacher = await prisma.user.findUnique({
        where: { id: data.teacherId },
        select: { id: true, name: true, email: true }
    });

    if (!teacher) {
        throw new Error("Profesor no encontrado.");
    }

    // Generate unique 6-character enrollment code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
        code = "";
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const existing = await prisma.course.findUnique({ where: { enrollmentCode: code } });
        if (!existing) isUnique = true;
        attempts++;
    }

    const { parseISOAsUTC } = await import("@/lib/dateUtils");

    const course = await prisma.course.create({
        data: {
            id: crypto.randomUUID(),
            title: data.title.trim(),
            description: data.description?.trim() || null,
            teacherId: data.teacherId,
            enrollmentCode: isUnique ? code : null,
            startDate: data.startDate ? parseISOAsUTC(data.startDate) : null,
            endDate: data.endDate ? parseISOAsUTC(data.endDate) : null,
            startTime: data.startTime?.trim() || null,
            endTime: data.endTime?.trim() || null,
            classDays: data.classDays?.trim() || null,
        },
        include: {
            teacher: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    profile: true
                }
            },
            _count: {
                select: {
                    enrollments: true,
                    activities: true
                }
            }
        }
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.logCourseCreate(
        course.id,
        course.title,
        session.user.id,
        session.user.name || "Admin"
    );

    revalidatePath("/dashboard/admin/courses");
    return course;
}

export async function toggleCourseArchivedAdminAction(courseId: string, archive: boolean) {
    const session = await requireAdmin();

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, title: true, endDate: true }
    });

    if (!course) {
        throw new Error("Curso no encontrado.");
    }

    let newEndDate: Date | null = null;
    if (archive) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        newEndDate = yesterday;
    } else {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 6);
        newEndDate = futureDate;
    }

    const updated = await prisma.course.update({
        where: { id: courseId },
        data: { endDate: newEndDate }
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "COURSE",
        entityId: courseId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Curso "${course.title}" ${archive ? "archivado" : "reactivado"} por el administrador`,
        metadata: { courseId, title: course.title, archived: archive },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return updated;
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


