"use client";

import React, { useState, useEffect, useRef } from "react";
import { pdf } from "@react-pdf/renderer";
import { 
  Download, 
  Printer, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Loader2, 
  FileText, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { CorporatePDFDocument } from "./CorporatePDFDocument";
import { DocumentMetadata, DocumentStyleConfig } from "../types";

interface PDFPreviewPaneProps {
  markdown: string;
  metadata: DocumentMetadata;
  styleConfig: DocumentStyleConfig;
  onOpenSettings: () => void;
}

export function PDFPreviewPane({
  markdown,
  metadata,
  styleConfig,
  onOpenSettings,
}: PDFPreviewPaneProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortControllerRef = useRef<number | null>(null);

  // Generador reactivo con debounce del documento PDF
  useEffect(() => {
    if (abortControllerRef.current) {
      window.clearTimeout(abortControllerRef.current);
    }

    setIsGenerating(true);
    setErrorMsg(null);

    abortControllerRef.current = window.setTimeout(async () => {
      try {
        const doc = (
          <CorporatePDFDocument
            markdown={markdown}
            metadata={metadata}
            styleConfig={styleConfig}
          />
        );

        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);

        setPdfUrl((prevUrl) => {
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          return url;
        });
        setIsGenerating(false);
      } catch (err: any) {
        console.error("Error generating Corporate PDF:", err);
        setErrorMsg(err?.message || "Error al compilar el documento PDF");
        setIsGenerating(false);
      }
    }, 600);

    return () => {
      if (abortControllerRef.current) {
        window.clearTimeout(abortControllerRef.current);
      }
    };
  }, [markdown, metadata, styleConfig]);

  // Descarga directa con nombre corporativo
  const handleDownloadPdf = () => {
    if (!pdfUrl) {
      toast.error("El PDF aún se está generando...");
      return;
    }
    

    const cleanName = (metadata.title || "Documento_Corporativo")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 50);

    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `${cleanName}_${metadata.folioCode || "DOC"}.pdf`;
    link.click();
    toast.success("Descarga de PDF iniciada.");
  };

  const handleOpenInNewTab = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, "_blank");
  };

  const handlePrintPdf = () => {
    if (!pdfUrl) return;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
      }, 300);
    };
  };

  return (
    <div className="flex flex-col h-full bg-muted/20 rounded-2xl border border-border shadow-xs overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 px-3 border-b border-border/80 bg-muted/40 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
            <FileText className="w-3.5 h-3.5" />
            <span>PDF Live Preview</span>
          </div>

          {isGenerating ? (
            <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 bg-amber-500/10 border-amber-500/20 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Compilando PDF...
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Actualizado
            </Badge>
          )}
        </div>

        {/* Action Controls */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Reducir zoom</TooltipContent>
            </Tooltip>

            <span className="text-[11px] font-mono text-muted-foreground w-10 text-center">
              {zoomLevel}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Aumentar zoom</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={handlePrintPdf}
                  disabled={!pdfUrl}
                >
                  <Printer className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Imprimir PDF</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={handleOpenInNewTab}
                  disabled={!pdfUrl}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Abrir en pestaña nueva</TooltipContent>
            </Tooltip>

            <Button
              type="button"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={!pdfUrl || isGenerating}
              className="h-7 px-2.5 text-xs font-bold gap-1.5 ml-1 shadow-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar PDF
            </Button>
          </div>
        </TooltipProvider>
      </div>

      {/* PDF Viewport Container */}
      <div className="flex-1 relative bg-neutral-900/10 dark:bg-black/30 overflow-hidden flex items-center justify-center p-2">
        {errorMsg ? (
          <div className="p-6 max-w-md text-center bg-card rounded-2xl border border-destructive/30 shadow-lg space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Error al procesar el Markdown</h3>
              <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
            </div>
          </div>
        ) : pdfUrl ? (
          <div 
            className="w-full h-full flex items-center justify-center transition-transform duration-150"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
          >
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full rounded-xl border border-border/70 shadow-2xl bg-white"
              title="Previsualización Corporativa PDF"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-semibold">Generando previsualización corporativa...</p>
          </div>
        )}
      </div>
    </div>
  );
}
