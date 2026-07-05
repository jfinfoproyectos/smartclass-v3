"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { createActivityAction, updateActivityAction, deleteActivityAction } from "@/features/teacher/actions/activityActions";
import { scanRepositoryAction } from "@/features/github/actions/githubActions";
import { getMissingSubmissionsAction } from "@/features/teacher/actions/studentActions";;
import { Plus, Calendar, FileText, MessageSquare, Pencil, Trash2, Eye, X, ChevronUp, ChevronDown, AlertCircle, Sparkles, Upload, Download, Loader2, Search, UserX, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatName } from "@/lib/utils";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import Link from "next/link";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useTheme } from "next-themes";
import { AIGenerateDialog } from './AIGenerateDialog';
import { ActivityFieldHelpDialog } from './ActivityFieldHelpDialog';



// Sortable item wrapper component
function SortablePathItem({ id, path, index, onRemove }: { id: string, path: string, index: number, onRemove: (index: number) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center w-full rounded-md border px-3 py-2 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-border bg-card text-card-foreground hover:bg-muted/50 font-mono text-sm gap-2 cursor-default relative shadow-sm"
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground touch-none flex items-center shrink-0"
            >
                <GripVertical className="h-4 w-4" />
            </div>
            <span className="flex-1 truncate">{path}</span>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive rounded-full shrink-0"
                onClick={(e) => {
                    e.stopPropagation(); // Prevent drag interference
                    onRemove(index);
                }}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

function FilePathInput({ name, defaultValue = "", placeholder }: { name: string, defaultValue?: string, placeholder?: string }) {
    const [paths, setPaths] = useState<string[]>(defaultValue ? defaultValue.split(",").map(p => p.trim()).filter(Boolean) : []);
    const [currentPath, setCurrentPath] = useState("");
    const [repoUrl, setRepoUrl] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [scannedFiles, setScannedFiles] = useState<string[]>([]);
    const [showScanner, setShowScanner] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const addPath = () => {
        if (currentPath.trim() && !paths.includes(currentPath.trim())) {
            setPaths([...paths, currentPath.trim()]);
            setCurrentPath("");
        }
    };

    const removePath = (index: number) => {
        setPaths(paths.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addPath();
        }
    };

    const handleScan = async () => {
        if (!repoUrl) return;
        setIsScanning(true);
        try {
            const result = await scanRepositoryAction(repoUrl);
            setScannedFiles(result.files);
            if (result.warning) {
                toast.warning("Límite de API Posible", { description: result.warning });
            }
        } catch (error: any) {
            console.error("Error scanning repo:", error);
            toast.error("Error al escanear repositorio", {
                description: error.message || "Ocurrió un problema al obtener la estructura del repositorio."
            });
        } finally {
            setIsScanning(false);
        }
    };

    const toggleScannedFile = (file: string) => {
        if (paths.includes(file)) {
            setPaths(paths.filter(p => p !== file));
        } else {
            setPaths([...paths, file]);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setPaths((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };
    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    value={currentPath}
                    onChange={(e) => setCurrentPath(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="flex-1"
                />
                <Button type="button" onClick={addPath} variant="secondary">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="border rounded-md p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Escanear Repositorio (Opcional)</Label>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowScanner(!showScanner)}
                        className="h-auto py-1 text-xs"
                    >
                        {showScanner ? "Ocultar Escáner" : "Mostrar Escáner"}
                    </Button>
                </div>

                {showScanner && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-2">
                            <Input
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                placeholder="https://github.com/usuario/repositorio"
                                className="flex-1 text-sm"
                            />
                            <Button type="button" onClick={handleScan} disabled={isScanning || !repoUrl} size="sm">
                                {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                <span className="ml-2">Escanear</span>
                            </Button>
                        </div>

                        {scannedFiles.length > 0 && (
                            <ScrollArea className="h-48 border rounded-md p-2">
                                <div className="space-y-1">
                                    {scannedFiles.map((file) => (
                                        <div key={file} className="flex items-center space-x-2 hover:bg-muted/50 p-1 rounded">
                                            <Checkbox
                                                id={`file-${file}`}
                                                checked={paths.includes(file)}
                                                onCheckedChange={() => toggleScannedFile(file)}
                                            />
                                            <Label htmlFor={`file-${file}`} className="text-xs font-mono cursor-pointer flex-1">
                                                {file}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                )}
            </div>

            {paths.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Archivos seleccionados:</Label>
                        <Badge variant="outline" className="text-xs">
                            {paths.length} {paths.length === 1 ? 'archivo' : 'archivos'}
                        </Badge>
                    </div>
                    <div className="flex flex-col gap-2">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={paths}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="flex flex-col gap-2 w-full">
                                    {paths.map((path, index) => (
                                        <SortablePathItem
                                            key={path}
                                            id={path}
                                            path={path}
                                            index={index}
                                            onRemove={removePath}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
            )}

            <input type="hidden" name={name} value={paths.join(",")} />
        </div>
    );
}




export function ActivityManager({ courseId, activities }: { courseId: string; activities: any[] }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [isOpen, setIsOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<string>("GITHUB");
    const [description, setDescription] = useState("**Instrucciones de la actividad**\n\n...");
    const [statement, setStatement] = useState("**Enunciado de la actividad**\n\n...");
    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto";
    const [isReordering, setIsReordering] = useState(false);
    const [showDescriptionAI, setShowDescriptionAI] = useState(false);
    const [showStatementAI, setShowStatementAI] = useState(false);

    const [formKey, setFormKey] = useState(0);
    const formRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importedData, setImportedData] = useState<any>(null);


    const handleExport = () => {
        if (!formRef.current) return;
        const formData = new FormData(formRef.current);
        const data = Object.fromEntries(formData.entries());
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const title = formData.get("title")?.toString().replace(/[^a-z0-9-]/gi, '_').toLowerCase() || "nueva_actividad";
        const dateStr = format(new Date(), "yyyy-MM-dd-HHmm");
        a.download = `${title}_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (data.description !== undefined) setDescription(data.description);
                if (data.statement !== undefined) setStatement(data.statement);
                if (data.type !== undefined) setSelectedType(data.type);
                setImportedData(data);
                setFormKey(k => k + 1);
            } catch (err) {
                console.error("Error al importar", err);
                toast.error("Archivo JSON inválido");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Reset imported info when closing/opening
    useEffect(() => {
        if (!isOpen) {
            setImportedData(null);
            setFormKey(k => k + 1);
        }
    }, [isOpen]);

    // Evitar hidratación fallida - Debe ir después de todos los hooks
    if (!mounted) return null;

    const handleReorder = async (direction: 'up' | 'down', index: number) => {
        if (isReordering) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === activities.length - 1) return;

        setIsReordering(true);
        const newActivities = [...activities];
        const temp = newActivities[index];
        newActivities[index] = newActivities[direction === 'up' ? index - 1 : index + 1];
        newActivities[direction === 'up' ? index - 1 : index + 1] = temp;

        const activityIds = newActivities.map(a => a.id);

        try {
            await import("@/features/teacher/actions/activityActions").then(mod => mod.reorderActivitiesAction(courseId, activityIds));
        } catch (error) {
            console.error("Failed to reorder", error);
        } finally {
            setIsReordering(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Actividades del Curso</h3>
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Nueva Actividad</Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full max-w-none sm:max-w-none p-0">
                        <form key={formKey} ref={formRef} action={async (formData) => {
                            await createActivityAction(formData);
                            setIsOpen(false);
                            setDescription("**Instrucciones de la actividad**\n\n..."); // Reset
                            setStatement("**Enunciado de la actividad**\n\n..."); // Reset
                        }} className="flex flex-col h-full">
                            <input type="hidden" name="courseId" value={courseId} />
                            <input type="hidden" name="description" value={description} />
                            <input type="hidden" name="statement" value={statement} />
                            {/* Hidden inputs to send UTC dates */}
                            <input type="hidden" name="openDate" id="openDate-utc" />
                            <input type="hidden" name="deadline" id="deadline-utc" />

                            <SheetHeader className="px-6 py-4 border-b">
                                <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
                                    <div>
                                        <SheetTitle>Crear Nueva Actividad</SheetTitle>
                                        <SheetDescription>
                                            Configura los detalles y el contenido de la actividad.
                                        </SheetDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
                                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Importar
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={handleExport}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Exportar
                                        </Button>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                                    {/* Left Column: Metadata */}
                                    <div className="lg:col-span-4 space-y-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="title">Título</Label>
                                            <Input id="title" name="title" required placeholder="Ej: Taller de React" defaultValue={importedData?.title || ""} />
                                        </div>

                                        <div className="grid grid-cols-12 gap-4">
                                            <div className="col-span-12 space-y-2">
                                                <Label htmlFor="type">Tipo</Label>
                                                <Select name="type" defaultValue={importedData?.type || "GITHUB"} onValueChange={setSelectedType}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona el tipo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="GITHUB">GitHub Repositorio</SelectItem>
                                                        <SelectItem value="CODE_PROJECT">Proyecto de Código (Revisión Manual)</SelectItem>
                                                        <SelectItem value="MANUAL">Manual</SelectItem>
                                                        <SelectItem value="GOOGLE_COLAB">Google Colab</SelectItem>
                                                        <SelectItem value="PDF_REVIEW">Revisión de PDF</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {selectedType !== "MANUAL" && selectedType !== "PDF_REVIEW" && selectedType !== "CODE_PROJECT" && (
                                                <div className="col-span-3 space-y-2">
                                                    <Label htmlFor="maxAttempts">Intentos</Label>
                                                    <Input id="maxAttempts" name="maxAttempts" type="number" min="1" max="10" defaultValue={importedData?.maxAttempts || "1"} required />
                                                </div>
                                            )}
                                        </div>

                                        {selectedType === "GITHUB" && (
                                            <div className="space-y-2">
                                                <Label>Archivos a evaluar (GitHub)</Label>
                                                <FilePathInput name="filePaths" placeholder="src/index.ts" defaultValue={importedData?.filePaths || ""} />
                                                <p className="text-xs text-muted-foreground">Agrega las rutas en orden de dependencia. Los archivos evaluados primero servirán como contexto para la IA y ayudarán a comprender los siguientes.</p>
                                            </div>
                                        )}

                                        {selectedType === "MANUAL" && (
                                            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                                                <div className="flex items-start space-x-3">
                                                    <Checkbox id="allowLinkSubmission" name="allowLinkSubmission" value="true" defaultChecked={importedData?.allowLinkSubmission === "true" || importedData?.allowLinkSubmission === true} />
                                                    <div className="space-y-1">
                                                        <Label htmlFor="allowLinkSubmission" className="font-medium cursor-pointer">
                                                            Permitir envío de enlaces
                                                        </Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            Los estudiantes podrán enviar enlaces (Google Drive, OneDrive, etc.) para esta actividad.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}


                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="openDateLocal">Fecha de Apertura</Label>
                                                <Input
                                                    id="openDateLocal"
                                                    name="openDateLocal"
                                                    type="datetime-local"
                                                    defaultValue={importedData?.openDateLocal || ""}
                                                    onChange={(e) => {
                                                        const utcInput = document.getElementById('openDate-utc') as HTMLInputElement;
                                                        if (e.target.value) {
                                                            utcInput.value = new Date(e.target.value).toISOString();
                                                        } else {
                                                            utcInput.value = '';
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="deadlineLocal">Fecha Límite</Label>
                                                <Input
                                                    id="deadlineLocal"
                                                    name="deadlineLocal"
                                                    type="datetime-local"
                                                    required
                                                    defaultValue={importedData?.deadlineLocal || ""}
                                                    onChange={(e) => {
                                                        const utcInput = document.getElementById('deadline-utc') as HTMLInputElement;
                                                        if (e.target.value) {
                                                            utcInput.value = new Date(e.target.value).toISOString();
                                                        } else {
                                                            utcInput.value = '';
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Editor */}
                                    <div className="lg:col-span-8 flex flex-col h-full min-h-[500px] gap-4">
                                        {selectedType !== "MANUAL" && selectedType !== "PDF_REVIEW" && selectedType !== "CODE_PROJECT" && (
                                            <div className="flex-1 flex flex-col min-h-[300px]">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Label>Instrucciones (Informativas)</Label>
                                                        <ActivityFieldHelpDialog type="instructions" />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowDescriptionAI(true)}
                                                        className="h-8"
                                                    >
                                                        <Sparkles className="mr-2 h-4 w-4" />
                                                        Generar con IA
                                                    </Button>
                                                </div>
                                                <div className="flex-1 border rounded-md overflow-hidden" data-color-mode={mode}>
                                                    <MDEditor
                                                        value={description}
                                                        onChange={(val) => setDescription(val || "")}
                                                        height="100%"
                                                        preview="live"
                                                        className="h-full border-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex-1 flex flex-col min-h-[300px]">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Label>Enunciado / Rúbrica de Evaluación</Label>
                                                    <ActivityFieldHelpDialog type="statement" />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setShowStatementAI(true)}
                                                    className="h-8"
                                                >
                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                    Generar con IA
                                                </Button>
                                            </div>
                                            <div className="flex-1 border rounded-md overflow-hidden" data-color-mode={mode}>
                                                <MDEditor
                                                    value={statement}
                                                    onChange={(val) => setStatement(val || "")}
                                                    height="100%"
                                                    preview="live"
                                                    className="h-full border-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <SheetFooter className="px-6 py-4 border-t bg-muted/50">
                                <Button type="submit" size="lg" className="w-full sm:w-auto">Guardar Actividad</Button>
                            </SheetFooter>
                        </form>
                    </SheetContent>
                </Sheet>

                <AIGenerateDialog
                    isOpen={showDescriptionAI}
                    onClose={() => setShowDescriptionAI(false)}
                    onUseContent={(content) => setDescription(content)}
                    type="description"
                    activityType={selectedType}
                />

                <AIGenerateDialog
                    isOpen={showStatementAI}
                    onClose={() => setShowStatementAI(false)}
                    onUseContent={(content) => setStatement(content)}
                    type="statement"
                    activityType={selectedType}
                />
            </div>

            <div className="w-full overflow-x-auto rounded-md border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Orden</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Fecha Límite</TableHead>
                            <TableHead>Entregas</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {activities.map((activity, index) => (
                            <TableRow key={activity.id}>
                                <TableCell>
                                    <div className="flex flex-col gap-1">

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            disabled={index === 0 || isReordering}
                                            onClick={() => handleReorder('up', index)}
                                        >
                                            <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            disabled={index === activities.length - 1 || isReordering}
                                            onClick={() => handleReorder('down', index)}
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </div >
                                </TableCell >
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                            {index + 1}
                                        </div>
                                        <div className="flex items-center">
                                            {activity.title}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{activity.type}</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Calendar className="mr-2 h-3 w-3" />
                                        {format(new Date(activity.deadline), "PP p")}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {activity.type === "MANUAL" ? "-" : `${activity.submissions.length} entregas`}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end pr-2">
                                        <div className="grid grid-cols-4 gap-1 sm:gap-2">
                                            {/* Slot 1: View */}
                                            <div className="flex items-center justify-center">
                                                <Link href={`/dashboard/teacher/courses/${courseId}/activities/${activity.id}`}>
                                                    <Button variant="ghost" size="icon" title="Ver Entregas" className="h-8 w-8 sm:h-9 sm:w-9">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </div>

                                            {/* Slot 2: Missing Submissions (Conditional) */}
                                            <div className="flex items-center justify-center">
                                                {activity.type !== "MANUAL" ? (
                                                    <MissingSubmissionsDialog activityId={activity.id} activityTitle={activity.title} />
                                                ) : (
                                                    <div className="h-8 w-8 sm:h-9 sm:w-9" />
                                                )}
                                            </div>

                                            {/* Slot 3: Edit */}
                                            <div className="flex items-center justify-center">
                                                <EditActivityDialog activity={activity} courseId={courseId} mode={mode} />
                                            </div>

                                            {/* Slot 4: Delete */}
                                            <div className="flex items-center justify-center">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive" title="Eliminar">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <form action={async (formData) => {
                                                            await deleteActivityAction(formData);
                                                        }}>
                                                            <input type="hidden" name="courseId" value={courseId} />
                                                            <input type="hidden" name="activityId" value={activity.id} />
                                                            <DialogHeader>
                                                                <DialogTitle>Confirmar eliminación</DialogTitle>
                                                                <DialogDescription>
                                                                    Escribe <strong>ELIMINAR</strong> para confirmar.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="grid grid-cols-4 items-center gap-4 py-4">
                                                                <Label htmlFor={`confirm-${activity.id}`} className="text-right">Confirmación</Label>
                                                                <Input id={`confirm-${activity.id}`} name="confirmText" placeholder="ELIMINAR" pattern="^ELIMINAR$" required className="col-span-3" />
                                                            </div>
                                                            <DialogFooter>
                                                                <Button type="submit" variant="destructive">Confirmar eliminación</Button>
                                                            </DialogFooter>
                                                        </form>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow >
                        ))}
                        {
                            activities.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No hay actividades creadas para este curso.
                                    </TableCell>
                                </TableRow>
                            )
                        }
                    </TableBody >
                </Table >
            </div >
        </div >
    );
}

function EditActivityDialog({ activity, courseId, mode }: { activity: any, courseId: string, mode: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [description, setDescription] = useState(activity.description || "");
    const [statement, setStatement] = useState(activity.statement || "");
    const [selectedType, setSelectedType] = useState(activity.type);

    const [formKey, setFormKey] = useState(0);
    const formRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importedData, setImportedData] = useState<any>(null);

    const handleExport = () => {
        if (!formRef.current) return;
        const formData = new FormData(formRef.current);
        const data = Object.fromEntries(formData.entries());
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const title = formData.get("title")?.toString().replace(/[^a-z0-9-]/gi, '_').toLowerCase() || "actividad";
        const dateStr = format(new Date(), "yyyy-MM-dd-HHmm");
        a.download = `${title}_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (data.description !== undefined) setDescription(data.description);
                if (data.statement !== undefined) setStatement(data.statement);
                if (data.type !== undefined) setSelectedType(data.type);
                setImportedData(data);
                setFormKey(k => k + 1);
            } catch (err) {
                console.error("Error al importar", err);
                toast.error("Archivo JSON inválido");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    useEffect(() => {
        if (isOpen) {
            setDescription(activity.description || "");
            setStatement(activity.statement || "");
            setSelectedType(activity.type);
            setImportedData(null);
            setFormKey(k => k + 1);
        }
    }, [isOpen, activity]);

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" title="Editar" className="h-8 w-8 sm:h-9 sm:w-9">
                    <Pencil className="h-4 w-4" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-none sm:max-w-none p-0">
                <form key={formKey} ref={formRef} action={async (formData) => {
                    await updateActivityAction(formData);
                    setIsOpen(false);
                }} className="flex flex-col h-full">
                    <input type="hidden" name="activityId" value={activity.id} />
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="description" value={description} />
                    <input type="hidden" name="statement" value={statement} />
                    {/* Hidden inputs to send UTC dates */}
                    <input type="hidden" name="openDate" id={`edit-openDate-utc-${activity.id}`} />
                    <input type="hidden" name="deadline" id={`edit-deadline-utc-${activity.id}`} />

                    <SheetHeader className="px-6 py-4 border-b">
                        <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
                            <div>
                                <SheetTitle>Editar Actividad</SheetTitle>
                                <SheetDescription>
                                    Modifica los parámetros de la actividad.
                                </SheetDescription>
                            </div>
                            <div className="flex gap-2">
                                <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Importar
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={handleExport}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Exportar
                                </Button>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                            {/* Left Column: Metadata */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Título</Label>
                                    <Input id="title" name="title" required defaultValue={importedData?.title || activity.title} />
                                </div>

                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-12 space-y-2">
                                        <Label htmlFor="type">Tipo</Label>
                                        <Select name="type" defaultValue={importedData?.type || activity.type} onValueChange={setSelectedType}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona el tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="GITHUB">GitHub Repositorio</SelectItem>
                                                <SelectItem value="CODE_PROJECT">Proyecto de Código (Revisión Manual)</SelectItem>
                                                <SelectItem value="MANUAL">Manual</SelectItem>
                                                <SelectItem value="GOOGLE_COLAB">Google Colab</SelectItem>
                                                <SelectItem value="PDF_REVIEW">Revisión de PDF</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {selectedType !== "MANUAL" && selectedType !== "PDF_REVIEW" && selectedType !== "CODE_PROJECT" && (
                                        <div className="col-span-3 space-y-2">
                                            <Label htmlFor="maxAttempts">Intentos</Label>
                                            <Input id="maxAttempts" name="maxAttempts" type="number" min="1" max="10" defaultValue={importedData?.maxAttempts || activity.maxAttempts} required />
                                        </div>
                                    )}
                                </div>

                                {selectedType === "GITHUB" && (
                                    <div className="space-y-2">
                                        <Label>Archivos a evaluar (GitHub)</Label>
                                        <FilePathInput name="filePaths" placeholder="src/index.ts" defaultValue={importedData?.filePaths || activity.filePaths} />
                                    </div>
                                )}

                                {selectedType === "MANUAL" && (
                                    <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                                        <div className="flex items-start space-x-3">
                                            <Checkbox id="edit-allowLinkSubmission" name="allowLinkSubmission" value="true" defaultChecked={importedData?.allowLinkSubmission !== undefined ? (importedData.allowLinkSubmission === "true" || importedData.allowLinkSubmission === true) : activity.allowLinkSubmission} />
                                            <div className="space-y-1">
                                                <Label htmlFor="edit-allowLinkSubmission" className="font-medium cursor-pointer">
                                                    Permitir envío de enlaces
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Los estudiantes podrán enviar enlaces (Google Drive, OneDrive, etc.) para esta actividad.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="openDateLocal">Fecha de Apertura</Label>
                                        <Input
                                            id="openDateLocal"
                                            name="openDateLocal"
                                            type="datetime-local"
                                            defaultValue={importedData?.openDateLocal || (activity.openDate ? new Date(new Date(activity.openDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "")}
                                            onChange={(e) => {
                                                const utcInput = document.getElementById(`edit-openDate-utc-${activity.id}`) as HTMLInputElement;
                                                if (e.target.value) {
                                                    utcInput.value = new Date(e.target.value).toISOString();
                                                } else {
                                                    utcInput.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="deadlineLocal">Fecha Límite</Label>
                                        <Input
                                            id="deadlineLocal"
                                            name="deadlineLocal"
                                            type="datetime-local"
                                            required
                                            defaultValue={importedData?.deadlineLocal || (activity.deadline ? new Date(new Date(activity.deadline).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "")}
                                            onChange={(e) => {
                                                const utcInput = document.getElementById(`edit-deadline-utc-${activity.id}`) as HTMLInputElement;
                                                if (e.target.value) {
                                                    utcInput.value = new Date(e.target.value).toISOString();
                                                } else {
                                                    utcInput.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Editor */}
                            <div className="lg:col-span-8 flex flex-col h-full min-h-[500px] gap-4">
                                {selectedType !== "MANUAL" && selectedType !== "PDF_REVIEW" && selectedType !== "CODE_PROJECT" && (
                                    <div className="flex-1 flex flex-col min-h-[300px]">
                                        <Label className="mb-2">Instrucciones (Informativas)</Label>
                                        <div className="flex-1 border rounded-md overflow-hidden" data-color-mode={mode}>
                                            <MDEditor
                                                value={description}
                                                onChange={(val) => setDescription(val || "")}
                                                height="100%"
                                                preview="live"
                                                className="h-full border-none"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="flex-1 flex flex-col min-h-[300px]">
                                    <Label className="mb-2">Enunciado / Rúbrica de Evaluación</Label>
                                    <div className="flex-1 border rounded-md overflow-hidden" data-color-mode={mode}>
                                        <MDEditor
                                            value={statement}
                                            onChange={(val) => setStatement(val || "")}
                                            height="100%"
                                            preview="live"
                                            className="h-full border-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <SheetFooter className="px-6 py-4 border-t bg-muted/50">
                        <Button type="submit" size="lg" className="w-full sm:w-auto">Actualizar Actividad</Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

function MissingSubmissionsDialog({ activityId, activityTitle }: { activityId: string, activityTitle: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [missingStudents, setMissingStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadMissingStudents();
        }
    }, [isOpen]);

    const loadMissingStudents = async () => {
        setIsLoading(true);
        try {
            const students = await getMissingSubmissionsAction(activityId);
            setMissingStudents(students);
        } catch (error) {
            console.error("Error loading missing students", error);
            toast.error("Error al cargar estudiantes sin entrega");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Ver Faltantes" className="h-8 w-8 sm:h-9 sm:w-9 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                    <UserX className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Estudiantes sin entrega</DialogTitle>
                    <DialogDescription>
                        {activityTitle}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : missingStudents.length > 0 ? (
                        <ScrollArea className="h-[300px] rounded-md border p-4">
                            <div className="space-y-4">
                                {missingStudents.map((student) => (
                                    <div key={student.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{student.name}</span>
                                            <span className="text-xs text-muted-foreground">{student.email}</span>
                                        </div>
                                        {student.profile?.telefono && (
                                            <a
                                                href={`https://wa.me/${student.profile.telefono.replace(/\+/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-green-600 hover:text-green-700 p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-950/20"
                                                title="Contactar por WhatsApp"
                                            >
                                                <MessageSquare className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Todos los estudiantes han realizado su entrega.
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <div className="flex justify-between items-center w-full">
                        <span className="text-sm text-muted-foreground">
                            {missingStudents.length} {missingStudents.length === 1 ? 'estudiante' : 'estudiantes'} pendientes
                        </span>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
