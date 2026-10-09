"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  Mic, 
  History, 
  RotateCcw, 
  BookOpen, 
  CheckCircle2, 
  GraduationCap, 
  HelpCircle,
  Wand2,
  Share2,
  FileSpreadsheet,
  Columns,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutGrid,
  Building2,
  Copy,
  Check,
  Download,
  ExternalLink,
  BookmarkCheck,
  ChevronDown,
  FileCode,
  Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { AudioVoiceRecorder } from "./AudioVoiceRecorder";
import { QuickNotesEditor } from "./QuickNotesEditor";
import { ReportPreviewEditor } from "./ReportPreviewEditor";
import { ReportHistoryModal } from "./ReportHistoryModal";
import { generateReportAction } from "../actions/reportAiActions";
import type { 
  GeneratedReport, 
  ReportTemplateType, 
  ReportTone 
} from "../types";
import type { CourseWithStudents } from "@/features/teacher/components/TeacherToolsView";

interface QuickReportToolViewProps {
  courses: CourseWithStudents[];
}

const STORAGE_KEY = "smartclass_saved_ai_reports";

type LayoutMode = "split" | "document" | "inputs";

export function QuickReportToolView({ courses }: QuickReportToolViewProps) {
  // Configuración de Entrada
  const [quickNotes, setQuickNotes] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateType>("class_session");
  const [selectedTone, setSelectedTone] = useState<ReportTone>("institutional");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("none");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // Modo de visualización (Dividido, Solo Documento, Solo Entradas)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("split");

  // Audio Data
  const [audioData, setAudioData] = useState<{
    base64?: string;
    mimeType?: string;
    fileName?: string;
    url?: string;
    durationSec?: number;
  } | null>(null);

  // Estados de Generación
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Historial Local
  const [savedReports, setSavedReports] = useState<GeneratedReport[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Cargar historial de localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedReports(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Error cargando historial de informes:", e);
    }
  }, []);

  // Guardar en historial
  const handleSaveToHistory = (report: GeneratedReport) => {
    try {
      const filtered = savedReports.filter((r) => r.id !== report.id);
      const updated = [report, ...filtered].slice(0, 30);
      setSavedReports(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      toast.success("Informe guardado en tu historial local.");
    } catch (e) {
      toast.error("No se pudo guardar en el historial.");
    }
  };

  const handleDeleteHistoryReport = (id: string) => {
    const updated = savedReports.filter((r) => r.id !== id);
    setSavedReports(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.info("Informe eliminado del historial.");
  };

  const handleClearAllHistory = () => {
    setSavedReports([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.info("Historial vaciado.");
  };

  // Recibir transcripción en vivo desde Web Speech API
  const handleLiveTranscript = (transcriptText: string) => {
    setQuickNotes((prev) => {
      if (!prev.trim()) return transcriptText;
      if (prev.endsWith("\n") || prev.endsWith(" ")) return `${prev}${transcriptText}`;
      return `${prev} ${transcriptText}`;
    });
  };

  // Copiar como Texto Enriquecido / HTML para Word / Google Docs / Teams
  const handleCopyRichText = async () => {
    if (!generatedReport) return;
    try {
      const el = document.getElementById("report-rendered-content");
      const htmlContent = el ? `
        <div style="font-family: Calibri, Arial, sans-serif; color: #111; line-height: 1.6; font-size: 11pt;">
          ${el.innerHTML}
        </div>
      ` : `<pre>${generatedReport.markdown}</pre>`;

      if (navigator.clipboard && window.ClipboardItem) {
        const textBlob = new Blob([generatedReport.markdown], { type: "text/plain" });
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
    if (!generatedReport) return;
    const el = document.getElementById("report-rendered-content");
    const bodyHtml = el ? el.innerHTML : `<pre>${generatedReport.markdown}</pre>`;

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${generatedReport.title}</title>
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
    a.download = `${generatedReport.title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Documento Word (.doc) descargado.");
  };

  // Abrir en Studio Markdown a PDF Corporativo
  const handleOpenInMarkdownPdf = () => {
    if (!generatedReport) return;
    try {
      localStorage.setItem("smartclass_import_markdown", generatedReport.markdown);
      toast.success("Transfiriendo al Studio Markdown a PDF...");
      window.location.href = "/dashboard/teacher/tools/markdown-pdf";
    } catch {
      toast.error("No se pudo transferir al visor de PDF");
    }
  };

  // Copiar Markdown plano
  const handleCopyMarkdown = async () => {
    if (!generatedReport) return;
    try {
      await navigator.clipboard.writeText(generatedReport.markdown);
      setCopiedType("md");
      toast.success("Informe copiado en formato Markdown.");
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      toast.error("Error al copiar al portapapeles.");
    }
  };

  // Descargar archivo .md
  const handleDownloadMarkdown = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedReport.title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Archivo Markdown descargado.");
  };

  // Ejecutar Generación de Informe
  const handleGenerate = async () => {
    if (!quickNotes.trim() && !audioData?.base64 && !audioData?.url) {
      toast.error("Por favor proporciona algunas notas rápidas, dicta por voz o sube un archivo de audio.");
      return;
    }

    setIsGenerating(true);

    try {
      const selectedCourse = courses.find((c) => c.id === selectedCourseId);
      const studentRoster = selectedCourse
        ? selectedCourse.students.map((s) => s.user.name).filter(Boolean)
        : undefined;

      const res = await generateReportAction({
        quickNotes,
        audioBase64: audioData?.base64,
        audioMimeType: audioData?.mimeType,
        audioUrl: audioData?.url,
        audioFileName: audioData?.fileName,
        reportType: selectedTemplate,
        tone: selectedTone,
        courseTitle: selectedCourse?.title,
        courseId: selectedCourse?.id,
        studentRoster,
        additionalInstructions,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || "No se pudo generar el informe.");
      }

      setGeneratedReport(res.data);
      handleSaveToHistory(res.data);
      toast.success("¡Informe generado con éxito!");
    } catch (error: any) {
      console.error("Error al generar informe:", error);
      toast.error(error.message || "Error al procesar la solicitud con IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Limpiar formulario para nuevo informe
  const handleReset = () => {
    setQuickNotes("");
    setAudioData(null);
    setAdditionalInstructions("");
    setGeneratedReport(null);
    setLayoutMode("split");
    toast.info("Formulario reiniciado para un nuevo informe.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] w-full overflow-hidden p-2 sm:p-3 space-y-2">
      {/* 1. BARRA SUPERIOR PRINCIPAL CON BOTONES TIPO ICONO Y TOOLTIP */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 px-3 sm:px-4 rounded-2xl border border-border bg-card shadow-xs shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/dashboard/teacher/tools">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-xl border-border bg-muted/40 hover:bg-muted cursor-pointer shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-foreground truncate flex items-center gap-1.5">
                Generador de Informes IA
              </h1>
              <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px] font-bold shrink-0">
                Voz & Ideas
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground hidden md:block truncate">
              Bitácoras, actas, visitas técnicas y seguimiento a partir de audios grabados o apuntes sueltos.
            </p>
          </div>
        </div>

        {/* 2. ACCIONES EN LA BARRA DE ENCIMA (BOTONES TIPO ÍCONO CON TOOLTIP) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* BOTONES TIPO ÍCONO DE ACCIÓN DEL INFORME (CUANDO ESTÁ GENERADO) */}
          {generatedReport && (
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

              {/* Expandir / Vista Dividida */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setLayoutMode((prev) => (prev === "document" ? "split" : "document"))}
                    className="h-8 w-8 rounded-lg bg-background hover:bg-muted cursor-pointer"
                  >
                    {layoutMode === "document" ? (
                      <Minimize2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Maximize2 className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {layoutMode === "document" ? "Volver a vista dividida" : "Expandir informe a pantalla completa"}
                </TooltipContent>
              </Tooltip>

              {/* Guardar en Historial */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSaveToHistory(generatedReport)}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    <BookmarkCheck className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Guardar en historial local</TooltipContent>
              </Tooltip>

              {/* Más Opciones (Dropdown con icono) */}
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
          )}

          {/* Conmutador de Vistas: Dividido vs Solo Informe vs Solo Entradas */}
          <div className="hidden sm:flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/80">
            <button
              type="button"
              onClick={() => setLayoutMode("split")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                layoutMode === "split"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista en 2 columnas: Entradas e Informe"
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Dividido</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode("document")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                layoutMode === "document"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Ampliar visualización del informe a pantalla completa"
            >
              <Maximize2 className="h-3.5 w-3.5 text-primary" />
              <span>Solo Informe</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode("inputs")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                layoutMode === "inputs"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Ver solo el panel de dictado y notas"
            >
              <Mic className="h-3.5 w-3.5 text-rose-500" />
              <span>Entradas</span>
            </button>
          </div>

          {generatedReport && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleReset}
                  className="h-8 w-8 rounded-xl bg-background hover:bg-muted cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Crear nuevo informe</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryOpen(true)}
                className="h-8 px-2.5 text-xs rounded-xl font-semibold gap-1.5 bg-background hover:bg-muted cursor-pointer relative"
              >
                <History className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Historial</span>
                {savedReports.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary text-white text-[10px] font-bold">
                    {savedReports.length}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Historial de informes guardados</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 3. Área de Trabajo Principal */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex gap-3 min-h-0">
          {/* PANEL DE ENTRADA (AUDIO + NOTAS) */}
          <div
            className={`h-full overflow-y-auto space-y-3 pr-1 scrollbar-thin transition-all duration-200 ${
              layoutMode === "document"
                ? "hidden"
                : layoutMode === "inputs"
                ? "w-full max-w-2xl mx-auto"
                : "w-full lg:w-[42%] shrink-0"
            }`}
          >
            {/* Grabador de Micrófono & Audio */}
            <AudioVoiceRecorder
              onAudioReady={(data) => setAudioData(data)}
              onLiveTranscript={handleLiveTranscript}
            />

            {/* Editor de Notas y Parámetros */}
            <QuickNotesEditor
              notes={quickNotes}
              onNotesChange={setQuickNotes}
              selectedTemplate={selectedTemplate}
              onTemplateChange={setSelectedTemplate}
              selectedTone={selectedTone}
              onToneChange={setSelectedTone}
              selectedCourseId={selectedCourseId}
              onCourseChange={setSelectedCourseId}
              courses={courses}
              additionalInstructions={additionalInstructions}
              onInstructionsChange={setAdditionalInstructions}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              hasAudio={Boolean(audioData)}
            />
          </div>

          {/* PANEL DE VISUALIZACIÓN DEL INFORME (ESPACIO AMPLIO) */}
          <div
            className={`h-full min-h-0 overflow-hidden flex flex-col transition-all duration-200 ${
              layoutMode === "inputs"
                ? "hidden"
                : layoutMode === "document"
                ? "w-full flex-1"
                : "hidden lg:flex flex-1"
            }`}
          >
            {generatedReport ? (
              <ReportPreviewEditor
                report={generatedReport}
                onUpdateReport={setGeneratedReport}
                onSaveToHistory={handleSaveToHistory}
                isExpanded={layoutMode === "document"}
                onToggleExpand={() => setLayoutMode((prev) => (prev === "document" ? "split" : "document"))}
              />
            ) : (
              /* Estado Inicial de Bienvenida */
              <div className="h-full rounded-2xl border border-dashed border-border/80 bg-card/60 p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-5 overflow-y-auto">
                <div className="p-4 rounded-3xl bg-gradient-to-tr from-rose-500/10 via-primary/10 to-indigo-500/10 border border-primary/20 text-primary shadow-xs">
                  <Wand2 className="h-10 w-10 text-primary" />
                </div>

                <div className="max-w-md space-y-2">
                  <h3 className="text-base sm:text-lg font-black text-foreground">
                    Crea informes oficiales con espacio amplio
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Graba tu voz o escribe apuntes rápidos. Nuestro modelo LLM multimodal generará un informe editorial estructurado y podrás ampliarlo a pantalla completa para revisarlo con comodidad.
                  </p>
                </div>

                {/* Pasos Ilustrativos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full max-w-xl text-left">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 text-[11px]">1</span>
                      <span>Voz o Ideas</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Graba con micrófono, sube audios o escribe notas rápidas.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px]">2</span>
                      <span>10 Plantillas IA</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Bitácoras, visitas técnicas, comités CES, cierres de curso y planes de mejora.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-[11px]">3</span>
                      <span>Exportación Total</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Copia con formato Word, descarga .doc, Markdown o PDF oficial.
                    </p>
                  </div>
                </div>

                {/* Cargar notas de ejemplo rápidas */}
                <div className="pt-2 flex items-center gap-2 flex-wrap justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate("technical_visit");
                      setQuickNotes("Se asiste a la reunión con el Dr. Juan Pablo Velásquez el día 08/10/2026 a las 9:00am en las instalaciones del Juzgado de Familia 4 ubicado en Niquía para identificar necesidades de automatización mediante soluciones de software e inteligencia artificial. Se acordó crear un prototipo de automatización para tutelas. Como novedad, se requiere aclarar el alcance de licenciamiento Office actual.");
                      toast.success("Ejemplo de Visita Técnica cargado en las notas. ¡Haz clic en 'Generar'!");
                    }}
                    className="text-xs rounded-xl font-semibold gap-1.5 cursor-pointer"
                  >
                    <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Probar Visita Técnica</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate("class_session");
                      setQuickNotes("Hoy evaluamos el sprint 1 de desarrollo web con la ficha de ADSO. Carlos Pérez y Andrea Torres presentaron una excelente API en Node.js y superaron las pruebas. En contraste, Julián Gómez no asistió por fallas técnicas y queda pendiente para entrega el viernes. Acordamos sesión de refuerzo el próximo martes.");
                      toast.success("Ejemplo de Bitácora de Clase cargado. ¡Haz clic en 'Generar'!");
                    }}
                    className="text-xs rounded-xl font-semibold gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-rose-500" />
                    <span>Probar Bitácora de Clase</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Modal de Historial */}
      <ReportHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedReports={savedReports}
        onSelectReport={(report) => {
          setGeneratedReport(report);
          toast.success(`Informe "${report.title}" cargado.`);
        }}
        onDeleteReport={handleDeleteHistoryReport}
        onClearAll={handleClearAllHistory}
      />
    </div>
  );
}
