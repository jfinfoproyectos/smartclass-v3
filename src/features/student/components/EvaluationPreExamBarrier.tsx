"use client";

import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { 
    CheckCircle, Clock, AlertTriangle, MessageSquare, ShieldAlert, ShieldCheck, 
    Lightbulb, RotateCcw, ArrowRight, ArrowLeft, BellOff, Monitor, Laptop, 
    Maximize2, Keyboard, SlidersHorizontal, ExternalLink, Calendar, BellRing, 
    AlertCircle, XCircle, CheckCircle2, BookOpen 
} from "lucide-react";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { cn } from "@/lib/utils";
import { formatDurationHMS } from "@/lib/dateUtils";

export interface EvaluationPreExamBarrierProps {
    attempt: any;
    currentAttempt: any;
    questions: any[];
    themes?: any[];
    mounted: boolean;
    theme?: string;
    surveillanceEnabled: boolean;
    blockTabSwitch: boolean;
    requireFullscreen: boolean;
    blockMultipleDisplays: boolean;
    maxExitTimeSeconds: number;
    tabSwitchesCount: number;
    totalTimeAwaySeconds: number;
    hasExitTimeAlert: boolean;
    hasHelpUrl: boolean;
    maxAiHints: number;
    isMobile: boolean;
    hasMultipleScreens: boolean;
    isMaximized: boolean;
    expulsionReason: "resize" | "multi_screen" | null;
    expulsionsCount: number;
    onStart: () => void;
    onBack: () => void;
    onOpenTabSwitchesModal: () => void;
}

