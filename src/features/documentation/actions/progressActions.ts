"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Registra una visita al sitio de documentación (proyecto) en general.
 */
export async function recordProjectVisitAction(projectId: string) {
  return { success: true };
}

/**
 * Registra el acceso a una página específica (solo para actualizar el timestamp de actividad).
 */
export async function recordPageViewAction(pageId: string) {
  return;
}

/**
 * Actualiza el tiempo dedicado a una página (telemetría de tiempo).
 */
export async function updatePageProgressAction(pageId: string, timeSpentSeconds: number) {
  return;
}

/**
 * Obtiene las visitas del usuario actual para un proyecto específico.
 */
export async function getUserProjectProgressAction(docProjectId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { totalViews: 0, progress: [] };

  const [totalViews, progress] = await Promise.all([
    prisma.docViewLog.count({
      where: {
        userId: session.user.id,
        docProjectId: docProjectId
      }
    }),
    prisma.docProgress.findMany({
      where: {
        userId: session.user.id,
        page: { docProjectId }
      }
    })
  ]);

  return { totalViews, progress };
}

/**
 * Obtiene analíticas globales de un proyecto para el profesor.
 */
export async function getProjectAnalyticsAction(docProjectId: string, courseId?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
    throw new Error("Unauthorized");
  }

  const [project, totalViews, activeStudents, timeStats, projectSettings] = await Promise.all([
    prisma.docProject.findUnique({
      where: { id: docProjectId },
      select: { name: true, slug: true }
    }),
    prisma.docViewLog.count({
      where: { docProjectId }
    }),
    prisma.docProgress.groupBy({
      by: ['userId'],
      where: { page: { docProjectId } }
    }),
    prisma.docProgress.aggregate({
      where: { page: { docProjectId } },
      _avg: { timeSpent: true }
    }),
    prisma.course.findFirst({
      where: courseId ? { id: courseId } : { docLinks: { some: { docProjectId } } },
      select: {
        id: true,
        docTrackingEnabled: true,
        docAiTutorEnabled: true,
        docAiQuestionsLimit: true,
        docThemeMode: true,
        docCodeTheme: true,
        docAllowCodeThemeChange: true,
        docThemeColor: true,
        docAllowThemeColorChange: true,
        teacher: {
            select: {
                appThemeMode: true,
                appThemeColor: true,
                appAllowThemeColorChange: true,
                appCodeTheme: true,
                appAllowCodeThemeChange: true
            }
        }
      }
    })
  ]);

  return {
    projectName: project?.name,
    projectSlug: project?.slug,
    totalViews,
    activeStudentsCount: activeStudents.length,
    avgTimeSpent: timeStats._avg.timeSpent || 0,
    settings: projectSettings ? {
      trackingEnabled: projectSettings.docTrackingEnabled,
      aiTutorEnabled: projectSettings.docAiTutorEnabled,
      aiQuestionsLimit: projectSettings.docAiQuestionsLimit,
      themeMode: projectSettings.docThemeMode,
      codeTheme: projectSettings.docCodeTheme,
      allowCodeThemeChange: true,
      themeColor: projectSettings.docThemeColor,
      allowThemeColorChange: true,
      // Default values from teacher global settings
      teacherDefaults: {
          themeMode: (projectSettings as any)?.teacher?.appThemeMode,
          codeTheme: (projectSettings as any)?.teacher?.appCodeTheme,
          allowCodeThemeChange: true,
          themeColor: (projectSettings as any)?.teacher?.appThemeColor,
          allowThemeColorChange: true
      }
    } : null
  };
}

/**
 * Obtiene la actividad detallada de todos los estudiantes inscritos en un curso.
 */
