import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { QuickReportToolView } from "@/features/quick-report/components/QuickReportToolView";
import type { CourseWithStudents } from "@/features/teacher/components/TeacherToolsView";

export const metadata = {
  title: "Generador de Informes IA (Voz & Ideas) | SmartClass",
  description: "Crea informes, bitácoras de clase y actas a partir de notas rápidas, ideas o audios grabados con inteligencia artificial.",
};

export default async function QuickReportToolPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as any;
  const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

  if (!session || (role !== "teacher" && role !== "admin")) {
    redirect("/signin");
  }

  const teacherId = session.user.id;

  // Obtener cursos activos del docente con sus estudiantes inscritos
  const courses = await prisma.course.findMany({
    where: role === "admin" ? {} : { teacherId },
    orderBy: { createdAt: "desc" },
    include: {
      enrollments: {
        where: { status: "APPROVED" },
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
                  apellido: true,
                  telefono: true,
                },
              },
            },
          },
        },
        orderBy: {
          user: { name: "asc" },
        },
      },
    },
  });

  const now = new Date();
  const formattedCourses: CourseWithStudents[] = courses.map((c) => {
    const isActive = !c.endDate || new Date(c.endDate) >= now;
    const students = c.enrollments
      .filter((e) => e.user !== null && e.user !== undefined)
      .map((e) => ({ user: e.user }));

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      isActive,
      studentsCount: students.length,
      students,
    };
  });

  return <QuickReportToolView courses={formattedCourses} />;
}
