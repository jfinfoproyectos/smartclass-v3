"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Edit, FileQuestion, FileText, Search, Download, Upload, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useTheme } from "next-themes";
import Link from "next/link";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { createEvaluationAction, deleteEvaluationAction, updateEvaluationAction, exportEvaluationAction, importEvaluationAction } from "@/features/teacher/actions/evaluationActions";
import { toast } from "sonner";

export function EvaluationManager({ evaluations }: { evaluations: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingEvaluation, setEditingEvaluation] = useState<any>(null);
    const [description, setDescription] = useState("**Descripción de la evaluación**\n\n...");
    const [searchTerm, setSearchTerm] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto";
    const formRef = useRef<HTMLFormElement>(null);

    const filteredEvaluations = evaluations.filter((ev) =>
        ev.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenEdit = (evaluation: any) => {
        setEditingEvaluation(evaluation);
        setDescription(evaluation.description || "**Descripción de la evaluación**\n\n...");
        setIsOpen(true);
    };

    const handleOpenCreate = () => {
        setEditingEvaluation(null);
        setDescription("**Descripción de la evaluación**\n\n...");
        setIsOpen(true);
    };

    const handleExport = async (evaluation: any) => {
        try {
            toast.info("Preparando exportación...");
            const data = await exportEvaluationAction(evaluation.id);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${evaluation.title.replace(/\s+/g, "_")}_evaluacion.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Evaluación exportada correctamente");
        } catch (error) {
            console.error(error);
            toast.error("Error al exportar evaluación");
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                const data = JSON.parse(content);
                await importEvaluationAction(data);
                toast.success("Evaluación importada correctamente");
            } catch (error) {
                console.error(error);
                toast.error("Error al importar: formato inválido o error de servidor");
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-bold tracking-tight">Gestión de Evaluaciones</h2>
                    <p className="text-muted-foreground">
                        {evaluations.length} Evaluaciones Estructuradas
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={handleImport}
                    />
                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="h-9 rounded-xl border-border/50 hover:bg-muted/10 transition-all duration-300 font-bold text-xs"
                    >
                        <Upload className="mr-2 h-4 w-4" /> Importar JSON
                    </Button>

                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <Button 
                            onClick={handleOpenCreate}
                            className="h-9 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground transition-all duration-300 font-bold text-xs"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Nueva Evaluación
                        </Button>
                        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-y-auto">
                            <form
                                ref={formRef}
                                action={async (formData) => {
                                    if (editingEvaluation) {
                                        await updateEvaluationAction(formData);
                                    } else {
                                        await createEvaluationAction(formData);
                                    }
                                    setIsOpen(false);
                                    setEditingEvaluation(null);
                                    setDescription("**Descripción de la evaluación**\n\n...");
                                }}
                                className="flex flex-col h-full"
                            >
                                <input type="hidden" name="description" value={description} />
                                {editingEvaluation && (
                                    <input type="hidden" name="evaluationId" value={editingEvaluation.id} />
                                )}

                                <SheetHeader className="px-6 py-4 border-b">
                                    <SheetTitle>{editingEvaluation ? "Editar Evaluación" : "Crear Nueva Evaluación"}</SheetTitle>
                                    <SheetDescription>
                                        {editingEvaluation
                                            ? "Modifica la configuración de esta evaluación."
                                            : "Configura los detalles básicos de la nueva evaluación. Podrás añadir preguntas una vez creada."}
                                    </SheetDescription>
                                </SheetHeader>

                                <div className="p-6 space-y-6 flex-1">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Título</Label>
                                        <Input
                                            id="title"
                                            name="title"
                                            required
                                            placeholder="Ej: Evaluación Primer Parcial"
                                            defaultValue={editingEvaluation?.title || ""}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="helpUrl">URL de Ayuda / Recursos (Opcional)</Label>
                                        <Input
                                            id="helpUrl"
                                            name="helpUrl"
                                            type="url"
                                            placeholder="https://..."
                                            defaultValue={editingEvaluation?.helpUrl || ""}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Enlace a documentación o recursos adicionales permitidos durante la evaluación.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="descriptionEditor">Instrucciones / Descripción (Markdown)</Label>
                                        <div className="border rounded-md overflow-hidden" data-color-mode={mode}>
                                            <MDEditor
                                                value={description}
                                                onChange={(val) => setDescription(val || "")}
                                                preview="edit"
                                                height={200}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="duration">Duración (Minutos)</Label>
                                            <Input
                                                id="duration"
                                                name="duration"
                                                type="number"
                                                min={1}
                                                required
                                                placeholder="Ej: 60"
                                                defaultValue={editingEvaluation?.duration || 60}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="maxAttempts">Intentos Permitidos</Label>
                                            <Input
                                                id="maxAttempts"
                                                name="maxAttempts"
                                                type="number"
                                                min={1}
                                                required
                                                placeholder="Ej: 1"
                                                defaultValue={editingEvaluation?.maxAttempts || 1}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="maxSupportAttempts">Intentos de Soporte (IA) por Pregunta</Label>
                                        <Input
                                            id="maxSupportAttempts"
                                            name="maxSupportAttempts"
                                            type="number"
                                            min="0"
                                            max="10"
                                            defaultValue={editingEvaluation?.maxSupportAttempts ?? "3"}
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Número de veces que el estudiante puede pedir evaluación a la IA por pregunta.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="aiSupportDelaySeconds">Tiempo de Espera entre Evaluaciones IA (Segundos)</Label>
                                        <Input
                                            id="aiSupportDelaySeconds"
                                            name="aiSupportDelaySeconds"
                                            type="number"
                                            min="0"
                                            defaultValue={editingEvaluation?.aiSupportDelaySeconds ?? "60"}
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Tiempo que el estudiante debe esperar tras evaluar su respuesta antes de poder volver a evaluarla.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="expulsionPenalty">Penalidad por Expulsión (puntos a restar)</Label>
                                        <Input
                                            id="expulsionPenalty"
                                            name="expulsionPenalty"
                                            type="number"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            defaultValue={editingEvaluation?.expulsionPenalty ?? "0"}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Puntos a restar por cada expulsión (rango: <strong>0.00 – 1.00</strong>). Si es <strong>0</strong>, las expulsiones solo se registran sin afectar la nota.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="wildcardAiHints">🃏 Comodines: Pista de IA</Label>
                                        <Input
                                            id="wildcardAiHints"
                                            name="wildcardAiHints"
                                            type="number"
                                            min="0"
                                            max="10"
                                            defaultValue={editingEvaluation?.wildcardAiHints ?? "0"}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Cantidad de pistas de IA disponibles para el estudiante durante toda la evaluación. La IA dará una pista orientativa sin revelar la respuesta. <strong>0 = deshabilitado</strong>.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="wildcardSecondChance">🃏 Comodines: Segunda Oportunidad</Label>
                                        <Input
                                            id="wildcardSecondChance"
                                            name="wildcardSecondChance"
                                            type="number"
                                            min="0"
                                            max="10"
                                            defaultValue={editingEvaluation?.wildcardSecondChance ?? "0"}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Permite al estudiante reiniciar completamente una pregunta (borra respuesta, nota y feedback IA). <strong>0 = deshabilitado</strong>.
                                        </p>
                                    </div>

                                </div>

                                <SheetFooter className="px-6 py-4 border-t bg-muted/50">
                                    <Button type="submit" size="lg" className="w-full sm:w-auto">
                                        {editingEvaluation ? "Guardar Cambios" : "Guardar Evaluación"}
                                    </Button>
                                </SheetFooter>
                            </form>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar evaluación..."
                        className="bg-transparent border-none outline-none text-xs font-medium w-full placeholder:text-muted-foreground/40"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="rounded-2xl border border-border/40 overflow-hidden bg-card/25 backdrop-blur-md shadow-xl shadow-black/5 overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow className="h-12 bg-muted/40 hover:bg-muted/40 border-b border-border/30">
                                <TableHead className="font-extrabold uppercase tracking-wider text-[10px] pl-5 text-muted-foreground/80">Título</TableHead>
                                <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-center text-muted-foreground/80">Preguntas</TableHead>
                                <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-center text-muted-foreground/80">Intentos Realizados</TableHead>
                                <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-center hidden md:table-cell text-muted-foreground/80">Fecha de Creación</TableHead>
                                <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-right pr-5 text-muted-foreground/80">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEvaluations.map((evaluation) => (
                                <TableRow key={evaluation.id} className="group hover:bg-muted/30 transition-colors border-b border-border/20">
                                    <TableCell className="font-medium py-3.5 pl-5">
                                        <div className="flex items-center gap-3.5">
                                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-all duration-300 shadow-sm shadow-primary/5">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <span className="font-bold text-sm text-foreground/90 group-hover:text-primary transition-colors duration-300">{evaluation.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-3.5">
                                        <span className="text-xs font-semibold bg-muted/65 px-2.5 py-1 rounded-lg border border-border/30 text-foreground">
                                            {evaluation._count?.questions || 0}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center py-3.5">
                                        <span className="text-xs font-semibold bg-muted/65 px-2.5 py-1 rounded-lg border border-border/30 text-foreground">
                                            {evaluation._count?.attempts || 0}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center py-3.5 hidden md:table-cell">
                                        <code className="text-[11px] bg-muted/80 text-muted-foreground px-2.5 py-1 rounded-lg font-mono border border-border/30 tracking-tight shadow-inner-sm">
                                            {format(new Date(evaluation.createdAt), "dd/MM/yyyy HH:mm")}
                                        </code>
                                    </TableCell>
                                    <TableCell className="text-right py-3.5 pr-5">
                                        <div className="flex justify-end items-center gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-300"
                                                title="Ver/Editar Preguntas"
                                                asChild
                                            >
                                                <Link href={`/dashboard/teacher/evaluations/${evaluation.id}`}>
                                                    <FileQuestion className="h-4 w-4" />
                                                </Link>
                                            </Button>

                                            <Dialog>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-9 w-9 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-300"
                                                            title="Acciones"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40">
                                                        <DropdownMenuItem onClick={() => handleOpenEdit(evaluation)} className="cursor-pointer">
                                                            <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
                                                            <span>Editar</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleExport(evaluation)} className="cursor-pointer">
                                                            <Download className="mr-2 h-4 w-4 text-muted-foreground" />
                                                            <span>Exportar</span>
                                                        </DropdownMenuItem>
                                                        <DialogTrigger asChild>
                                                            <DropdownMenuItem className="text-red-600 focus:text-red-700 cursor-pointer">
                                                                <Trash2 className="mr-2 h-4 w-4 text-red-600 focus:text-red-700" />
                                                                <span>Eliminar</span>
                                                            </DropdownMenuItem>
                                                        </DialogTrigger>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                <DialogTrigger asChild>
                                                    <div />
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <form
                                                        action={async (formData) => {
                                                            await deleteEvaluationAction(formData);
                                                        }}
                                                    >
                                                        <input type="hidden" name="evaluationId" value={evaluation.id} />
                                                        <DialogHeader>
                                                            <DialogTitle>Confirmar eliminación</DialogTitle>
                                                            <DialogDescription>
                                                                Escribe <strong>ELIMINAR</strong> para confirmar. Esto borrará la evaluación y todas sus preguntas e intentos asociados.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid grid-cols-4 items-center gap-4 py-4">
                                                            <Label htmlFor={`confirm-${evaluation.id}`} className="text-right">
                                                                Confirmación
                                                            </Label>
                                                            <Input
                                                                id={`confirm-${evaluation.id}`}
                                                                name="confirmText"
                                                                placeholder="ELIMINAR"
                                                                pattern="^ELIMINAR$"
                                                                required
                                                                className="col-span-3"
                                                            />
                                                        </div>
                                                        <DialogFooter>
                                                            <Button type="submit" variant="destructive">
                                                                Confirmar eliminación
                                                            </Button>
                                                        </DialogFooter>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredEvaluations.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center pl-5">
                                        No se encontraron evaluaciones.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
