"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    GraduationCap, 
    ChevronRight, 
    BookOpen, 
    FileText, 
    CheckCircle2, 
    AlertCircle,
    Info,
    FolderTree,
    Layers
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { TabEmptyState } from "@/components/ui/tab-empty-state";

interface StudentGradesViewProps {
    enrollment: any;
}

export function StudentGradesView({ enrollment }: StudentGradesViewProps) {
    const { course } = enrollment;
    const { activities, evaluationAttempts, gradeCategories } = course;

    // --- Calculations ---
    const calculateGradeInGroup = (group: any) => {
        if (!group.items || group.items.length === 0) return 0;
        
        let totalWeightedGrade = 0;
        let totalWeight = 0;

        group.items.forEach((item: any) => {
            let grade = 0;
            if (item.activityId) {
                const activity = activities.find((a: any) => a.id === item.activityId);
                const submission = activity?.submissions[0];
                grade = submission?.grade || 0;
            } else if (item.evaluationAttemptId) {
                const attempt = evaluationAttempts.find((e: any) => e.id === item.evaluationAttemptId);
                const submission = attempt?.submissions[0];
                grade = submission?.score || 0; // Already in 0-5.0 scale
            }
            
            totalWeightedGrade += grade * item.weight;
            totalWeight += item.weight;
        });

        return totalWeight > 0 ? totalWeightedGrade / totalWeight : 0;
    };

    const calculateGradeInCategory = (category: any) => {
        if (!category.groups || category.groups.length === 0) return 0;

        let totalWeightedGrade = 0;
        let totalWeight = 0;

        category.groups.forEach((group: any) => {
            const groupGrade = calculateGradeInGroup(group);
            totalWeightedGrade += groupGrade * group.weight;
            totalWeight += group.weight;
        });

        return totalWeight > 0 ? totalWeightedGrade / totalWeight : 0;
    };

    const finalGrade = useMemo(() => {
        let total = 0;
        let totalCategoryWeight = 0;

        (gradeCategories || []).forEach((cat: any) => {
            const catGrade = calculateGradeInCategory(cat);
            total += catGrade * cat.weight;
            totalCategoryWeight += cat.weight;
        });

        return totalCategoryWeight > 0 ? total / totalCategoryWeight : 0;
    }, [gradeCategories, activities, evaluationAttempts]);

    const getGradeColor = (grade: number) => {
        if (grade >= 4.0) return "text-green-600 dark:text-green-400";
        if (grade >= 3.0) return "text-blue-600 dark:text-blue-400";
        if (grade > 0) return "text-rose-500 dark:text-rose-400";
        return "text-muted-foreground";
    };

    const getGradeBadgeVariant = (grade: number) => {
        if (grade >= 3.0) return "default";
        return "destructive";
    };

    if (!gradeCategories || gradeCategories.length === 0) {
        return (
            <TabEmptyState
                icon={FolderTree}
                title="Sin estructura de notas configurada"
                description="El profesor aún no ha configurado las categorías ni ponderaciones de calificación para este curso."
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header / Summary Card */}
            <Card className="overflow-hidden border border-border/60 shadow-md bg-gradient-to-br from-primary/10 via-background to-background">
                <CardContent className="p-6 sm:p-7">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2 text-center md:text-left">
                            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Tu Nota Final</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                                Promedio ponderado acumulado basado en <span className="font-semibold text-foreground">{gradeCategories.length} categorías</span> principales.
                            </p>
                            <div className="flex items-center gap-2 justify-center md:justify-start pt-2">
                                <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-primary/20 rounded-full">
                                    Escala 0.0 - 5.0
                                </Badge>
                            </div>
                        </div>
                        
                        <div className="relative flex items-center justify-center h-28 w-28 sm:h-32 sm:w-32 rounded-full border-8 border-primary/10 shadow-lg bg-card shrink-0">
                            <div className="text-center">
                                <span className={`text-3xl sm:text-4xl font-black ${getGradeColor(finalGrade)} tabular-nums font-mono`}>
                                    {finalGrade.toFixed(2)}
                                </span>
                            </div>
                            <div className="absolute -bottom-3">
                                <Badge className={`${getGradeBadgeVariant(finalGrade)} px-3 py-0.5 text-xs font-bold shadow-md rounded-full tracking-wide`}>
                                    {finalGrade >= 3.0 ? "Aprobando" : finalGrade > 0 ? "Reprobando" : "Sin Notas"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Summary Grid - Adaptive Layout */}
            <div className="flex flex-wrap gap-3.5">
                {gradeCategories.map((cat: any) => {
                    const catGrade = calculateGradeInCategory(cat);
                    return (
                        <Card key={`summary-${cat.id}`} className="flex-1 min-w-[240px] border border-border/60 shadow-2xs bg-card hover:border-primary/40 transition-all duration-200 group overflow-hidden rounded-2xl">
                            <CardContent className="p-4 space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <FolderTree className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-foreground truncate">
                                                {cat.name}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground font-medium">
                                                Peso: {cat.weight}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`text-lg sm:text-xl font-bold font-mono tabular-nums shrink-0 ${getGradeColor(catGrade)}`}>
                                        {catGrade.toFixed(2)}
                                    </div>
                                </div>

                                <div className="grid gap-1 pt-1.5 border-t border-border/40">
                                    {cat.groups.map((group: any) => {
                                        const groupGrade = calculateGradeInGroup(group);
                                        return (
                                            <div key={`sum-group-${group.id}`} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                                                    <span className="text-xs font-medium text-foreground/80 truncate">
                                                        {group.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        ({group.weight}%)
                                                    </span>
                                                </div>
                                                <div className={`text-xs font-bold font-mono tabular-nums shrink-0 ${getGradeColor(groupGrade)}`}>
                                                    {groupGrade.toFixed(2)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                            <div className="h-1 w-full bg-muted">
                                <Progress value={(catGrade / 5) * 100} className="h-full rounded-none" />
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Categories Breakdown */}
            <div className="space-y-4 pt-2">
                <h4 className="text-base sm:text-lg font-semibold flex items-center gap-2 text-foreground">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>Desglose de Categorías</span>
                </h4>
                
                <div className="grid gap-4">
                    {gradeCategories.map((cat: any) => {
                        const catGrade = calculateGradeInCategory(cat);
                        return (
                            <Card key={cat.id} className="border border-border/60 shadow-sm overflow-hidden bg-card rounded-2xl">
                                <CardHeader className="bg-muted/30 border-b border-border/40 py-3.5 px-4 sm:px-6">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                <FolderTree className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <CardTitle className="text-sm sm:text-base font-bold text-foreground truncate">{cat.name}</CardTitle>
                                                <CardDescription className="text-xs font-medium text-muted-foreground">
                                                    Peso en Curso: {cat.weight}%
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${getGradeColor(catGrade)}`}>
                                                {catGrade.toFixed(2)}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground font-medium">Nota Categoría</div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Accordion type="single" collapsible className="w-full">
                                        {cat.groups.map((group: any) => {
                                            const groupGrade = calculateGradeInGroup(group);
                                            return (
                                                <AccordionItem key={group.id} value={group.id} className="border-b last:border-0 px-4 sm:px-6">
                                                    <AccordionTrigger className="hover:no-underline py-3.5 group">
                                                        <div className="flex items-center justify-between w-full pr-3 gap-3">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="flex flex-col items-start gap-0.5 min-w-0">
                                                                    <span className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">{group.name}</span>
                                                                    <Badge variant="outline" className="text-[10px] font-medium px-2 py-0">
                                                                        Peso en {cat.name}: {group.weight}%
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 shrink-0">
                                                                <div className="hidden sm:flex flex-col items-end gap-1 min-w-[100px]">
                                                                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                        <Progress value={(groupGrade / 5) * 100} className="h-full" />
                                                                    </div>
                                                                    <span className="text-[11px] text-muted-foreground font-medium">
                                                                        Progreso: {((groupGrade / 5) * 100).toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                                <span className={`font-bold text-sm sm:text-base font-mono tabular-nums ${getGradeColor(groupGrade)}`}>
                                                                    {groupGrade.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pb-4 pt-1">
                                                        <div className="space-y-3 bg-muted/20 rounded-xl p-3.5 border border-border/40">
                                                            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2 mb-1.5">
                                                                <div className="h-px flex-1 bg-border/40" />
                                                                <span>Items ({group.items?.length || 0})</span>
                                                                <div className="h-px flex-1 bg-border/40" />
                                                            </div>
                                                            
                                                            <div className="grid gap-2">
                                                                {group.items?.map((item: any) => {
                                                                    let itemTitle = "";
                                                                    let itemGrade = 0;
                                                                    let isCompleted = false;

                                                                    if (item.activityId) {
                                                                        const activity = activities.find((a: any) => a.id === item.activityId);
                                                                        itemTitle = activity?.title || "Actividad";
                                                                        const submission = activity?.submissions[0];
                                                                        itemGrade = submission?.grade || 0;
                                                                        isCompleted = !!submission?.grade;
                                                                    } else if (item.evaluationAttemptId) {
                                                                        const attempt = evaluationAttempts.find((e: any) => e.id === item.evaluationAttemptId);
                                                                        itemTitle = attempt?.evaluation?.title || "Evaluación";
                                                                        const submission = attempt?.submissions[0];
                                                                        itemGrade = submission?.score || 0;
                                                                        isCompleted = submission?.score !== null && submission?.score !== undefined;
                                                                    }

                                                                    return (
                                                                        <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all gap-3">
                                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border/40'}`}>
                                                                                    {item.activityId ? <FileText className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
                                                                                </div>
                                                                                <div className="flex flex-col min-w-0">
                                                                                    <span className="text-xs sm:text-sm font-semibold text-foreground truncate">{itemTitle}</span>
                                                                                    <span className="text-[11px] text-muted-foreground font-medium">
                                                                                        Peso en Grupo: {item.weight}%
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                                                <span className={`font-bold font-mono text-xs sm:text-sm tabular-nums ${getGradeColor(itemGrade)}`}>
                                                                                    {isCompleted ? itemGrade.toFixed(2) : "--"}
                                                                                </span>
                                                                                {isCompleted ? (
                                                                                    <Badge className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0">
                                                                                        Calificado
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0">
                                                                                        Pendiente
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            );
                                        })}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
