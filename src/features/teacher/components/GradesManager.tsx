"use client";

import { useState, useMemo, useRef } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Plus, 
    Trash2, 
    Pencil,
    Settings, 
    GraduationCap, 
    LayoutGrid, 
    CheckCircle2, 
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Search,
    FolderTree,
    FileSpreadsheet,
    FileText
} from "lucide-react";
import { 
    createGradeCategoryAction,
    updateGradeCategoryAction,
    deleteGradeCategoryAction,
    createGradeGroupAction, 
    updateGradeGroupAction, 
    deleteGradeGroupAction,
    addGradeGroupItemAction,
    removeGradeGroupItemAction,
    updateGradeGroupItemAction
} from "@/app/actions/grade-actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useReactToPrint } from "react-to-print";
import { formatName } from "@/lib/utils";
import { 
    calculateStudentGradeInGroup as calcGroup, 
    calculateStudentGradeInCategory as calcCat, 
    calculateFinalGrade as calcFinal 
} from "@/lib/gradeUtils";

interface GradesManagerProps {
    courseId: string;
    courseTitle?: string;
    initialData: any;
}

export function GradesManager({ courseId, courseTitle = "Curso", initialData }: GradesManagerProps) {
    const [data, setData] = useState(initialData);
    const [activeTab, setActiveTab] = useState("view");
    const [searchTerm, setSearchTerm] = useState("");
    const printRef = useRef<HTMLDivElement>(null);

    // --- State for Dialogs ---
    const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
    const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);

    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [selectedCategoryForGroup, setSelectedCategoryForGroup] = useState<any>(null);

    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);

    const [isEditItemOpen, setIsEditItemOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    // --- Derived Data ---
    const students = useMemo(() => {
        if (!searchTerm) return data.students;
        return data.students.filter((s: any) => 
            formatName(s.name, s.profile).toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.profile?.identificacion?.includes(searchTerm)
        );
    }, [data.students, searchTerm]);

    const categories = data.categories || [];
    const activities = data.activities || [];
    const evaluations = data.evaluations || [];

    const assignedActivityIds = new Set<string>();
    const assignedEvaluationIds = new Set<string>();

    categories.forEach((cat: any) => {
        cat.groups?.forEach((group: any) => {
            group.items?.forEach((item: any) => {
                if (item.activityId) assignedActivityIds.add(item.activityId);
                if (item.evaluationAttemptId) assignedEvaluationIds.add(item.evaluationAttemptId);
            });
        });
    });

    const availableActivities = activities.filter((a: any) => !assignedActivityIds.has(a.id));
    const availableEvaluations = evaluations.filter((e: any) => !assignedEvaluationIds.has(e.id));

    // --- Calculations using unified utility ---
    const calculateStudentGradeInGroup = (studentId: string, group: any) => {
        return calcGroup(studentId, group, activities, evaluations).grade;
    };

    const calculateStudentGradeInCategory = (studentId: string, category: any) => {
        return calcCat(studentId, category, activities, evaluations).grade;
    };

    const calculateFinalGrade = (studentId: string) => {
        return calcFinal(studentId, categories, activities, evaluations).finalGrade;
    };

    // --- Export Actions ---
    const handlePrintPDF = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Calificaciones_${courseTitle.replace(/\s+/g, '_')}`,
        pageStyle: `
            @page { size: landscape; margin: 15mm; }
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
                .print-header { display: block !important; margin-bottom: 20px; text-align: center; }
                .print-header h1 { font-size: 24px; font-weight: bold; margin: 0 0 5px 0; color: #0f172a; }
                .print-header p { font-size: 14px; margin: 0; color: #64748b; }
                table { border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0; }
                th, td { border: 1px solid #e2e8f0; padding: 6px; }
            }
        `
    });

    const handleExportExcel = async () => {
        try {
            toast.loading("Generando reporte Excel...", { id: "excel-export" });
            const { getCourseGradesReportAction } = await import("@/features/teacher/actions/reportActions");
            const { exportHierarchicalGradesToExcel } = await import("@/lib/export-utils");

            const data = await getCourseGradesReportAction(courseId);
            await exportHierarchicalGradesToExcel(data, `Reporte_Notas_${new Date().toISOString().split('T')[0]}`, "Notas");
            toast.success("Reporte generado exitosamente", { id: "excel-export" });
        } catch (error) {
            console.error(error);
            toast.error("Error al generar el reporte", { id: "excel-export" });
        }
    };

    // --- Actions (Categories) ---
    const handleCreateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.append("courseId", courseId);
        
        try {
            const newCategory = await createGradeCategoryAction(formData);
            setData((prev: any) => ({
                ...prev,
                categories: [...prev.categories, { ...newCategory, groups: [] }]
            }));
            setIsCreateCategoryOpen(false);
            toast.success("Categoría creada");
        } catch (error) {
            toast.error("Error al crear la categoría");
        }
    };

    const handleUpdateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.append("courseId", courseId);
        formData.append("id", editingCategory.id);
        
        try {
            const updated = await updateGradeCategoryAction(formData);
            setData((prev: any) => ({
                ...prev,
                categories: prev.categories.map((c: any) => c.id === updated.id ? { ...c, ...updated } : c)
            }));
            setIsEditCategoryOpen(false);
            toast.success("Categoría actualizada");
        } catch (error) {
            toast.error("Error al actualizar la categoría");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("¿Eliminar categoría? Se borrarán todos sus grupos internos.")) return;
        const formData = new FormData();
        formData.append("id", id);
        formData.append("courseId", courseId);
        try {
            await deleteGradeCategoryAction(formData);
            setData((prev: any) => ({
                ...prev,
                categories: prev.categories.filter((c: any) => c.id !== id)
            }));
            toast.success("Categoría eliminada");
        } catch (error) {
            toast.error("Error al eliminar la categoría");
        }
    };

    // --- Actions (Groups) ---
    const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.append("courseId", courseId);
        if (selectedCategoryForGroup) {
            formData.append("categoryId", selectedCategoryForGroup.id);
        }
        
        try {
            const newGroup = await createGradeGroupAction(formData);
            setData((prev: any) => ({
                ...prev,
                categories: prev.categories.map((c: any) => 
                    c.id === selectedCategoryForGroup?.id 
                    ? { ...c, groups: [...c.groups, { ...newGroup, items: [] }] } 
                    : c
                )
            }));
            setIsCreateGroupOpen(false);
            toast.success("Grupo creado");
        } catch (error) {
            toast.error("Error al crear el grupo");
        }
    };

    const handleUpdateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.append("courseId", courseId);
        formData.append("id", editingGroup.id);
        
        try {
            const updated = await updateGradeGroupAction(formData);
            setData((prev: any) => ({
                ...prev,
                categories: prev.categories.map((c: any) => ({
                    ...c,
                    groups: c.groups.map((g: any) => g.id === updated.id ? { ...g, ...updated } : g)
                }))
            }));
            setIsEditGroupOpen(false);
            toast.success("Grupo actualizado");
        } catch (error) {
            toast.error("Error al actualizar el grupo");
        }
    };

    const handleDeleteGroup = async (groupId: string, categoryId: string) => {
        if (!confirm("¿Eliminar grupo?")) return;
        const formData = new FormData();
        formData.append("id", groupId);
        formData.append("courseId", courseId);
        try {
            await deleteGradeGroupAction(formData);
            setData((prev: any) => ({
                ...prev,
                categories: prev.categories.map((c: any) => 
                    c.id === categoryId 
                    ? { ...c, groups: c.groups.filter((g: any) => g.id !== groupId) } 
                    : c
                )
            }));
            toast.success("Grupo eliminado");
        } catch (error) {
            toast.error("Error al eliminar el grupo");
        }
    };

    // --- Actions (Items) ---
    const handleAddItemToGroup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.append("groupId", selectedGroup.id);
        formData.append("courseId", courseId);

        try {
            const newItem = await addGradeGroupItemAction(formData);
            const enrichedItem = {
                ...newItem,
                activity: activities.find((a: any) => a.id === newItem.activityId),
                evaluationAttempt: evaluations.find((e: any) => e.id === newItem.evaluationAttemptId)
            };

            setData((prev: any) => ({
                ...prev,
                categories: prev.categories.map((c: any) => ({
                    ...c,
                    groups: c.groups.map((g: any) => 
                        g.id === selectedGroup.id 
                        ? { ...g, items: [...g.items, enrichedItem] } 
                        : g
                    )
                }))
            }));
            setIsAddItemOpen(false);
            toast.success("Ítem añadido");
        } catch (error) {
            toast.error("Error al añadir ítem");
        }
    };

    const handleRemoveItem = async (itemId: string, groupId: string) => {
        const formData = new FormData();
        formData.append("itemId", itemId);
        formData.append("courseId", courseId);
        try {
            await removeGradeGroupItemAction(formData);
            setData((prev: any) => ({
                ...prev,
                categories: prev.categories.map((c: any) => ({
                    ...c,
                    groups: c.groups.map((g: any) => 
                        g.id === groupId 
                        ? { ...g, items: g.items.filter((i: any) => i.id !== itemId) } 
                        : g
                    )
                }))
            }));
            toast.success("Ítem removido");
        } catch (error) {
            toast.error("Error al remover ítem");
        }
    };

    const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.append("courseId", courseId);
        formData.append("itemId", editingItem.id);
        
        try {
            await updateGradeGroupItemAction(formData);
            const newWeight = parseFloat(formData.get("weight") as string);

            setData((prev: any) => ({
                ...prev,
                categories: prev.categories.map((c: any) => ({
                    ...c,
                    groups: c.groups.map((g: any) => ({
                        ...g,
                        items: (g.items || []).map((i: any) => 
                            i.id === editingItem.id ? { ...i, weight: newWeight } : i
                        )
                    }))
                }))
            }));
            setIsEditItemOpen(false);
            toast.success("Ítem actualizado");
        } catch (error) {
            toast.error("Error al actualizar el ítem");
        }
    };

    // --- Render Helpers ---
    const getGradeColor = (grade: number) => {
        if (grade >= 4.0) return "text-green-600 dark:text-green-400 font-bold";
        if (grade >= 3.0) return "text-blue-600 dark:text-blue-400 font-bold";
        if (grade > 0) return "text-red-500 dark:text-red-400 font-bold";
        return "text-muted-foreground";
    };

    const getCategoryBgColor = (index: number) => {
        const colors = [
            "bg-blue-50/40 dark:bg-blue-900/20",
            "bg-amber-50/40 dark:bg-amber-900/20",
            "bg-emerald-50/40 dark:bg-emerald-900/20",
            "bg-purple-50/40 dark:bg-purple-900/20",
            "bg-rose-50/40 dark:bg-rose-900/20",
        ];
        return colors[index % colors.length];
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Jerarquía de Calificaciones</h2>
                    <p className="text-muted-foreground">
                        Organiza tus notas en Categorías (Cortes) y Grupos (Talleres, Exámenes).
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {activeTab === "view" && (
                        <>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleExportExcel}
                                className="gap-2"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                <span className="hidden sm:inline">Excel</span>
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handlePrintPDF as any}
                                className="gap-2"
                            >
                                <FileText className="h-4 w-4 text-rose-600" />
                                <span className="hidden sm:inline">PDF</span>
                            </Button>
                        </>
                    )}
                    <Button 
                        variant={activeTab === "view" ? "default" : "outline"}
                        onClick={() => setActiveTab("view")}
                        className="gap-2"
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Vista de Notas
                    </Button>
                    <Button 
                        variant={activeTab === "config" ? "default" : "outline"}
                        onClick={() => setActiveTab("config")}
                        className="gap-2"
                    >
                        <Settings className="h-4 w-4" />
                        Configuración
                    </Button>
                </div>
            </div>

            {activeTab === "view" ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 max-w-sm">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar estudiante..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9"
                        />
                    </div>

                    <div className="rounded-md border bg-card overflow-x-auto" ref={printRef}>
                        <div className="hidden print-header p-6">
                            <h1>Reporte de Calificaciones</h1>
                            <p>{courseTitle}</p>
                            <p>Generado el: {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[250px] font-bold" rowSpan={2}>Estudiante</TableHead>
                                    {categories.map((cat: any, idx: number) => (
                                        <TableHead 
                                            key={cat.id} 
                                            className={`text-center font-bold border-x ${getCategoryBgColor(idx)}`}
                                            colSpan={cat.groups.length || 1}
                                        >
                                            <div className="flex flex-col items-center">
                                                <span>{cat.name}</span>
                                                <Badge variant="outline" className="mt-1 text-[9px] font-bold bg-primary/5">
                                                    {cat.weight}% del Curso
                                                </Badge>
                                            </div>
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-right font-bold bg-primary/5" rowSpan={2}>Nota Final</TableHead>
                                </TableRow>
                                <TableRow className="bg-muted/30">
                                    {categories.flatMap((cat: any, idx: number) => 
                                        cat.groups.length > 0 ? (
                                            cat.groups.map((group: any) => (
                                                <TableHead key={group.id} className={`text-center text-[10px] min-w-[80px] border-x ${getCategoryBgColor(idx)}`}>
                                                    <div className="flex flex-col items-center">
                                                        <span className="truncate w-full text-center">{group.name}</span>
                                                        <span className="text-muted-foreground">({group.weight}%)</span>
                                                    </div>
                                                </TableHead>
                                            ))
                                        ) : (
                                            <TableHead key={cat.id + "-empty"} className={`text-center text-[10px] text-muted-foreground italic border-x ${getCategoryBgColor(idx)}`}>
                                                Sin grupos
                                            </TableHead>
                                        )
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student: any) => {
                                    const finalGrade = calculateFinalGrade(student.id);
                                    return (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar 
                                                        src={student.image}
                                                        alt={formatName(student.name, student.profile)}
                                                        fallbackText={formatName(student.name, student.profile)}
                                                        className="h-8 w-8"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold">
                                                            {formatName(student.name, student.profile)}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            ID: {student.profile?.identificacion || "---"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            {categories.flatMap((cat: any, idx: number) => 
                                                cat.groups.length > 0 ? (
                                                    cat.groups.map((group: any) => {
                                                        const grade = calculateStudentGradeInGroup(student.id, group);
                                                        return (
                                                            <TableCell key={group.id} className={`text-center tabular-nums border-x ${getCategoryBgColor(idx)}`}>
                                                                <span className={getGradeColor(grade)}>
                                                                    {grade.toFixed(2)}
                                                                </span>
                                                            </TableCell>
                                                        );
                                                    })
                                                ) : (
                                                    <TableCell key={cat.id + "-empty"} className={`text-center text-muted-foreground italic text-xs border-x ${getCategoryBgColor(idx)}`}>
                                                        -
                                                    </TableCell>
                                                )
                                            )}
                                            <TableCell className="text-right tabular-nums font-bold bg-primary/5">
                                                <span className={getGradeColor(finalGrade)}>
                                                    {finalGrade.toFixed(2)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {/* Categories Config */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <FolderTree className="h-5 w-5 text-primary" />
                                Estructura de Calificación
                            </h3>
                            <Button onClick={() => setIsCreateCategoryOpen(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Nueva Categoría (Corte)
                            </Button>
                        </div>

                        {categories.length === 0 ? (
                            <Card className="border-dashed py-12">
                                <CardContent className="flex flex-col items-center justify-center text-center">
                                    <div className="rounded-full bg-muted p-4 mb-4">
                                        <FolderTree className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground font-medium">No hay categorías configuradas</p>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        Primero crea una categoría principal (ej: "Primer Corte") y luego añade grupos de notas dentro.
                                    </p>
                                    <Button onClick={() => setIsCreateCategoryOpen(true)} variant="outline">
                                        Configurar primera categoría
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 gap-8">
                                {categories.map((cat: any) => (
                                    <div key={cat.id} className="space-y-4">
                                        <div className="flex items-center justify-between bg-muted/20 p-4 rounded-xl border border-muted">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-primary/10 p-2 rounded-md">
                                                    <FolderTree className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold">{cat.name}</h4>
                                                    <Badge variant="secondary" className="text-xs">
                                                        Peso en Curso: {cat.weight}%
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    onClick={() => {
                                                        setSelectedCategoryForGroup(cat);
                                                        setIsCreateGroupOpen(true);
                                                    }}
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-2 h-9"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Añadir Grupo
                                                </Button>
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="h-9 w-9"
                                                    onClick={() => {
                                                        setEditingCategory(cat);
                                                        setIsEditCategoryOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDeleteCategory(cat.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4 border-l-2 border-primary/10">
                                            {cat.groups.map((group: any) => {
                                                const groupTotalWeight = group.items?.reduce((sum: number, item: any) => sum + (item.weight || 0), 0) || 0;
                                                const isUnderweight = group.items?.length > 0 && groupTotalWeight < 100;
                                                
                                                return (
                                                <Card key={group.id} className="bg-card shadow-sm hover:shadow-md transition-shadow">
                                                    <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                                                        <div>
                                                            <CardTitle className="text-base">{group.name}</CardTitle>
                                                            <div className="flex items-center gap-2">
                                                                <CardDescription>Peso en corte: {group.weight}%</CardDescription>
                                                                {isUnderweight && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-amber-500 font-medium" title={`El peso de los ítems suma ${groupTotalWeight}%, debe ser al menos 100%`}>
                                                                        <AlertCircle className="h-3 w-3" />
                                                                        Suma &lt; 100%
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 shrink-0">
                                                            <Button 
                                                                variant="ghost" size="icon" className="h-7 w-7 opacity-50 hover:opacity-100"
                                                                onClick={() => { setEditingGroup(group); setIsEditGroupOpen(true); }}
                                                            >
                                                                <Pencil className="h-3 w-3" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                onClick={() => handleDeleteGroup(group.id, cat.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="space-y-3">
                                                            <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto pr-1">
                                                                {group.items?.map((item: any) => (
                                                                    <div key={item.id} className="flex items-center justify-between text-[11px] bg-muted/30 p-2 rounded border group/item">
                                                                        <span className="truncate pr-2 font-medium">
                                                                            {item.activity?.title || item.evaluationAttempt?.evaluation?.title || "S/N"}
                                                                        </span>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className="text-muted-foreground whitespace-nowrap">{item.weight}%</span>
                                                                            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                                <button 
                                                                                    onClick={() => { setEditingItem(item); setIsEditItemOpen(true); }}
                                                                                    className="text-muted-foreground hover:text-primary"
                                                                                    title="Editar peso"
                                                                                >
                                                                                    <Pencil className="h-3 w-3" />
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => handleRemoveItem(item.id, group.id)}
                                                                                    className="text-muted-foreground hover:text-destructive"
                                                                                    title="Remover"
                                                                                >
                                                                                    <Trash2 className="h-3 w-3" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {group.items?.length === 0 && (
                                                                    <p className="text-[10px] text-muted-foreground italic text-center py-2">
                                                                        Vacio - Sin actividades asignadas
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <Button 
                                                                variant="outline" size="sm" className="w-full h-8 text-xs gap-1 border-dashed"
                                                                onClick={() => { setSelectedGroup(group); setIsAddItemOpen(true); }}
                                                            >
                                                                <Plus className="h-3 w-3" /> Añadir Ítem
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                                );
                                            })}
                                            {cat.groups.length === 0 && (
                                                <div className="col-span-full py-8 text-center bg-muted/10 border-2 border-dashed rounded-xl">
                                                    <p className="text-sm text-muted-foreground italic">No hay grupos en esta categoría</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- Dialogs --- */}

            {/* Create Category */}
            <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva Categoría de Calificación</DialogTitle>
                        <DialogDescription>Crea un contenedor de alto nivel (ej: "Primer Corte") y define su peso sobre el total del curso.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateCategory} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="cat-name">Nombre (Ej: Primer Corte)</Label>
                            <Input id="cat-name" name="name" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat-weight">Peso sobre el Total del Curso (%)</Label>
                            <Input id="cat-weight" name="weight" type="number" step="0.1" defaultValue="30" required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsCreateCategoryOpen(false)}>Cancelar</Button>
                            <Button type="submit">Crear Categoría</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Category */}
            <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Categoría</DialogTitle>
                    </DialogHeader>
                    {editingCategory && (
                        <form onSubmit={handleUpdateCategory} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-cat-name">Nombre</Label>
                                <Input id="edit-cat-name" name="name" defaultValue={editingCategory.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-cat-weight">Peso Total (%)</Label>
                                <Input id="edit-cat-weight" name="weight" type="number" step="0.1" defaultValue={editingCategory.weight} required />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsEditCategoryOpen(false)}>Cancelar</Button>
                                <Button type="submit">Guardar</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Group */}
            <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo Grupo en {selectedCategoryForGroup?.name}</DialogTitle>
                        <DialogDescription>Crea un grupo de notas (ej: "Talleres") dentro de esta categoría.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateGroup} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="group-name">Nombre del Grupo</Label>
                            <Input id="group-name" name="name" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="group-weight">Peso dentro de la Categoría (%)</Label>
                            <Input id="group-weight" name="weight" type="number" step="0.1" defaultValue="50" required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsCreateGroupOpen(false)}>Cancelar</Button>
                            <Button type="submit">Crear Grupo</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Group */}
            <Dialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Grupo</DialogTitle>
                    </DialogHeader>
                    {editingGroup && (
                        <form onSubmit={handleUpdateGroup} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="e-group-name">Nombre</Label>
                                <Input id="e-group-name" name="name" defaultValue={editingGroup.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="e-group-weight">Peso (%)</Label>
                                <Input id="e-group-weight" name="weight" type="number" step="0.1" defaultValue={editingGroup.weight} required />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsEditGroupOpen(false)}>Cancelar</Button>
                                <Button type="submit">Guardar</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add Item to Group */}
            <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Añadir Ítem a {selectedGroup?.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddItemToGroup} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Ítem Académico</Label>
                            <Tabs defaultValue="activity">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="activity">Actividad</TabsTrigger>
                                    <TabsTrigger value="evaluation">Evaluación</TabsTrigger>
                                </TabsList>
                                <TabsContent value="activity" className="pt-2">
                                    <Select name="activityId">
                                        <SelectTrigger><SelectValue placeholder="Elige actividad..." /></SelectTrigger>
                                        <SelectContent>
                                            {availableActivities.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">No hay actividades disponibles</div>}
                                            {availableActivities.map((a: any) => (
                                                <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TabsContent>
                                <TabsContent value="evaluation" className="pt-2">
                                    <Select name="evaluationAttemptId">
                                        <SelectTrigger><SelectValue placeholder="Elige evaluación..." /></SelectTrigger>
                                        <SelectContent>
                                            {availableEvaluations.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">No hay evaluaciones disponibles</div>}
                                            {availableEvaluations.map((e: any) => (
                                                <SelectItem key={e.id} value={e.id}>{e.evaluation?.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TabsContent>
                            </Tabs>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="i-weight">Peso dentro del Grupo (%)</Label>
                            <Input id="i-weight" name="weight" type="number" step="0.1" defaultValue="100" required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsAddItemOpen(false)}>Cancelar</Button>
                            <Button type="submit">Añadir</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Item */}
            <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Peso del Ítem</DialogTitle>
                        <DialogDescription>
                            {editingItem?.activity?.title || editingItem?.evaluationAttempt?.evaluation?.title || "Ítem Académico"}
                        </DialogDescription>
                    </DialogHeader>
                    {editingItem && (
                        <form onSubmit={handleUpdateItem} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-i-weight">Peso dentro del Grupo (%)</Label>
                                <Input id="edit-i-weight" name="weight" type="number" step="0.1" defaultValue={editingItem.weight} required />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsEditItemOpen(false)}>Cancelar</Button>
                                <Button type="submit">Guardar</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
