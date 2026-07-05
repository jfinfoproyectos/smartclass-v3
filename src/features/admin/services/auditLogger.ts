import { LogAction, LogEntity } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";



interface LogOptions {
    action: LogAction;
    entity: LogEntity;
    entityId?: string;
    userId?: string;
    userName?: string;
    userRole?: string;
    description: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
}

let cachedAuditEnabled: boolean | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

async function isAuditEnabled(): Promise<boolean> {
    const now = Date.now();
    if (cachedAuditEnabled !== null && (now - lastCacheTime) < CACHE_TTL) {
        return cachedAuditEnabled;
    }

    try {
        const settings = await prisma.systemSettings.findUnique({
            where: { id: "settings" },
            select: { auditLogEnabled: true }
        });
        
        cachedAuditEnabled = settings?.auditLogEnabled ?? true;
        lastCacheTime = now;
        return cachedAuditEnabled;
    } catch (e) {
        console.error("[AuditLogger] Error checking if audit is enabled", e);
        return true; // Default to true on error
    }
}

export function clearAuditCache() {
    cachedAuditEnabled = null;
    lastCacheTime = 0;
}

export const auditLogger = {
    /**
     * Log an audit event
     */
    async log(options: LogOptions) {
        try {
            const enabled = await isAuditEnabled();
            if (!enabled) return;
            await prisma.auditLog.create({
                data: {
                    action: options.action,
                    entity: options.entity,
                    entityId: options.entityId,
                    userId: options.userId,
                    userName: options.userName,
                    userRole: options.userRole,
                    description: options.description,
                    metadata: options.metadata ? JSON.stringify(options.metadata) : null,
                    ipAddress: options.ipAddress,
                    userAgent: options.userAgent,
                    success: options.success ?? true,
                    errorMessage: options.errorMessage,
                },
            });
        } catch (error) {
            // Don't throw errors from logging to avoid breaking the main flow
            console.error("[AuditLogger] Failed to log:", error);
        }
    },

    /**
     * Log user login
     */
    async logLogin(userId: string, userName: string, userRole: string, ipAddress?: string, userAgent?: string) {
        await this.log({
            action: "LOGIN",
            entity: "USER",
            entityId: userId,
            userId,
            userName,
            userRole,
            description: `${userName} (${userRole}) inició sesión`,
            ipAddress,
            userAgent,
        });
    },

    /**
     * Log user logout
     */
    async logLogout(userId: string, userName: string, userRole: string) {
        await this.log({
            action: "LOGOUT",
            entity: "USER",
            entityId: userId,
            userId,
            userName,
            userRole,
            description: `${userName} (${userRole}) cerró sesión`,
        });
    },

    /**
     * Log course creation
     */
    async logCourseCreate(courseId: string, courseName: string, teacherId: string, teacherName: string) {
        await this.log({
            action: "CREATE",
            entity: "COURSE",
            entityId: courseId,
            userId: teacherId,
            userName: teacherName,
            userRole: "teacher",
            description: `Curso "${courseName}" creado por ${teacherName}`,
            metadata: { courseName },
        });
    },

    /**
     * Log course update
     */
    async logCourseUpdate(courseId: string, courseName: string, teacherId: string, teacherName: string, changes: Record<string, any>) {
        await this.log({
            action: "UPDATE",
            entity: "COURSE",
            entityId: courseId,
            userId: teacherId,
            userName: teacherName,
            userRole: "teacher",
            description: `Curso "${courseName}" actualizado por ${teacherName}`,
            metadata: { courseName, changes },
        });
    },

    /**
     * Log course deletion
     */
    async logCourseDelete(courseId: string, courseName: string, teacherId: string, teacherName: string) {
        await this.log({
            action: "DELETE",
            entity: "COURSE",
            entityId: courseId,
            userId: teacherId,
            userName: teacherName,
            userRole: "teacher",
            description: `Curso "${courseName}" eliminado por ${teacherName}`,
            metadata: { courseName },
        });
    },

    /**
     * Log activity creation
     */
    async logActivityCreate(activityId: string, activityName: string, courseId: string, teacherId: string, teacherName: string) {
        await this.log({
            action: "CREATE",
            entity: "ACTIVITY",
            entityId: activityId,
            userId: teacherId,
            userName: teacherName,
            userRole: "teacher",
            description: `Actividad "${activityName}" creada por ${teacherName}`,
            metadata: { activityName, courseId },
        });
    },

    /**
     * Log student submission
     */
    async logSubmission(submissionId: string, activityName: string, studentId: string, studentName: string, attemptCount: number) {
        await this.log({
            action: "SUBMIT",
            entity: "SUBMISSION",
            entityId: submissionId,
            userId: studentId,
            userName: studentName,
            userRole: "student",
            description: `${studentName} entregó "${activityName}" (Intento ${attemptCount})`,
            metadata: { activityName, attemptCount },
        });
    },

    /**
     * Log grading
     */
    async logGrade(submissionId: string, activityName: string, studentName: string, grade: number, teacherId: string, teacherName: string) {
        await this.log({
            action: "GRADE",
            entity: "SUBMISSION",
            entityId: submissionId,
            userId: teacherId,
            userName: teacherName,
            userRole: "teacher",
            description: `${teacherName} calificó "${activityName}" de ${studentName} con ${grade.toFixed(1)}`,
            metadata: { activityName, studentName, grade },
        });
    },

    /**
     * Log enrollment
     */
    async logEnrollment(enrollmentId: string, courseName: string, studentId: string, studentName: string) {
        await this.log({
            action: "ENROLL",
            entity: "ENROLLMENT",
            entityId: enrollmentId,
            userId: studentId,
            userName: studentName,
            userRole: "student",
            description: `${studentName} se inscribió en "${courseName}"`,
            metadata: { courseName },
        });
    },

    /**
     * Log unenrollment
     */
    async logUnenrollment(courseName: string, studentId: string, studentName: string, teacherId: string, teacherName: string) {
        await this.log({
            action: "UNENROLL",
            entity: "ENROLLMENT",
            userId: teacherId,
            userName: teacherName,
            userRole: "teacher",
            description: `${teacherName} removió a ${studentName} de "${courseName}"`,
            metadata: { courseName, studentName },
        });
    },

    /**
     * Log attendance marking
     */
    async logAttendance(attendanceId: string, courseName: string, studentName: string, status: string, teacherId: string, teacherName: string) {
        await this.log({
            action: "ATTENDANCE_MARK",
            entity: "ATTENDANCE",
            entityId: attendanceId,
            userId: teacherId,
            userName: teacherName,
            userRole: "teacher",
            description: `${teacherName} marcó asistencia de ${studentName} en "${courseName}" como ${status}`,
            metadata: { courseName, studentName, status },
        });
    },

    /**
     * Log remark creation
     */
    async logRemark(remarkId: string, remarkType: string, studentName: string, courseName: string, teacherId: string, teacherName: string) {
        await this.log({
            action: "REMARK_CREATE",
            entity: "REMARK",
            entityId: remarkId,
            userId: teacherId,
            userName: teacherName,
            userRole: "teacher",
            description: `${teacherName} creó ${remarkType === 'ATTENTION' ? 'llamado de atención' : 'felicitación'} para ${studentName} en "${courseName}"`,
            metadata: { remarkType, studentName, courseName },
        });
    },


    /**
     * Log data export
     */
    async logExport(entityType: string, fileName: string, userId: string, userName: string, userRole: string, recordCount: number) {
        await this.log({
            action: "EXPORT",
            entity: "OTHER",
            userId,
            userName,
            userRole,
            description: `${userName} exportó ${recordCount} registro(s) de ${entityType} a "${fileName}"`,
            metadata: { entityType, fileName, recordCount },
        });
    },

    /**
     * Log error
     */
    async logError(action: LogAction, entity: LogEntity, description: string, errorMessage: string, userId?: string, userName?: string) {
        await this.log({
            action,
            entity,
            userId,
            userName,
            description,
            errorMessage,
            success: false,
        });
    },

    /**
     * Log Gemini API Usage (Global Key)
     */
    async logGeminiApiUsage(userId: string, userName: string, userRole: string, requestsCount: number) {
        await this.log({
            action: "OTHER",
            entity: "SYSTEM",
            userId,
            userName,
            userRole,
            description: `Uso de API Gemini (Clave Global): ${requestsCount} petición(es)`,
            metadata: { type: "GEMINI_API_USAGE", requestsCount },
        });
    },

    /**
     * Get audit logs with filters
     */
    async getLogs(filters: {
        action?: LogAction;
        entity?: LogEntity;
        userId?: string;
        success?: boolean;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }) {
        const where: any = {};

        if (filters.action) where.action = filters.action;
        if (filters.entity) where.entity = filters.entity;
        if (filters.userId) where.userId = filters.userId;
        if (filters.success !== undefined) where.success = filters.success;

        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = filters.startDate;
            if (filters.endDate) where.createdAt.lte = filters.endDate;
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: filters.limit || 50,
                skip: filters.offset || 0,
            }),
            prisma.auditLog.count({ where }),
        ]);

        return { logs, total };
    },

    /**
     * Get statistics
     */
    async getStats(startDate?: Date, endDate?: Date) {
        const where: any = {};

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        const [
            totalLogs,
            successfulLogs,
            failedLogs,
            actionCounts,
            entityCounts,
            recentErrors,
        ] = await Promise.all([
            prisma.auditLog.count({ where }),
            prisma.auditLog.count({ where: { ...where, success: true } }),
            prisma.auditLog.count({ where: { ...where, success: false } }),
            prisma.auditLog.groupBy({
                by: ['action'],
                where,
                _count: true,
            }),
            prisma.auditLog.groupBy({
                by: ['entity'],
                where,
                _count: true,
            }),
            prisma.auditLog.findMany({
                where: { ...where, success: false },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);

        return {
            totalLogs,
            successfulLogs,
            failedLogs,
            successRate: totalLogs > 0 ? ((successfulLogs / totalLogs) * 100).toFixed(2) : '0',
            actionCounts,
            entityCounts,
            recentErrors,
        };
    },

    /**
     * Clear all audit logs
     */
    async clearAllLogs() {
        return await prisma.auditLog.deleteMany({});
    },
};
