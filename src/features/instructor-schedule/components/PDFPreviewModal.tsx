"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Printer, 
  Loader2, 
  FileText, 
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { InstructorScheduleProfile } from "../types";
import { InstructorSchedulePDF } from "./InstructorSchedulePDF";
import { toast } from "sonner";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: InstructorScheduleProfile;
}

export function PDFPreviewModal({
  isOpen,
  onClose,
  profile,
}: PDFPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortControllerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (abortControllerRef.current) {
      window.clearTimeout(abortControllerRef.current);
    }

    abortControllerRef.current = window.setTimeout(async () => {
      setIsGenerating(true);
      setErrorMsg(null);
      try {
        const doc = <InstructorSchedulePDF profile={profile} />;
        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);

        setPdfUrl((prevUrl) => {
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          return url;
        });
        setIsGenerating(false);
      } catch (err: unknown) {
        console.error("Error generating Instructor Schedule PDF:", err);
        const message = err instanceof Error ? err.message : String(err);
        setErrorMsg(message || "Error al compilar el documento PDF");
        setIsGenerating(false);
      }
    }, 200);

    return () => {
      if (abortControllerRef.current) {
        window.clearTimeout(abortControllerRef.current);
      }
    };
  }, [isOpen, profile]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const sanitizedName = (profile.instructorName || "instructor").toLowerCase().replace(/[^a-z0-9]/g, "_");
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `horario_instructor_${sanitizedName}_${profile.academicYear || 2026}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Documento PDF descargado.");
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl, "_blank");
    if (printWindow) {
      printWindow.focus();
    } else {
      toast.info("Por favor habilita las ventanas emergentes para imprimir.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[950px] p-5 rounded-3xl max-h-[92vh] flex flex-col border-border/80 shadow-2xl">
        <DialogHeader className="space-y-1 pb-2 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-foreground">
                  Previsualización de Horario Oficial en PDF
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Formato horizontal corporativo SmartClass con KPIs y resumen multi-institucional.
                </DialogDescription>
              </div>
            </div>

            {/* Controles de barra superior */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 text-xs">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
                  className="h-6 w-6 rounded-lg"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="font-mono px-1 font-bold text-[11px]">{zoomLevel}%</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
                  className="h-6 w-6 rounded-lg"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
                disabled={!pdfUrl || isGenerating}
                className="h-8 rounded-xl text-xs font-bold gap-1.5 border-border/80"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>

              <Button
                size="sm"
                onClick={handleDownload}
                disabled={!pdfUrl || isGenerating}
                className="h-8 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar PDF</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Visor PDF */}
        <div className="flex-1 min-h-[460px] bg-slate-900/90 dark:bg-black/80 rounded-2xl border border-border/60 overflow-hidden relative flex items-center justify-center p-2">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs font-bold tracking-wide">Compilando documento PDF con @react-pdf...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl bg-destructive/20 border border-destructive text-destructive text-center text-xs max-w-md">
              <p className="font-bold">Error al generar PDF:</p>
              <p className="mt-1 opacity-90">{errorMsg}</p>
            </div>
          ) : pdfUrl ? (
            <div 
              className="w-full h-full flex items-center justify-center transition-all duration-200 overflow-auto"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center center" }}
            >
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full min-h-[460px] rounded-xl bg-white shadow-2xl"
                title="Visor PDF Horario"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="pt-2 border-t border-border/60 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {profile.slots.length} clases asignadas • {profile.institutions.length} instituciones activas
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-4 rounded-xl text-xs font-bold"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
