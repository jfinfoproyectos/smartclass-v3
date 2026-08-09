"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  Files,
  FileText,
  Settings2,
  Users,
  Activity,
  LayoutDashboard,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";
import { getSettingsAction } from "@/features/admin/actions/settingsActions";
import { AICanvasHero } from "@/components/ui/ai-canvas-hero";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { AICanvasActivityMatrix } from "@/components/ui/ai-canvas-activity";
import { DashboardContainer } from "@/components/ui/dashboard-container";

export default function HomePage() {
  const [settings, setSettings] = useState<{ institutionName?: string | null }>({});
  const [mounted, setMounted] = useState(false);
  const { data: session } = authClient.useSession();
  const role = getRoleFromUser(session?.user);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [settingsData] = await Promise.all([getSettingsAction()]);
      setSettings(settingsData || {});
    };
    fetchData();
  }, []);

  const getNavigationCards = () => {
    if (!mounted) return [];

    if (role === "admin") {
      return [
        {
          title: "Gestión de Usuarios",
          description: "Administra cuentas de docentes, estudiantes y roles dentro del sistema.",
          url: "/dashboard/admin/users",
          icon: Users,
          badge: "Administración",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          accentColor: "from-primary/30 via-primary/15 to-transparent",
          iconBgColor: "bg-primary/10",
          iconTextColor: "text-primary",
        },
        {
          title: "Gestión de Cursos",
          description: "Crea, edita y organiza asignaturas, aulas y programas de estudio.",
          url: "/dashboard/admin/courses",
          icon: BookOpen,
          badge: "Académico",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          accentColor: "from-primary/30 via-primary/15 to-transparent",
          iconBgColor: "bg-primary/10",
          iconTextColor: "text-primary",
        },
        {
          title: "Documentación",
          description: "Guías administrativas, normativas y manuales del sistema.",
          url: "/dashboard/admin/docs",
          icon: Files,
          badge: "Recursos",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          accentColor: "from-primary/30 via-primary/15 to-transparent",
          iconBgColor: "bg-primary/10",
          iconTextColor: "text-primary",
        },
        {
          title: "Configuración Global",
          description: "Ajustes de la institución, parámetros del sistema y preferencias.",
          url: "/dashboard/admin/settings",
          icon: Settings2,
          badge: "Sistema",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          accentColor: "from-primary/30 via-primary/15 to-transparent",
          iconBgColor: "bg-primary/10",
          iconTextColor: "text-primary",
        },
      ];
    } else if (role === "teacher") {
      return [
        {
          title: "Mis Cursos",
          description: "Accede a tus asignaturas asignadas, contenidos y listas de clase.",
          url: "/dashboard/teacher",
          icon: BookOpen,
          badge: "Docencia",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          accentColor: "from-primary/30 via-primary/15 to-transparent",
          iconBgColor: "bg-primary/10",
          iconTextColor: "text-primary",
        },
        {
          title: "Control de Asistencia",
          description: "Toma asistencia diaria, revisa reportes y justificantes estudiantiles.",
          url: "/dashboard/teacher/attendance",
          icon: CalendarClock,
          badge: "Seguimiento",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          accentColor: "from-primary/30 via-primary/15 to-transparent",
          iconBgColor: "bg-primary/10",
          iconTextColor: "text-primary",
        },
        {
          title: "Evaluaciones & Exámenes",
          description: "Diseña pruebas, califica tareas y publica notas periódicas.",
          url: "/dashboard/teacher/evaluations",
          icon: FileText,
          badge: "Calificaciones",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          accentColor: "from-primary/30 via-primary/15 to-transparent",
          iconBgColor: "bg-primary/10",
          iconTextColor: "text-primary",
        },
        {
          title: "Guías & Documentación",
          description: "Manuales pedagógicos y recursos para el uso del aula virtual.",
          url: "/dashboard/teacher/docs",
          icon: Files,
          badge: "Ayuda",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          accentColor: "from-primary/30 via-primary/15 to-transparent",
          iconBgColor: "bg-primary/10",
          iconTextColor: "text-primary",
        },
        {
          title: "Ajustes Docentes",
          description: "Configura tu perfil profesional, firma y horarios de atención.",
          url: "/dashboard/teacher/settings",
          icon: Settings2,
          badge: "Perfil",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          accentColor: "from-primary/30 via-primary/15 to-transparent",
          iconBgColor: "bg-primary/10",
          iconTextColor: "text-primary",
        },
      ];
    } else {
      // Student
      return [
        {
          title: "Mis Cursos & Aulas",
          description: "Consulta tus materias inscritas, materiales de estudio y clases activas.",
          url: "/dashboard/student",
          icon: BookOpen,
          badge: "Inscrito",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          accentColor: "from-primary/30 via-primary/15 to-transparent",
          iconBgColor: "bg-primary/10",
          iconTextColor: "text-primary",
        },
        {
          title: "Mi Asistencia",
          description: "Revisa tu registro de asistencia a clases y porcentaje acumulado.",
          url: "/dashboard/student/attendance",
          icon: CalendarClock,
          badge: "Registro",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          accentColor: "from-primary/30 via-primary/15 to-transparent",
          iconBgColor: "bg-primary/10",
          iconTextColor: "text-primary",
        },
        {
          title: "Actividades & Tareas",
          description: "Envía tus entregables, realiza talleres y consulta tus calificaciones.",
          url: "/dashboard/student/activities",
          icon: Activity,
          badge: "Evaluación",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
          accentColor: "from-primary/30 via-primary/15 to-transparent",
          iconBgColor: "bg-primary/10",
          iconTextColor: "text-primary",
        },
      ];
    }
  };

  const navCards = getNavigationCards();
  const userName = mounted ? session?.user?.name || "Usuario" : "Usuario";
  const userRole = mounted ? role || "Estudiante" : "Estudiante";

  return (
    <DashboardContainer>
      {/* AI Canvas Hero Section */}
      <section className="w-full">
        <AICanvasHero
          userName={userName}
          userRole={userRole}
          institutionName={settings.institutionName || "SmartClass"}
          userImage={session?.user?.image}
        />
      </section>

      {/* Quick Access Grid Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Acceso Rápido
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Módulos y herramientas principales disponibles para tu rol de usuario.
            </p>
          </div>

          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 self-start sm:self-auto bg-muted px-3 py-1 rounded-full">
            {navCards.length} Módulos activos
          </span>
        </div>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navCards.map((item, index) => (
            <Link key={index} href={item.url} className="block group h-full">
              <AICanvasCard
                title={item.title}
                description={item.description}
                icon={item.icon}
                badge={item.badge}
                badgeColor={item.badgeColor}
                accentColor={item.accentColor}
                iconBgColor={item.iconBgColor}
                iconTextColor={item.iconTextColor}
                className="h-full"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* AI Canvas Timeline & Activity Matrix */}
      <section className="w-full">
        <AICanvasActivityMatrix />
      </section>
    </DashboardContainer>
  );
}
