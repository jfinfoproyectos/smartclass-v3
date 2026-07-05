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
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/5">
                <FolderTree className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold">Sin estructura de notas</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                    El profesor aún no ha configurado las categorías de calificación para este curso.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header / Summary Card */}
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-primary/10 via-background to-background ring-1 ring-primary/5">
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-3 text-center md:text-left">
                            <h3 className="text-4xl font-black tracking-tight text-primary/90">Tu Nota Final</h3>
                            <p className="text-muted-foreground text-lg">
                                Promedio ponderado basado en <span className="font-bold text-foreground">{gradeCategories.length} categorías</span> principales.
                            </p>
                            <div className="flex items-center gap-2 justify-center md:justify-start mt-6">
                                <Badge variant="secondary" className="px-4 py-1.5 text-xs font-bold bg-primary/10 text-primary border-primary/20">
                                    Escala 0.0 - 5.0
                                </Badge>
                            </div>
                        </div>
                        
                        <div className="relative flex items-center justify-center h-40 w-40 rounded-full border-[12px] border-primary/5 shadow-2xl bg-card">
                            <div className="text-center">
                                <span className={`text-5xl font-black ${getGradeColor(finalGrade)} tabular-nums`}>
                                    {finalGrade.toFixed(2)}
                                </span>
                            </div>
                            <div className="absolute -bottom-4">
                                <Badge className={`${getGradeBadgeVariant(finalGrade)} px-6 py-1.5 text-sm font-black shadow-lg uppercase tracking-wider`}>
                                    {finalGrade >= 3.0 ? "Aprobando" : finalGrade > 0 ? "Reprobando" : "Sin Notas"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Summary Grid - Adaptive Layout */}
            <div className="flex flex-wrap gap-4">
                {gradeCategories.map((cat: any) => {
                    const catGrade = calculateGradeInCategory(cat);
                    return (
                        <Card key={`summary-${cat.id}`} className="flex-1 min-w-[280px] border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-primary/5 hover:shadow-md transition-all duration-300 group overflow-hidden">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="bg-primary/10 p-1.5 rounded-lg shrink-0">
                                            <FolderTree className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">
                                                {cat.name}
                                            </span>
                                            <span className="text-[9px] text-primary font-bold opacity-60">
                                                Peso: {cat.weight}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`text-2xl font-black tabular-nums ${getGradeColor(catGrade)}`}>
                                        {catGrade.toFixed(2)}
                                    </div>
                                </div>

                                <div className="grid gap-1.5 pt-1 border-t border-primary/5">
                                    {cat.groups.map((group: any) => {
                                        const groupGrade = calculateGradeInGroup(group);
                                        return (
                                            <div key={`sum-group-${group.id}`} className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <div className="h-1 w-1 rounded-full bg-primary/30" />
                                                    <span className="text-[10px] font-bold text-foreground/70 truncate uppercase">
                                                        {group.name}
                                                    </span>
                                                    <span className="text-[8px] text-muted-foreground font-medium">
                                                        ({group.weight}%)
                                                    </span>
                                                </div>
                                                <div className={`text-[10px] font-black tabular-nums ${getGradeColor(groupGrade)}`}>
                                                    {groupGrade.toFixed(2)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                            <div className="h-0.5 w-full bg-primary/5">
                                <Progress value={(catGrade / 5) * 100} className="h-full rounded-none opacity-20" />
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Categories Breakdown */}
            <div className="space-y-6">
                <h3 className="text-2xl font-black flex items-center gap-3 px-1 text-foreground/80">
                    <Layers className="h-6 w-6 text-primary" />
                    Desglose de Categorías
                </h3>
                
                <div className="grid gap-6">
                    {gradeCategories.map((cat: any) => {
                        const catGrade = calculateGradeInCategory(cat);
                        return (
                            <Card key={cat.id} className="border-none shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
                                <CardHeader className="bg-muted/30 border-b pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 p-2 rounded-lg">
                                                <FolderTree className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-bold">{cat.name}</CardTitle>
                                                <CardDescription className="text-xs font-bold text-primary/70 uppercase tracking-tighter">
                                                    Peso en Curso: {cat.weight}%
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-2xl font-black ${getGradeColor(catGrade)}`}>
                                                {catGrade.toFixed(2)}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold">Nota de Categoría</div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Accordion type="single" collapsible className="w-full">
                                        {cat.groups.map((group: any) => {
                                            const groupGrade = calculateGradeInGroup(group);
                                            return (
                                                <AccordionItem key={group.id} value={group.id} className="border-b last:border-0 px-6">
                                                    <AccordionTrigger className="hover:no-underline py-5 group">
                                                        <div className="flex items-center justify-between w-full pr-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex flex-col items-start gap-1">
                                                                    <span className="font-bold text-base group-hover:text-primary transition-colors">{group.name}</span>
                                                                    <Badge variant="outline" className="text-[9px] font-bold opacity-70">
                                                                        Peso en {cat.name}: {group.weight}%
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <div className="hidden sm:flex flex-col items-end gap-1.5 min-w-[120px]">
                                                                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                        <Progress value={(groupGrade / 5) * 100} className="h-full" />
                                                                    </div>
                                                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                                                        Progreso: {((groupGrade / 5) * 100).toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                                <span className={`font-black text-xl tabular-nums ${getGradeColor(groupGrade)}`}>
                                                                    {groupGrade.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pb-6 pt-2">
                                                        <div className="space-y-4 bg-muted/20 rounded-2xl p-4 border border-muted">
                                                            <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2 mb-2">
                                                                <div className="h-px flex-1 bg-muted-foreground/20" />
                                                                Items ({group.items?.length || 0})
                                                                <div className="h-px flex-1 bg-muted-foreground/20" />
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
                                                                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-background border border-muted hover:border-primary/30 hover:shadow-sm transition-all">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-muted/50 text-muted-foreground border border-muted'}`}>
                                                                                    {item.activityId ? <FileText className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                                                                                </div>
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-sm font-bold">{itemTitle}</span>
                                                                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                                                                                        Peso en Grupo: {item.weight}%
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex flex-col items-end gap-0.5">
                                                                                <span className={`font-black text-sm tabular-nums ${getGradeColor(itemGrade)}`}>
                                                                                    {isCompleted ? itemGrade.toFixed(2) : "--"}
                                                                                </span>
                                                                                {isCompleted ? (
                                                                                    <Badge variant="outline" className="h-4 text-[8px] bg-emerald-50 text-emerald-700 border-emerald-200 uppercase font-black px-1.5">
                                                                                        Calificado
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge variant="outline" className="h-4 text-[8px] bg-muted text-muted-foreground uppercase font-black px-1.5">
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
