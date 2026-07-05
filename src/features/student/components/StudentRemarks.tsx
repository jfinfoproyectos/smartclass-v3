"use client";

import { useEffect, useState } from "react";
import { getStudentRemarksAction } from "@/features/student/actions/remarkActions";;
import { Badge } from "@/components/ui/badge";
import { MessageSquareWarning, Award, Search, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatName } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface StudentRemarksProps {
    courseId: string;
    userId: string;
}

export function StudentRemarks({ courseId, userId }: StudentRemarksProps) {
    const [remarks, setRemarks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingRemark, setViewingRemark] = useState<any | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    useEffect(() => {
        const fetchRemarks = async () => {
            try {
                const data = await getStudentRemarksAction(courseId, userId);
                setRemarks(data);
            } catch (error) {
                console.error("Failed to fetch remarks", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRemarks();
    }, [courseId, userId]);

    const handleViewRemark = (remark: any) => {
        setViewingRemark(remark);
        setIsViewDialogOpen(true);
    };

    if (loading) {
        return <div className="text-sm text-muted-foreground">Cargando observaciones...</div>;
    }

    if (remarks.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm">
                No tienes observaciones registradas en este curso.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquareWarning className="h-4 w-4" />
                    Observaciones del Profesor
                </h3>
                <div className="text-xs text-muted-foreground">
                    {remarks.filter(r => r.type === "ATTENTION").length} atenciones, {remarks.filter(r => r.type === "COMMENDATION").length} felicitaciones
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Profesor</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {remarks.map((remark) => (
                            <TableRow key={remark.id}>
                                <TableCell className="text-sm">
                                    {format(new Date(remark.date), "PPP", { locale: es })}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {formatName(remark.teacher.name, remark.teacher.profile)}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={remark.type === "ATTENTION" ? "destructive" : "default"}
                                        className={remark.type === "COMMENDATION" ? "bg-green-100 text-green-800 hover:bg-green-200 border-green-200" : ""}
                                    >
                                        {remark.type === "ATTENTION" ? (
                                            <><MessageSquareWarning className="h-3 w-3 mr-1" /> Atención</>
                                        ) : (
                                            <><Award className="h-3 w-3 mr-1" /> Felicitación</>
                                        )}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{remark.title}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewRemark(remark)}
                                    >
                                        Ver Descripción
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* View Remark Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detalle de Observación</DialogTitle>
                        <DialogDescription>
                            {viewingRemark && format(new Date(viewingRemark.date), "PPP", { locale: es })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <Badge
                                    variant={viewingRemark?.type === "ATTENTION" ? "destructive" : "default"}
                                    className={viewingRemark?.type === "COMMENDATION" ? "bg-green-100 text-green-800 hover:bg-green-200 border-green-200" : ""}
                                >
                                    {viewingRemark?.type === "ATTENTION" ? (
                                        <><MessageSquareWarning className="h-3 w-3 mr-1" /> Llamado de Atención</>
                                    ) : (
                                        <><Award className="h-3 w-3 mr-1" /> Felicitación</>
                                    )}
                                </Badge>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Profesor</Label>
                            <div className="p-2 bg-muted rounded-md font-medium">
                                {viewingRemark && formatName(viewingRemark.teacher.name, viewingRemark.teacher.profile)}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Título</Label>
                            <div className="p-2 bg-muted rounded-md font-medium">
                                {viewingRemark?.title}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <div className="p-3 bg-muted rounded-md">
                                {viewingRemark?.description}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-end">
                        <Button onClick={() => setIsViewDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
