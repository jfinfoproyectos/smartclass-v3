"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createRemarkAction, updateRemarkAction } from "@/features/teacher/actions/remarkActions";;
import { toast } from "sonner";
import { MessageSquareWarning, Award } from "lucide-react";

interface RemarkManagerProps {
    courseId: string;
    userId: string;
    studentName: string;
    onRemarkCreated?: () => void;
    editingRemark?: any;
    onClose?: () => void;
}

export function RemarkManager({ courseId, userId, studentName, onRemarkCreated, editingRemark, onClose }: RemarkManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<"ATTENTION" | "COMMENDATION">(editingRemark?.type || "ATTENTION");
    const [title, setTitle] = useState(editingRemark?.title || "");
    const [description, setDescription] = useState(editingRemark?.description || "");
    const [date, setDate] = useState(editingRemark ? new Date(editingRemark.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);

    // Update state when editingRemark changes
    useEffect(() => {
        if (editingRemark) {
            setType(editingRemark.type);
            setTitle(editingRemark.title);
            setDescription(editingRemark.description);
            setDate(new Date(editingRemark.date).toISOString().split('T')[0]);
            setIsOpen(true);
        }
    }, [editingRemark]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userId) {
            console.error("RemarkManager: Missing userId!");
            toast.error("Error: No se encontró el ID del estudiante");
            return;
        }

        if (!title || !description || !date) {
            toast.error("Por favor completa todos los campos");
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading("Procesando...");

        try {
            const formData = new FormData();
            formData.append("type", type);
            formData.append("title", title);
            formData.append("description", description);
            formData.append("date", date);
            formData.append("courseId", courseId);

            if (editingRemark) {
                // Update existing remark
                formData.append("remarkId", editingRemark.id);
                await updateRemarkAction(formData);
                toast.success("Observación actualizada", { id: toastId });
            } else {
                // Create new remark
                formData.append("userId", userId);
                await createRemarkAction(formData);
                toast.success(
                    type === "ATTENTION"
                        ? "Llamado de atención registrado"
                        : "Felicitación registrada",
                    { id: toastId }
                );
            }

            setIsOpen(false);
            setTitle("");
            setDescription("");
            setType("ATTENTION");

            // Refresh remarks list
            if (onRemarkCreated) {
                onRemarkCreated();
            }

            // Call onClose if provided (for edit mode)
            if (onClose) {
                onClose();
            }
        } catch (error: any) {
            console.error("Error with remark:", error);
            toast.error(error.message || "Error al procesar", { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open && onClose) onClose();
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <MessageSquareWarning className="h-4 w-4" />
                    Nueva Observación
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{editingRemark ? "Editar Observación" : "Registrar Observación"}</DialogTitle>
                    <DialogDescription>
                        {editingRemark ? `Edita la observación para ${studentName}.` : `Registra un llamado de atención o felicitación para ${studentName}.`}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Tipo</Label>
                        <RadioGroup value={type} onValueChange={(value) => setType(value as "ATTENTION" | "COMMENDATION")}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="ATTENTION" id="attention" />
                                <Label htmlFor="attention" className="flex items-center gap-2 cursor-pointer">
                                    <MessageSquareWarning className="h-4 w-4 text-red-500" />
                                    Llamado de Atención
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="COMMENDATION" id="commendation" />
                                <Label htmlFor="commendation" className="flex items-center gap-2 cursor-pointer">
                                    <Award className="h-4 w-4 text-green-500" />
                                    Felicitación
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date">Fecha</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                            id="title"
                            placeholder="Ej: Comportamiento disruptivo en clase"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe la situación..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                            setIsOpen(false);
                            if (onClose) onClose();
                        }} disabled={submitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? (editingRemark ? "Actualizando..." : "Registrando...") : (editingRemark ? "Actualizar" : "Registrar")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
