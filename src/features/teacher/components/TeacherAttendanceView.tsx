"use client";

import React from "react";
import { CalendarClock, CheckCircle2, AlertCircle, QrCode } from "lucide-react";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardContainer } from "@/components/ui/dashboard-container";

export function TeacherAttendanceView() {
    const attendanceStats = [
        {
            title: "Puntualidad Promedio",
            description: "Registro acumulado de la semana",
            value: "94.2%",
            icon: CheckCircle2,
            badge: "Estadística",
            badgeColor: "bg-primary/10 text-primary border-primary/20",
            accentColor: "from-primary/30 via-primary/15 to-transparent",
            iconBgColor: "bg-primary/10",
            iconTextColor: "text-primary",
        },
        {
            title: "Asistencias Registradas",
            description: "Sesiones completadas este mes",
            value: "48 Sesiones",
            icon: CalendarClock,
            badge: "Historial",
            badgeColor: "bg-primary/10 text-primary border-primary/20",
            accentColor: "from-primary/30 via-primary/15 to-transparent",
            iconBgColor: "bg-primary/10",
            iconTextColor: "text-primary",
        },
        {
            title: "Justificantes Pendientes",
            description: "Solicitudes de ausencia por revisar",
            value: "3 Pendientes",
            icon: AlertCircle,
            badge: "Revisión",
            badgeColor: "bg-primary/10 text-primary border-primary/20",
            accentColor: "from-primary/30 via-primary/15 to-transparent",
            iconBgColor: "bg-primary/10",
            iconTextColor: "text-primary",
        },
    ];

    return (
        <DashboardContainer>
            {/* Header Banner AI Canvas */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-900/90 text-white p-6 sm:p-8 shadow-xl">
                <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70" />
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 backdrop-blur-md">
                            <CalendarClock className="w-3.5 h-3.5" />
                            <span>Módulo de Asistencia</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                            Control de Asistencias & QR
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400">
                            Registra el ingreso de tus estudiantes en tiempo real mediante códigos QR o toma directa por lista.
                        </p>
                    </div>

                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-lg border-none" asChild>
                        <Link href="/dashboard/teacher">
                            <QrCode className="w-4 h-4 mr-1.5" />
                            Ir a Mis Cursos
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {attendanceStats.map((stat, idx) => (
                    <AICanvasCard
                        key={idx}
                        title={stat.title}
                        description={stat.description}
                        icon={stat.icon}
                        badge={stat.badge}
                        badgeColor={stat.badgeColor}
                        accentColor={stat.accentColor}
                        iconBgColor={stat.iconBgColor}
                        iconTextColor={stat.iconTextColor}
                        className="h-full"
                    >
                        <div className="pt-2">
                            <div className="text-3xl font-black tracking-tight text-foreground">
                                {stat.value}
                            </div>
                        </div>
                    </AICanvasCard>
                ))}
            </div>

            {/* Main Action Section */}
            <Card className="overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-card shadow-sm rounded-2xl p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
                    <QrCode className="w-8 h-8" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                    <h3 className="text-xl font-bold text-foreground">Toma de Asistencia por Curso</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Para generar el código QR o registrar la asistencia de tus estudiantes, ingresa al panel de tu curso y selecciona la opción "Tomar Asistencia".
                    </p>
                </div>
                <div className="pt-4">
                    <Button size="default" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6 shadow-md" asChild>
                        <Link href="/dashboard/teacher">Seleccionar Curso &rarr;</Link>
                    </Button>
                </div>
            </Card>
        </DashboardContainer>
    );
}
