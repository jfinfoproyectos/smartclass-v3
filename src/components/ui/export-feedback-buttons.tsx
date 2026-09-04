"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { ActivityReportPDF } from "@/features/student/components/ActivityReportPDF";
import { exportSingleSubmissionToExcel } from "@/lib/export-utils";
import { toast } from "sonner";

interface ExportFeedbackButtonsProps {
    activity: any;
    submission: any;
    studentName: string;
    studentEmail?: string;
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
    label?: string;
    className?: string;
}

export function ExportFeedbackButtons({
    activity,
    submission,
    studentName,
    studentEmail,
    variant = "outline",
    size = "sm",
    label = "Exportar",
    className = ""
}: ExportFeedbackButtonsProps) {
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const handleExportPdf = async () => {
        setIsExportingPdf(true);
        try {
            const blob = await pdf(
                <ActivityReportPDF
                    activity={activity}
                    submission={submission}
                    studentName={studentName}
                />
            ).toBlob();
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const safeStudent = studentName.replace(/[^a-zA-Z0-9_\-]/g, "_");
            const safeTitle = (activity.title || "Actividad").replace(/[^a-zA-Z0-9_\-]/g, "_");
            link.download = `Retroalimentacion_${safeStudent}_${safeTitle}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            toast.success("Reporte PDF descargado exitosamente");
        } catch (error: any) {
            console.error("Error al exportar PDF:", error);
            toast.error("No se pudo generar el PDF");
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleExportExcel = async () => {
        setIsExportingExcel(true);
        try {
            await exportSingleSubmissionToExcel(
                activity,
                submission,
                studentName,
                studentEmail
            );
            toast.success("Reporte Excel descargado exitosamente");
        } catch (error: any) {
            console.error("Error al exportar Excel:", error);
            toast.error("No se pudo generar el archivo Excel");
        } finally {
            setIsExportingExcel(false);
        }
    };

    const isLoading = isExportingPdf || isExportingExcel;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={variant} size={size} disabled={isLoading} className={className}>
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="mr-2 h-4 w-4" />
                    )}
                    {label}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPdf} disabled={isExportingPdf}>
                    <FileText className="mr-2 h-4 w-4 text-red-600" />
                    Exportar a PDF (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} disabled={isExportingExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                    Exportar a Excel (.xlsx)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
