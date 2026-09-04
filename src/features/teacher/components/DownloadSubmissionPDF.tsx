"use client";

import { useState } from "react";
import { FileText, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pdf } from "@react-pdf/renderer";
import { SubmissionPDF } from "./SubmissionPDF";
import { toast } from "sonner";

export interface DownloadSubmissionPDFProps {
    appTitle: string;
    studentName: string;
    studentEmail: string;
    evaluationTitle: string;
    courseName: string;
    teacherName: string;
    startTime: Date;
    endTime: Date;
    submittedAt: Date | null;
    score: number | null;
    totalQuestions: number;
    answeredQuestions: number;
    expulsions: number;
    questions: Array<{
        id: string;
        text: string;
        type: string;
        language?: string;
        referenceAnswer?: string;
        answer?: {
            answer: string;
            score: number | null;
            aiFeedback: any;
        };
    }>;
}

export function DownloadSubmissionPDF(props: DownloadSubmissionPDFProps) {
    const [actionState, setActionState] = useState<"download" | "print" | null>(null);

    const handleDownload = async () => {
        setActionState("download");
        try {
            const blob = await pdf(<SubmissionPDF {...props} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const safeName = props.studentName.replace(/\s+/g, "_");
            const safeEval = props.evaluationTitle.replace(/\s+/g, "_");
            link.download = `Entrega_${safeName}_${safeEval}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            toast.success("PDF descargado correctamente");
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Error al generar el PDF para descarga");
        } finally {
            setActionState(null);
        }
    };

    const handlePrint = async () => {
        setActionState("print");
        try {
            const blob = await pdf(<SubmissionPDF {...props} />).toBlob();
            const url = URL.createObjectURL(blob);

            // Create a hidden iframe for seamless browser print preview
            const iframe = document.createElement("iframe");
            iframe.style.position = "fixed";
            iframe.style.right = "0";
            iframe.style.bottom = "0";
            iframe.style.width = "0";
            iframe.style.height = "0";
            iframe.style.border = "none";
            iframe.src = url;

            document.body.appendChild(iframe);

            iframe.onload = () => {
                setTimeout(() => {
                    try {
                        iframe.contentWindow?.focus();
                        iframe.contentWindow?.print();
                    } catch {
                        // Fallback in case iframe cross-context print is restricted
                        window.open(url, "_blank");
                    }
                    setTimeout(() => {
                        try {
                            document.body.removeChild(iframe);
                            URL.revokeObjectURL(url);
                        } catch {
                            // cleanup safe
                        }
                    }, 60000);
                }, 250);
            };
        } catch (error) {
            console.error("Error preparing print PDF:", error);
            toast.error("Error al preparar la impresión del PDF");
        } finally {
            setActionState(null);
        }
    };

    return (
        <div className="flex items-center gap-2 print:hidden">
            <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shadow-xs hover:bg-muted/80"
                onClick={handlePrint}
                disabled={actionState !== null}
            >
                {actionState === "print" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                    <Printer className="h-4 w-4 text-blue-600" />
                )}
                {actionState === "print" ? "Preparando..." : "Imprimir"}
            </Button>

            <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shadow-xs hover:bg-muted/80"
                onClick={handleDownload}
                disabled={actionState !== null}
            >
                {actionState === "download" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                    <FileText className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                )}
                {actionState === "download" ? "Generando..." : "Descargar PDF"}
            </Button>
        </div>
    );
}
