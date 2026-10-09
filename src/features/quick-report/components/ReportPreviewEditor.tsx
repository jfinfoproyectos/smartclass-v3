"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Copy, 
  Check, 
  Download, 
  Printer, 
  ExternalLink, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Edit3, 
  Eye, 
  Headphones, 
  BookmarkCheck, 
  ListTodo, 
  FileCode,
  Maximize2,
  Minimize2,
  Share2,
  UserCheck,
  ChevronDown,
  BarChart3,
  Calendar,
  Layers,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GeneratedReport } from "../types";

interface ReportPreviewEditorProps {
  report: GeneratedReport;
  onUpdateReport: (updated: GeneratedReport) => void;
  onSaveToHistory: (report: GeneratedReport) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function ReportPreviewEditor({
  report,
  onUpdateReport,
  onSaveToHistory,
  isExpanded = false,
  onToggleExpand,
}: ReportPreviewEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"document" | "summary" | "actions" | "editor" | "audio">("document");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Marcar/Desmarcar compromiso
  const handleToggleActionItem = (id: string) => {
    const updatedItems = report.actionItems.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    const updated = { ...report, actionItems: updatedItems };
    onUpdateReport(updated);
  };

  // Copiar Markdown plano
  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(report.markdown);
      setCopiedType("md");
      toast.success("Informe copiado en formato Markdown.");
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      toast.error("Error al copiar al portapapeles.");
    }
  };

  // Copiar como Texto Enriquecido / HTML para Word / Google Docs / Teams
  const handleCopyRichText = async () => {
    try {
      const el = document.getElementById("report-rendered-content");
      if (!el) {
        await handleCopyMarkdown();
        return;
      }

      const htmlContent = `
        <div style="font-family: Calibri, Arial, sans-serif; color: #111; line-height: 1.6; font-size: 11pt;">
          ${el.innerHTML}
        </div>
      `;

      if (navigator.clipboard && window.ClipboardItem) {
        const textBlob = new Blob([report.markdown], { type: "text/plain" });
        const htmlBlob = new Blob([htmlContent], { type: "text/html" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob,
          }),
        ]);
        setCopiedType("rich");
        toast.success("¡Copiado con formato Word! Pega con Ctrl+V en Word, Google Docs o Teams.");
        setTimeout(() => setCopiedType(null), 2500);
      } else {
        await handleCopyMarkdown();
      }
    } catch (err) {
      console.warn("Fallo clipboard enriquecido, recurriendo a texto plano:", err);
      await handleCopyMarkdown();
    }
  };

  // Descargar archivo .doc (Word)
  const handleDownloadWordDoc = () => {
    const el = document.getElementById("report-rendered-content");
    const bodyHtml = el ? el.innerHTML : `<pre>${report.markdown}</pre>`;

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${report.title}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.6; margin: 2.5cm; }
          h1 { color: #0f172a; font-size: 18pt; border-bottom: 2px solid #0284c7; padding-bottom: 6px; margin-top: 18pt; }
          h2 { color: #1e293b; font-size: 14pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 14pt; }
          h3 { color: #334155; font-size: 12pt; margin-top: 10pt; }
          table { width: 100%; border-collapse: collapse; margin: 12pt 0; font-size: 10pt; }
          th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; border: 1px solid #cbd5e1; padding: 6pt; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 6pt; vertical-align: top; }
          ul, ol { margin: 6pt 0 10pt 20pt; }
          li { margin-bottom: 4pt; }
          blockquote { border-left: 3pt solid #0284c7; padding-left: 10pt; color: #475569; margin: 10pt 0; background: #f8fafc; padding: 6pt 10pt; }
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
      </html>
    `;

    const blob = new Blob([docHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Documento Word (.doc) descargado.");
  };

  // Descargar archivo .md
  const handleDownloadMarkdown = () => {
    const blob = new Blob([report.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Archivo Markdown descargado.");
  };

  // Abrir en Studio Markdown a PDF Corporativo
  const handleOpenInMarkdownPdf = () => {
    try {
      localStorage.setItem("smartclass_import_markdown", report.markdown);
      toast.success("Transfiriendo al Studio Markdown a PDF...");
      router.push("/dashboard/teacher/tools/markdown-pdf");
    } catch {
      toast.error("No se pudo transferir al visor de PDF");
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs flex flex-col h-full min-h-0">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-1 flex flex-col min-h-0">
        {/* 1. BARRA SUPERIOR COMPACTA CON PESTAÑAS Y ACCIONES */}
        <div className="p-2.5 px-3 sm:px-4 border-b border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Pestañas de Navegación del Informe */}
          <TabsList className="h-8.5 bg-muted/70 p-0.5 rounded-xl border border-border/60">
            <TabsTrigger value="document" className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-2xs">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span>Documento</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-2xs">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
              <span>Síntesis & Claves</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-2xs">
              <ListTodo className="h-3.5 w-3.5 text-emerald-500" />
              <span>Compromisos ({report.actionItems.length})</span>
            </TabsTrigger>
            <TabsTrigger value="editor" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-2xs">
              <Edit3 className="h-3.5 w-3.5 text-amber-500" />
              <span>Editar</span>
            </TabsTrigger>
            {report.audioTranscription && (
              <TabsTrigger value="audio" className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-2xs">
                <Headphones className="h-3.5 w-3.5 text-rose-500" />
                <span>Audio</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Botones de Exportación Compactos Tipo Ícono con Tooltip */}
          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-xl border border-border/80">
            {/* Copiar para Word */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyRichText}
                  className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25 hover:bg-blue-500/20 shadow-2xs cursor-pointer"
                >
                  {copiedType === "rich" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copiar formato Word (Ctrl+V)</TooltipContent>
            </Tooltip>

            {/* Descargar Word (.doc) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleDownloadWordDoc}
                  className="h-8 w-8 rounded-lg bg-background hover:bg-muted cursor-pointer"
                >
                  <Download className="h-4 w-4 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Descargar Word (.doc)</TooltipContent>
            </Tooltip>

            {/* Abrir en PDF Corporativo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleOpenInMarkdownPdf}
                  className="h-8 w-8 rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir en PDF Corporativo</TooltipContent>
            </Tooltip>

            {/* Expandir / Minimizar */}
            {onToggleExpand && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onToggleExpand}
                    className="h-8 w-8 rounded-lg bg-background hover:bg-muted cursor-pointer"
                  >
                    {isExpanded ? (
                      <Minimize2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Maximize2 className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isExpanded ? "Volver a vista dividida" : "Expandir informe a pantalla completa"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Guardar en Historial */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onSaveToHistory(report)}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                >
                  <BookmarkCheck className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Guardar en historial</TooltipContent>
            </Tooltip>

            {/* Menú de Más Acciones */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg bg-background hover:bg-muted cursor-pointer"
                    >
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Más opciones de exportación</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={handleCopyMarkdown} className="gap-2 cursor-pointer">
                  <FileCode className="h-3.5 w-3.5 text-primary" />
                  <span>Copiar Markdown plano</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadMarkdown} className="gap-2 cursor-pointer">
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>Descargar archivo .MD</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.print()} className="gap-2 cursor-pointer">
                  <Printer className="h-3.5 w-3.5 text-primary" />
                  <span>Imprimir / Guardar PDF</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 2. PESTAÑA: DOCUMENTO OFICIAL (ESPACIO GIGANTE DE VISUALIZACIÓN) */}
        <TabsContent value="document" className="flex-1 overflow-y-auto p-3 sm:p-6 sm:px-8 m-0 bg-muted/20">
          <div className="max-w-4xl mx-auto bg-card border border-border/80 shadow-xs rounded-2xl p-6 sm:p-10 space-y-5">
            {/* Membrete Oficial Estilizado y Compacto */}
            <div className="border-b-2 border-primary/30 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="space-y-0.5">
                <p className="font-mono text-[10px] tracking-wider uppercase text-primary font-bold">
                  SISTEMA DE GESTIÓN ACADÉMICA • SMARTCLASS
                </p>
                <p className="font-semibold text-foreground text-xs">
                  DOCUMENTO OFICIAL DE EVIDENCIA Y REGISTRO PEDAGÓGICO
                </p>
              </div>
              <div className="flex items-center gap-2 sm:text-right text-[11px] font-mono flex-wrap">
                <Badge variant="outline" className="text-[10px] font-medium">
                  {report.date}
                </Badge>
                {report.courseTitle && (
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    {report.courseTitle}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] font-medium text-emerald-600 bg-emerald-500/5 border-emerald-500/20">
                  Radicado Oficial
                </Badge>
              </div>
            </div>

            {/* Contenido Renderizado con Excelente Espacio */}
            <div
              id="report-rendered-content"
              className="prose dark:prose-invert prose-base max-w-none 
                prose-headings:font-black prose-headings:tracking-tight 
                prose-h1:text-xl sm:prose-h1:text-2xl prose-h1:text-primary prose-h1:border-b prose-h1:border-border/80 prose-h1:pb-2 prose-h1:mt-2
                prose-h2:text-lg sm:prose-h2:text-xl prose-h2:text-foreground prose-h2:border-b prose-h2:border-border/40 prose-h2:pb-1.5 prose-h2:mt-6
                prose-h3:text-base sm:prose-h3:text-lg prose-h3:mt-4
                prose-table:w-full prose-table:border prose-table:border-border/80 prose-table:my-4
                prose-th:bg-muted/80 prose-th:text-foreground prose-th:p-3 prose-th:border prose-th:border-border/80 prose-th:text-xs prose-th:font-bold
                prose-td:p-3 prose-td:border prose-td:border-border/60 prose-td:text-xs prose-td:leading-relaxed
                prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground/90
                prose-li:text-sm prose-li:leading-relaxed
                prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1.5 prose-blockquote:px-4 prose-blockquote:rounded-r-xl"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.markdown}
              </ReactMarkdown>
            </div>
          </div>
        </TabsContent>

        {/* 3. PESTAÑA: SÍNTESIS & CLAVES */}
        <TabsContent value="summary" className="flex-1 overflow-y-auto p-4 sm:p-6 m-0 space-y-4 bg-muted/20">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Tarjeta de Síntesis Ejecutiva */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Sparkles className="h-4 w-4" />
                <span>Síntesis Ejecutiva de la Sesión</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-foreground/90">
                {report.summary}
              </p>
            </div>

            {/* Puntos Clave Identificados */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                  Aspectos Clave & Hallazgos ({report.keyPoints.length})
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Tono: {report.tone}
                </Badge>
              </div>

              <div className="space-y-2">
                {report.keyPoints.map((pt, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 font-bold shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="text-foreground leading-relaxed pt-0.5">{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadatos Rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-card border border-border/80 text-xs space-y-0.5">
                <span className="text-muted-foreground text-[11px]">Fecha Oficial:</span>
                <p className="font-bold text-foreground">{report.date}</p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/80 text-xs space-y-0.5">
                <span className="text-muted-foreground text-[11px]">Ficha / Grupo:</span>
                <p className="font-bold text-foreground">{report.courseTitle || "General (Sin ficha)"}</p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/80 text-xs space-y-0.5">
                <span className="text-muted-foreground text-[11px]">Compromisos:</span>
                <p className="font-bold text-emerald-600">{report.actionItems.length} registrados</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 4. PESTAÑA: COMPROMISOS & TAREAS */}
        <TabsContent value="actions" className="flex-1 overflow-y-auto p-4 sm:p-6 m-0 space-y-4 bg-muted/20">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">Matriz de Compromisos y Tareas</h3>
                <p className="text-xs text-muted-foreground">
                  Tareas identificadas para dar seguimiento formal a los acuerdos de la sesión.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                {report.actionItems.filter((a) => a.completed).length} / {report.actionItems.length} completados
              </Badge>
            </div>

            {report.actionItems.length > 0 ? (
              <div className="space-y-2.5">
                {report.actionItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleActionItem(item.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      item.completed
                        ? "bg-muted/40 border-border/60 opacity-60"
                        : "bg-card border-border/80 hover:border-primary/40 shadow-xs"
                    }`}
                  >
                    <button type="button" className="mt-0.5 shrink-0 text-primary">
                      {item.completed ? (
                        <CheckSquare className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1 space-y-1">
                      <p className={`text-xs sm:text-sm font-semibold ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.task}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <span className="font-bold text-primary">
                          👤 {item.responsible}
                        </span>
                        {item.deadline && (
                          <span>
                            📅 Plazo: {item.deadline}
                          </span>
                        )}
                        {item.priority && (
                          <Badge
                            variant="secondary"
                            className={`text-[9px] font-bold ${
                              item.priority === "alta"
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                : item.priority === "media"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            }`}
                          >
                            {item.priority.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">
                No se identificaron compromisos pendientes específicos.
              </p>
            )}

            {/* Participantes Citados */}
            {report.participants && report.participants.length > 0 && (
              <div className="pt-4 border-t border-border/60 space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Actores o Aprendices Mencionados ({report.participants.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {report.participants.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-card border border-border/60 text-xs space-y-1 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{p.name}</span>
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {p.roleOrStatus}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {p.observation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 5. PESTAÑA: EDITOR DE MARKDOWN */}
        <TabsContent value="editor" className="flex-1 overflow-hidden p-4 sm:p-6 m-0 flex flex-col bg-muted/20">
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs text-muted-foreground font-medium">
              Puedes ajustar nombres, corregir cifras o añadir apartados en tiempo real:
            </p>
            <span className="text-[11px] font-mono text-muted-foreground">
              {report.markdown.length} caracteres
            </span>
          </div>
          <Textarea
            value={report.markdown}
            onChange={(e) => onUpdateReport({ ...report, markdown: e.target.value })}
            className="flex-1 w-full font-mono text-xs sm:text-sm leading-relaxed resize-none rounded-xl bg-card border-border/80 p-4"
          />
        </TabsContent>

        {/* 6. PESTAÑA: TRANSCRIPCIÓN DE AUDIO */}
        {report.audioTranscription && (
          <TabsContent value="audio" className="flex-1 overflow-y-auto p-4 sm:p-6 m-0 bg-muted/20">
            <div className="max-w-3xl mx-auto p-5 rounded-2xl bg-card border border-rose-500/20 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Headphones className="h-5 w-5" />
                <h4 className="text-sm font-bold text-foreground">
                  Transcripción Multimodal del Audio Grabado
                </h4>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap font-sans">
                {report.audioTranscription}
              </p>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