export async function getStudentProgressAction(docProjectId: string, courseId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
    throw new Error("Unauthorized");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: 'APPROVED' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          profile: true
        }
      }
    }
  });

  const [progress, views] = await Promise.all([
    prisma.docProgress.findMany({
      where: {
        userId: { in: enrollments.map(e => e.userId) },
        page: { docProjectId }
      }
    }),
    prisma.docViewLog.groupBy({
      by: ['userId'],
      where: {
        userId: { in: enrollments.map(e => e.userId) },
        docProjectId
      },
      _count: { _all: true }
    })
  ]);

  return enrollments.map(enrollment => {
    const studentProgress = progress.filter(p => p.userId === enrollment.userId);
    const studentViews = views.find(v => v.userId === enrollment.userId)?._count._all || 0;
    const totalTime = studentProgress.reduce((acc, p) => acc + p.timeSpent, 0);

    return {
      userId: enrollment.user.id,
      name: enrollment.user.name,
      email: enrollment.user.email,
      image: enrollment.user.image,
      profile: enrollment.user.profile,
      totalTimeSpent: totalTime,
      totalViews: studentViews,
      lastActive: studentProgress.length > 0 
        ? new Date(Math.max(...studentProgress.map(p => p.lastViewedAt.getTime())))
        : null
    };
  }).sort((a, b) => b.totalViews - a.totalViews);
}

/**
 * Obtiene el historial detallado de visitas de un estudiante específico.
 */
export async function getStudentViewLogsAction(userId: string, docProjectId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
    throw new Error("Unauthorized");
  }

  return await prisma.docViewLog.findMany({
    where: {
      userId,
      docProjectId
    },
    orderBy: { viewedAt: 'desc' },
    take: 100
  });
}

/**
 * Borra todo el historial de visitas y actividad de un estudiante en un proyecto.
 */
export async function clearStudentHistoryAction(userId: string, docProjectId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
    throw new Error("Unauthorized");
  }

  await prisma.$transaction([
    prisma.docViewLog.deleteMany({
      where: {
        userId,
        docProjectId
      }
    }),
    prisma.docProgress.deleteMany({
      where: {
        userId,
        page: { docProjectId }
      }
    })
  ]);

  return { success: true };
}

/**
 * Actualiza la configuración de seguimiento y tutoría de un curso específico.
 */
export async function updateCourseDocSettingsAction(courseId: string, settings: {
  trackingEnabled?: boolean;
  aiTutorEnabled?: boolean;
  aiQuestionsLimit?: number;
  themeMode?: string;
  codeTheme?: string;
  allowCodeThemeChange?: boolean;
  themeColor?: string;
  allowThemeColorChange?: boolean;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true }
  });

  if (!course) throw new Error("Curso no encontrado");
  
  if (course.teacherId !== session.user.id && session.user.role !== "admin") {
    throw new Error("No tienes permiso para modificar la configuración de este curso.");
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      docTrackingEnabled: settings.trackingEnabled,
      docAiTutorEnabled: settings.aiTutorEnabled,
      docAiQuestionsLimit: settings.aiQuestionsLimit,
      docThemeMode: settings.themeMode,
      docCodeTheme: settings.codeTheme,
      docAllowCodeThemeChange: settings.allowCodeThemeChange,
      docThemeColor: settings.themeColor,
      docAllowThemeColorChange: settings.allowThemeColorChange,
    }
  });

  revalidatePath(`/docs`, "layout");
  return { success: true };
}

/**
 * Obtiene datos formateados para los gráficos de analíticas (visitas por día y top estudiantes).
 */
export async function getProjectChartDataAction(docProjectId: string, courseId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
    throw new Error("Unauthorized");
  }

  // 1. Obtener visitas por día (últimos 14 días)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const dailyLogs = await prisma.docViewLog.findMany({
    where: {
      docProjectId,
      viewedAt: { gte: fourteenDaysAgo }
    },
    select: { viewedAt: true }
  });

  // Agrupar por fecha
  const visitsByDay = dailyLogs.reduce((acc: any, log) => {
    const day = log.viewedAt.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const dailyChartData = Object.entries(visitsByDay).map(([date, count]) => ({
    date,
    visitas: count
  })).sort((a, b) => a.date.localeCompare(b.date));

  // 2. Obtener top estudiantes (Visitas y Tiempo)
  const students = await getStudentProgressAction(docProjectId, courseId);
  
  const studentStats = students.slice(0, 10).map(s => ({
    name: s.name.split(' ')[0], // Solo el primer nombre para el gráfico
    visitas: s.totalViews,
    tiempo: Math.round(s.totalTimeSpent / 60) // En minutos
  }));

  return {
    dailyChartData,
    studentStats
  };
}