export function EvaluationPreExamBarrier({
    attempt,
    currentAttempt,
    questions,
    themes = [],
    mounted,
    theme,
    surveillanceEnabled,
    blockTabSwitch,
    requireFullscreen,
    blockMultipleDisplays,
    maxExitTimeSeconds,
    tabSwitchesCount,
    totalTimeAwaySeconds,
    hasExitTimeAlert,
    hasHelpUrl,
    maxAiHints,
    isMobile,
    hasMultipleScreens,
    isMaximized,
    expulsionReason,
    expulsionsCount,
    onStart,
    onBack,
    onOpenTabSwitchesModal,
}: EvaluationPreExamBarrierProps) {
    const canStart = !surveillanceEnabled || (!isMobile && (!blockMultipleDisplays || !hasMultipleScreens) && (!requireFullscreen || isMaximized));
    const startTime = currentAttempt.startTime ? new Date(currentAttempt.startTime) : null;
    const endTime = currentAttempt.endTime ? new Date(currentAttempt.endTime) : null;

    return (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto flex flex-col min-h-screen text-foreground">
            {/* Header Superior Coherente con SmartClass */}
            <header className="border-b border-border/60 bg-card/70 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-xs font-semibold h-8 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={onBack}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Volver al Curso</span>
                    </Button>
                    <div className="h-4 w-px bg-border/60 hidden sm:block" />
                    <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                        SmartClass • Módulo de Evaluaciones
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <ThemeSelector themes={themes} />
                    <ModeToggle />
                </div>
            </header>

            {/* Contenedor Principal que ocupa todo el espacio */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">

                {/* Banner de Expulsión Preventiva con Reingreso Permitido */}
                {expulsionReason && (
                    <div className="p-4 sm:p-5 rounded-2xl border-2 border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md animate-in fade-in duration-300">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                                    Expulsión Preventiva del Examen
                                    <Badge variant="destructive" className="text-[10px] font-bold">
                                        Falta #{expulsionsCount}
                                    </Badge>
                                </h3>
                                <p className="text-xs sm:text-sm text-red-800 dark:text-red-300">
                                    {expulsionReason === "resize"
                                        ? "Fuiste retirado del entorno activo porque la ventana fue desmaximizada o cambió de tamaño. Para continuar, maximiza la ventana nuevamente."
                                        : "Fuiste retirado del entorno activo porque se detectó el uso de un segundo monitor o pantalla extendida. Para continuar, desconecta la pantalla secundaria."}
                                </p>
                                <p className="text-[11px] text-red-700 dark:text-red-400 font-medium mt-1">
                                    💡 Tus respuestas y avances están guardados. Corrige la condición y presiona <strong>Reingresar a la Evaluación</strong> para continuar sin problemas.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="destructive"
                            disabled={!canStart}
                            onClick={onStart}
                            className="shrink-0 font-bold gap-2 self-stretch sm:self-auto shadow-sm cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Reingresar Ahora</span>
                        </Button>
                    </div>
                )}

                {/* Banner Hero Principal */}
                <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-xs space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2.5 max-w-4xl">
                            <div className="flex items-center gap-2 flex-wrap">
                                {surveillanceEnabled ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 text-xs font-bold gap-1 px-2.5 py-0.5 cursor-help">
                                                <ShieldAlert className="w-3.5 h-3.5" />
                                                {blockTabSwitch ? "Vigilancia Estricta" : "Vigilancia Activa"}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" align="start" className="max-w-xs sm:max-w-sm p-3.5 space-y-2 text-left bg-popover/95 backdrop-blur-md shadow-xl border-border">
                                            <div className="flex items-center gap-1.5 pb-1.5 border-b border-border/60 font-bold text-xs">
                                                <ShieldAlert className="w-4 h-4 text-primary" />
                                                <span>Medidas de Seguridad Habilitadas</span>
                                            </div>
                                            <div className="space-y-1.5 text-[11px]">
                                                <div className="flex items-center gap-1.5">
                                                    {blockTabSwitch ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    ) : (
                                                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                    )}
                                                    <span>
                                                        <strong>Pestañas:</strong> {blockTabSwitch ? `Supervisión activa (alerta > ${Math.max(1, Math.round(maxExitTimeSeconds / 60))} min)` : "Libre (sin registro de salidas ni tiempo fuera)"}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {requireFullscreen ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    ) : (
                                                        <XCircle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                                                    )}
                                                    <span>
                                                        <strong>Pantalla completa:</strong> {requireFullscreen ? "Obligatoria" : "Opcional"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {blockMultipleDisplays ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    ) : (
                                                        <XCircle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                                                    )}
                                                    <span>
                                                        <strong>Múltiples monitores:</strong> {blockMultipleDisplays ? "Bloqueados" : "Permitidos"}
                                                    </span>
                                                </div>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-xs font-bold gap-1 px-2.5 py-0.5 cursor-help">
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                Modo Libre
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" align="start" className="max-w-xs p-3 text-left">
                                            <p className="font-bold text-xs">Sin Restricciones de Vigilancia</p>
                                            <p className="text-[11px] text-muted-foreground">La prueba no impone restricciones de pantalla ni expulsiones por cambio de ventana.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}

                                {blockTabSwitch && (
                                    <Badge variant="outline" className="text-xs font-bold gap-1 px-2.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                        <ShieldAlert className="w-3.5 h-3.5" />
                                        Supervisión de Salidas Activa
                                    </Badge>
                                )}

                                {blockTabSwitch && tabSwitchesCount > 0 && (
                                    <Badge 
                                        variant="outline" 
                                        onClick={onOpenTabSwitchesModal}
                                        className={cn(
                                            "text-xs font-bold font-mono gap-1.5 px-2.5 py-0.5 cursor-pointer transition-colors shadow-2xs",
                                            hasExitTimeAlert
                                                ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40 hover:bg-red-500/25"
                                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                                        )}
                                    >
                                        {hasExitTimeAlert ? (
                                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                        ) : (
                                            <ExternalLink className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                        )}
                                        <span>{tabSwitchesCount} {tabSwitchesCount === 1 ? 'salida' : 'salidas'} ({formatDurationHMS(totalTimeAwaySeconds)} fuera)</span>
                                        {hasExitTimeAlert && <span className="text-[10px] uppercase font-black bg-red-600 text-white px-1 rounded ml-1">Límite Superado</span>}
                                    </Badge>
                                )}

                                <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
                                    {questions.length} {questions.length === 1 ? 'Pregunta' : 'Preguntas'}
                                </Badge>
                            </div>

                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                                {attempt.evaluation?.title}
                            </h1>

                            {attempt.evaluation?.description && (
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed [&_p]:text-muted-foreground [&_strong]:text-foreground [&_p]:my-1"
                                    data-color-mode={mounted && theme === "dark" ? "dark" : "light"}
                                >
                                    <MDEditor.Markdown
                                        source={attempt.evaluation.description}
                                        style={{ backgroundColor: 'transparent', fontSize: 'inherit' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tiempos de Entrega */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        {startTime && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                <span>Inicio: <strong className="text-foreground">{format(startTime, "d 'de' MMMM, p", { locale: es })}</strong></span>
                            </div>
                        )}
                        {endTime && (
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                <span>Cierre: <strong className="text-foreground">{format(endTime, "d 'de' MMMM, p", { locale: es })}</strong></span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Guardado: <strong className="text-foreground">Automático en la nube</strong></span>
                        </div>
                    </div>
                </div>

                {/* Banner Destacado si tiene alerta por exceso de tiempo fuera */}
                {blockTabSwitch && hasExitTimeAlert && (
                    <div className="p-4 sm:p-5 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 flex items-start gap-4 shadow-2xs">
                        <ShieldAlert className="w-6 h-6 shrink-0 text-red-500 mt-0.5" />
                        <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <h3 className="font-bold text-sm sm:text-base">
                                    Alerta de Seguridad: Has superado el tiempo máximo permitido fuera del examen
                                </h3>
                                <Badge variant="outline" className="font-mono text-xs font-black bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30">
                                    {Math.max(1, Math.round(totalTimeAwaySeconds / 60))} min acumulados / {Math.max(1, Math.round(maxExitTimeSeconds / 60))} min máx
                                </Badge>
                            </div>
                            <p className="text-xs leading-relaxed opacity-95">
                                Has acumulado {Math.max(1, Math.round(totalTimeAwaySeconds / 60))} min en {tabSwitchesCount} salidas a otras ventanas o pestañas, superando el límite de alerta de {Math.max(1, Math.round(maxExitTimeSeconds / 60))} min configurado por tu docente. Esta alerta ha quedado registrada ante el profesor.
                            </p>
                        </div>
                    </div>
                )}

                {/* Cuadrícula Principal de 3 Columnas utilizando todo el ancho */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Columna 1: Configuración de la Evaluación (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <Card className="flex-1 border-border/80 shadow-xs flex flex-col">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                                    <CardTitle className="text-sm font-bold">Parámetros de la Evaluación</CardTitle>
                                </div>
                                <CardDescription className="text-xs">
                                    Reglas configuradas para esta prueba
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3 flex-1 text-xs">
                                {/* Pérdida de foco */}
                                <div className={cn(
                                    "p-3 rounded-xl border flex items-start gap-3",
                                    blockTabSwitch ? "bg-amber-500/5 border-amber-500/25" : "bg-muted/40 border-border/60"
                                )}>
                                    <ShieldAlert className={cn("w-4 h-4 shrink-0 mt-0.5", blockTabSwitch ? "text-amber-500" : "text-muted-foreground")} />
                                    <div className="space-y-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-foreground">Control de Salidas y Pestañas</span>
                                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-bold", blockTabSwitch ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground")}>
                                                {blockTabSwitch ? "Supervisado" : "Libre"}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                                            {blockTabSwitch
                                                ? `Se registran salidas y tiempo fuera. Alerta activa si el acumulado supera ${Math.max(1, Math.round(maxExitTimeSeconds / 60))} min.`
                                                : "No se registra ninguna salida ni cambio de ventana."}
                                        </p>
                                    </div>
                                </div>

                                {/* Tamaño de ventana */}
                                <div className={cn(
                                    "p-3 rounded-xl border flex items-start gap-3",
                                    requireFullscreen ? "bg-amber-500/5 border-amber-500/25" : "bg-muted/40 border-border/60"
                                )}>
                                    <Maximize2 className={cn("w-4 h-4 shrink-0 mt-0.5", requireFullscreen ? "text-amber-500" : "text-muted-foreground")} />
                                    <div className="space-y-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-foreground">Ventana Maximizada</span>
                                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-bold", requireFullscreen ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground")}>
                                                {requireFullscreen ? "Obligatorio" : "Flexible"}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                                            {requireFullscreen
                                                ? "La ventana debe permanecer maximizada durante todo el examen."
                                                : "Puedes ajustar las dimensiones del navegador según tu preferencia."}
                                        </p>
                                    </div>
                                </div>

                                {/* Múltiples monitores */}
                                <div className={cn(
                                    "p-3 rounded-xl border flex items-start gap-3",
                                    blockMultipleDisplays ? "bg-blue-500/5 border-blue-500/25" : "bg-muted/40 border-border/60"
                                )}>
                                    <Monitor className={cn("w-4 h-4 shrink-0 mt-0.5", blockMultipleDisplays ? "text-blue-500" : "text-muted-foreground")} />
                                    <div className="space-y-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-foreground">Pantallas Conectadas</span>
                                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-bold", blockMultipleDisplays ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" : "bg-muted text-muted-foreground")}>
                                                {blockMultipleDisplays ? "1 Monitor" : "Múltiples"}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                                            {blockMultipleDisplays
                                                ? "Solo se permite una pantalla conectada al equipo."
                                                : "Puedes usar pantallas secundarias o externas."}
                                        </p>
                                    </div>
                                </div>

                                {/* Material de ayuda y comodines */}
                                {hasHelpUrl && (
                                    <div className="p-3 rounded-xl border bg-primary/5 border-primary/25 flex items-start gap-3">
                                        <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                                        <div className="space-y-0.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-foreground">Material de Consulta</span>
                                                <Badge className="bg-primary/15 text-primary text-[10px] px-1.5 py-0">Permitido</Badge>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                El profesor habilitó material de apoyo. Puedes consultarlo dentro del examen sin penalización.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {maxAiHints > 0 && (
                                    <div className="p-3 rounded-xl border bg-amber-500/5 border-amber-500/25 flex items-start gap-3">
                                        <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                                        <div className="space-y-0.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-foreground">Pistas con IA</span>
                                                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0 font-bold">{maxAiHints} Pistas</Badge>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                Dispones de {maxAiHints} consultas conceptuales asistidas por IA para desbloquearte.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna 2: Sugerencias Cruciales Anti-Interrupción (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        <Card className="flex-1 border-border/80 shadow-xs flex flex-col">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <BellOff className="w-4 h-4 text-red-500" />
                                        <CardTitle className="text-sm font-bold">Guía Anti-Interrupciones</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-bold text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10">
                                        Importante
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Evita que notificaciones del sistema o aplicaciones externas acumulen tiempo fuera
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3.5 flex-1 text-xs">
                                {/* Sugerencia 1: Notificaciones del Sistema Operativo */}
                                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1.5">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span>1. Desactiva las Notificaciones del Sistema Operativo</span>
                                    </div>
                                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                                        Un cartel emergente de correo, calendario o antivirus roba el foco de la ventana activa del navegador.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                                        <div className="p-2 rounded-lg bg-background border border-border/60">
                                            <span className="font-bold text-primary block mb-0.5">En Windows:</span>
                                            <span className="text-muted-foreground">Presiona <strong>Win + N</strong> y activa el modo <strong>No molestar</strong> o Asistente de concentración.</span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-background border border-border/60">
                                            <span className="font-bold text-primary block mb-0.5">En macOS:</span>
                                            <span className="text-muted-foreground">Abre el <strong>Centro de Control</strong> arriba a la derecha y activa <strong>No molestar (Focus)</strong>.</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sugerencia 2: Apps en segundo plano */}
                                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1.5">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
                                        <span>2. Cierra Mensajería y Apps en Segundo Plano</span>
                                    </div>
                                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                                        Cierra completamente <strong>WhatsApp, Telegram, Discord, Teams, Slack, Outlook o Skype</strong>. Una llamada entrante o mensaje con notificación flotante desenfoca el navegador y acumula tiempo fuera no deseado.
                                    </p>
                                </div>

                                {/* Sugerencia 3: Atajos de teclado */}
                                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1.5">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <Keyboard className="w-4 h-4 text-purple-500 shrink-0" />
                                        <span>3. Evita Atajos de Teclado del Sistema</span>
                                    </div>
                                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                                        No presiones <strong>Alt + Tab</strong>, la tecla <strong>Windows / Command</strong>, ni combinaciones como <strong>Ctrl + Esc</strong> o <strong>Win + D</strong> que abran el menú de inicio o la barra de tareas.
                                    </p>
                                </div>

                                {/* Sugerencia 4: Gestos del touchpad */}
                                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1.5">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <Laptop className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span>4. Cuidado con Gestos en Computadores Portátiles</span>
                                    </div>
                                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                                        Si usas laptop, evita deslizar con 3 o 4 dedos en el touchpad para no alternar de escritorio virtual ni minimizar la pantalla sin querer.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna 3: Estado de tus Requisitos (3 cols) */}
                    <div className="lg:col-span-3 flex flex-col gap-4">
                        <Card className="flex-1 border-border/80 shadow-xs flex flex-col">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    <CardTitle className="text-sm font-bold">Verificación en Vivo</CardTitle>
                                </div>
                                <CardDescription className="text-xs">
                                    Estado de tu equipo y navegador
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3 flex-1 text-xs">
                                {/* Dispositivo compatible */}
                                <div className={cn(
                                    "p-2.5 rounded-xl border flex items-center justify-between gap-2",
                                    !isMobile ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-300"
                                )}>
                                    <div className="flex items-center gap-2">
                                        <Laptop className="w-4 h-4 shrink-0" />
                                        <span className="font-semibold">Dispositivo</span>
                                    </div>
                                    <span className="font-bold text-[11px]">
                                        {!isMobile ? "Compatible ✓" : "Móvil detectado ✕"}
                                    </span>
                                </div>

                                {/* Pantalla única */}
                                {blockMultipleDisplays && (
                                    <div className={cn(
                                        "p-2.5 rounded-xl border flex items-center justify-between gap-2",
                                        !hasMultipleScreens ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-300"
                                    )}>
                                        <div className="flex items-center gap-2">
                                            <Monitor className="w-4 h-4 shrink-0" />
                                            <span className="font-semibold">Monitores</span>
                                        </div>
                                        <span className="font-bold text-[11px]">
                                            {!hasMultipleScreens ? "1 Monitor ✓" : "Desconecta el 2do ✕"}
                                        </span>
                                    </div>
                                )}

                                {/* Ventana maximizada */}
                                {requireFullscreen && (
                                    <div className={cn(
                                        "p-2.5 rounded-xl border flex items-center justify-between gap-2",
                                        isMaximized ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300"
                                    )}>
                                        <div className="flex items-center gap-2">
                                            <Maximize2 className="w-4 h-4 shrink-0" />
                                            <span className="font-semibold">Ventana</span>
                                        </div>
                                        <span className="font-bold text-[11px]">
                                            {isMaximized ? "Maximizada ✓" : "Maximizar ⚠️"}
                                        </span>
                                    </div>
                                )}

                                {/* Conexión */}
                                <div className="p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        <span className="font-semibold">Conexión</span>
                                    </div>
                                    <span className="font-bold text-[11px]">En línea ✓</span>
                                </div>

                                {/* Estado global */}
                                <div className={cn(
                                    "p-3 rounded-xl border mt-2 text-center",
                                    canStart 
                                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" 
                                        : "bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300"
                                )}>
                                    <p className="font-bold text-xs">
                                        {canStart ? "Entorno Validado ✓" : "Requisitos Incompletos"}
                                    </p>
                                    <p className="text-[10px] opacity-80 mt-0.5">
                                        {canStart ? "Puedes comenzar la evaluación" : "Ajusta tu entorno para continuar"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>

            </main>

            {/* Footer Barra de Acción Pegajosa Inferior */}
            <footer className="border-t border-border/70 bg-card/95 backdrop-blur sticky bottom-0 z-30 p-4 px-4 sm:px-8 shadow-lg">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs">
                        {canStart ? (
                            expulsionReason ? (
                                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                                    <AlertTriangle className="w-4 h-4" />
                                    Condición de seguridad corregida. Haz clic en &quot;Reingresar a la Evaluación&quot; para reanudar.
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Todos los requisitos cumplidos. Estás listo para comenzar.
                                </span>
                            )
                        ) : (
                            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                                <AlertTriangle className="w-4 h-4" />
                                Por favor cumple los requisitos de la columna de verificación para poder {expulsionReason ? "reingresar" : "comenzar"}.
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            className="flex-1 sm:flex-none text-xs font-semibold h-10 cursor-pointer"
                            onClick={onBack}
                        >
                            Volver al Curso
                        </Button>
                        <Button
                            size="lg"
                            className="flex-1 sm:flex-none font-bold text-sm h-10 cursor-pointer gap-2 shadow-sm"
                            disabled={!canStart}
                            onClick={onStart}
                        >
                            {canStart ? (
                                expulsionReason ? (
                                    <>
                                        <RotateCcw className="w-4 h-4" />
                                        <span>Reingresar a la Evaluación</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Acepto las normas — Comenzar Evaluación</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )
                            ) : (
                                <span>Requisitos pendientes para {expulsionReason ? "reingresar" : "iniciar"}</span>
                            )}
                        </Button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
