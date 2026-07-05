"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pdf } from "@react-pdf/renderer";
import { SubmissionPDF } from "./SubmissionPDF";

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
        answer?: {
            answer: string;
            score: number | null;
            aiFeedback: any;
        };
    }>;
}

export function DownloadSubmissionPDF(props: DownloadSubmissionPDFProps) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
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
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            className="gap-2"
            onClick={handleDownload}
            disabled={loading}
        >
            <FileText className="h-4 w-4" />
            {loading ? "Preparando..." : "Descargar PDF"}
        </Button>
    );
}
