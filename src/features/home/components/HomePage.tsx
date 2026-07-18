"use client";

import { Bell, Calendar, Info, AlertTriangle, Wrench, Trophy, AlertCircle, Newspaper, PartyPopper, BookOpen, Settings2, CalendarClock, BarChart, Users, Activity, ScrollText, Home, Files, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { getSettingsAction } from "@/features/admin/actions/settingsActions";
import MDEditor from "@uiw/react-md-editor";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LampContainer } from "@/components/ui/lamp";
import { motion } from "framer-motion";

export default function HomePage() {
    const [settings, setSettings] = useState<{ institutionName?: string | null }>({});
    const [mounted, setMounted] = useState(false);
    const { data: session } = authClient.useSession();
    const role = getRoleFromUser(session?.user);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const [settingsData] = await Promise.all([
                getSettingsAction(),
            ]);
            setSettings(settingsData || {});
        };
        fetchData();
    }, []);

    const getNavigationItems = () => {
        // Only return items if mounted to prevent hydration mismatch
        if (!mounted) {
            return [];
        }

        if (role === "admin") {
            return [
                { title: "Usuarios", url: "/dashboard/admin/users", icon: Users, color: "text-blue-500" },
                { title: "Cursos", url: "/dashboard/admin/courses", icon: BookOpen, color: "text-green-500" },
                { title: "Documentación", url: "/dashboard/admin/docs", icon: Files, color: "text-amber-500" },
                { title: "Configuración", url: "/dashboard/admin/settings", icon: Settings2, color: "text-gray-500" },
            ];
        } else if (role === "teacher") {
            return [
                { title: "Mis Cursos", url: "/dashboard/teacher", icon: BookOpen, color: "text-blue-500" },
                { title: "Asistencia", url: "/dashboard/teacher/attendance", icon: CalendarClock, color: "text-green-500" },
                { title: "Documentación", url: "/dashboard/teacher/docs", icon: Files, color: "text-amber-500" },
                { title: "Evaluaciones", url: "/dashboard/teacher/evaluations", icon: FileText, color: "text-purple-500" },
                { title: "Configuración", url: "/dashboard/teacher/settings", icon: Settings2, color: "text-gray-500" },
            ];
        } else {
            // Student
            return [
                { title: "Mis Cursos", url: "/dashboard/student", icon: BookOpen, color: "text-blue-500" },
                { title: "Mi Asistencia", url: "/dashboard/student/attendance", icon: CalendarClock, color: "text-green-500" },
                { title: "Actividades", url: "/dashboard/student/activities", icon: Activity, color: "text-purple-500" },
            ];
        }
    };

    const navItems = getNavigationItems();


    return (
        <div className="min-h-[calc(100vh-4rem)] h-auto -mx-2 sm:-mx-4 -mb-4 w-[calc(100%+1rem)] sm:w-[calc(100%+2rem)] rounded-none pb-12">
            <div className="relative flex flex-col w-full">
                <section className="w-full relative overflow-hidden">
                    <LampContainer className="min-h-[400px]">
                        <motion.div
                            initial={{ opacity: 0.5, y: 100 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: 0.3,
                                duration: 0.8,
                                ease: "easeInOut",
                            }}
                            className="flex flex-col items-center justify-center text-center translate-y-24"
                        >
                            <h1 className="text-slate-950 dark:text-white text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight px-4 drop-shadow-2xl">
                                {settings.institutionName || ""}
                            </h1>

                            <div className="mt-6 space-y-2 text-slate-900/90 dark:text-white/90">
                                <h2 className="text-xl md:text-2xl font-medium drop-shadow-md">
                                    ¡Hola, {mounted ? (session?.user?.name?.split(' ')[0] || 'Usuario') : 'Usuario'}!
                                </h2>
                                <p className="text-sm md:text-base opacity-90 capitalize drop-shadow-md">
                                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </motion.div>
                    </LampContainer>
                </section>

                {/* Navigation Cards */}
                <div className="w-full py-12 px-6 bg-muted/30 border-y">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-2xl font-bold mb-8 text-center">Acceso Rápido</h2>
                        <div className="flex flex-wrap justify-center gap-6">
                            {navItems.map((item, index) => (
                                <Link key={index} href={item.url} className="w-full sm:w-[280px] md:w-[320px]">
                                    <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer h-full border-primary/10">
                                        <CardHeader className="flex flex-col items-center justify-center text-center space-y-4 p-6">
                                            <div className={`p-4 rounded-full bg-background shadow-sm ${item.color}`}>
                                                <item.icon className="w-10 h-10" />
                                            </div>
                                            <CardTitle className="text-xl font-bold uppercase tracking-tight">{item.title}</CardTitle>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
