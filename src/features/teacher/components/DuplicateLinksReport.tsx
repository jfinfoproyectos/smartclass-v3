"use client";

import { useEffect, useState, useRef } from "react";
import { getCourseDuplicateLinksAction } from "@/features/teacher/actions/reportActions";;;
import { Button } from "@/components/ui/button";
import { Loader2, FileWarning, Printer, AlertTriangle } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface DuplicateLinksReportProps {
    courseId: string;
    courseName: string;
}

export function DuplicateLinksReport({ courseId, courseName }: DuplicateLinksReportProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Reporte_Duplicados_${courseName.replace(/\s+/g, '_')}`,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getCourseDuplicateLinksAction(courseId);
                setData(result);
            } catch (error) {
                console.error("Failed to fetch duplicate links:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [courseId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                    <FileWarning className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">¡Todo limpio!</h3>
                <p className="text-muted-foreground mt-2">
                    No se encontraron enlaces duplicados en las entregas de este curso.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Enlaces Duplicados Detectados
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Se encontraron {data.length} actividades con entregas duplicadas.
                    </p>
                </div>
                <Button onClick={handlePrint} variant="outline" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Generar PDF
                </Button>
            </div>

            <div className="overflow-y-auto">
                {/* Printable Content */}
                <div ref={componentRef} className="space-y-8 p-4 bg-background text-foreground print:p-8 print:bg-white print:text-black">
                    <div className="hidden print:block mb-6 border-b pb-4">
                        <h1 className="text-2xl font-bold">Reporte de Enlaces Duplicados</h1>
                        <p className="text-muted-foreground">Curso: {courseName}</p>
                        <p className="text-sm text-muted-foreground">Generado el: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                    </div>

                    {data.map((activity) => (
                        <div key={activity.activityId} className="space-y-4">
                            <h4 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                                <span className="bg-muted px-2 py-1 rounded text-sm border">Actividad</span>
                                {activity.activityTitle}
                            </h4>

                            <div className="space-y-6 pl-4">
                                {activity.duplicates.map((dup: any, idx: number) => (
                                    <div key={idx} className="bg-destructive/10 border border-destructive/20 rounded-md p-4 break-inside-avoid">
                                        <div className="mb-3">
                                            <span className="text-xs font-bold text-destructive uppercase tracking-wider">Enlace Duplicado:</span>
                                            <div className="mt-1 p-2 bg-background border border-destructive/20 rounded text-sm font-mono break-all text-destructive">
                                                {dup.url}
                                            </div>
                                        </div>

                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent border-destructive/20">
                                                    <TableHead className="text-destructive h-8">Estudiante</TableHead>
                                                    <TableHead className="text-destructive h-8">Correo</TableHead>
                                                    <TableHead className="text-destructive h-8">Fecha Entrega</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {dup.students.map((student: any, sIdx: number) => (
                                                    <TableRow key={sIdx} className="hover:bg-transparent border-destructive/10">
                                                        <TableCell className="py-2 font-medium">{student.name}</TableCell>
                                                        <TableCell className="py-2 text-muted-foreground truncate max-w-[200px]">{student.email}</TableCell>
                                                        <TableCell className="py-2 text-muted-foreground">
                                                            {new Date(student.submissionDate).toLocaleString()}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
