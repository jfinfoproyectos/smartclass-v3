"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  Settings2, 
  Download, 
  Columns, 
  Eye, 
  Edit3, 
  FileCode, 
  Palette, 
  BookOpen,
  Layers,
  HelpCircle,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { MarkdownEditorPane } from "./MarkdownEditorPane";
import { PDFPreviewPane } from "./PDFPreviewPane";
import { DocumentSettingsDrawer } from "./DocumentSettingsDrawer";
import { MARKDOWN_TEMPLATES } from "../constants/templates";
import { 
  DocumentMetadata, 
  DocumentStyleConfig, 
  MarkdownTemplate 
} from "../types";
import { extractFirstH1 } from "../utils/markdownParser";

export function MarkdownToPdfToolView() {
  const router = useRouter();

  // Plantilla inicial: Informe Ejecutivo
  const defaultTemplate = MARKDOWN_TEMPLATES[0];

  const [currentTemplateId, setCurrentTemplateId] = useState<string>(defaultTemplate.id);
  const [markdownContent, setMarkdownContent] = useState<string>(defaultTemplate.content);
  
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    title: extractFirstH1(defaultTemplate.content) || "Documento",
    subtitle: "",
    institution: "SmartClass",
    author: "",
    category: "Documentación",
    version: "1.0",
    folioCode: "",
    dateStr: new Date().toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }),
    status: "OFFICIAL",
  });

  const [styleConfig, setStyleConfig] = useState<DocumentStyleConfig>({
    coverStyle: "none",
    colorScheme: "teal",
    fontFamily: "Helvetica",
    pageSize: "A4",
    orientation: "portrait",
    showRunningHeader: true,
    showRunningFooter: true,
    showPageNumbers: true,
    showWatermark: false,
    watermarkText: "CONFIDENCIAL",
    customFooterText: "",
    codeTheme: "one-dark-pro",
    showLineNumbers: true,
    signatures: [],
  });

  const [activeLayout, setActiveLayout] = useState<"split" | "editor" | "preview">("split");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleContentChange = (newContent: string) => {
    setMarkdownContent(newContent);
    const firstH1 = extractFirstH1(newContent);
    if (firstH1) {
      setMetadata(prev => ({
        ...prev,
        title: firstH1
      }));
    }
  };

  // Cargar una plantilla
  const handleSelectTemplate = (template: MarkdownTemplate) => {
    setCurrentTemplateId(template.id);
    setMarkdownContent(template.content);
    
    const detectedTitle = extractFirstH1(template.content) || template.name;
    setMetadata(prev => ({
      ...prev,
      title: detectedTitle,
      category: template.category || prev.category,
    }));

    toast.success(`Plantilla "${template.name}" cargada con éxito.`);
  };

  const handleResetCurrentTemplate = () => {
    const tmpl = MARKDOWN_TEMPLATES.find(t => t.id === currentTemplateId) || MARKDOWN_TEMPLATES[0];
    handleContentChange(tmpl.content);
    toast.info("Contenido restablecido al estado de la plantilla.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] w-full overflow-hidden p-2 sm:p-3 space-y-2.5">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 rounded-2xl border border-border bg-card shadow-sm shrink-0">
        {/* Left branding and back link */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/teacher/tools">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-xl border-border bg-muted/40 hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
                Markdown a PDF Corporativo
              </h1>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                Studio Enterprise
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Generador editorial de alta fidelidad con @react-pdf/renderer, portada ejecutiva y temas personalizables.
            </p>
          </div>
        </div>

        {/* Right action tools */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Selector de Plantillas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border bg-muted/30 hover:bg-muted"
              >
                <FolderOpen className="h-3.5 w-3.5 text-primary" />
                Plantillas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 text-xs">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Formatos Corporativos & Académicos
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {MARKDOWN_TEMPLATES.map((tmpl) => (
                <DropdownMenuItem
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className="flex flex-col items-start gap-0.5 py-2 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-foreground">{tmpl.name}</span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-border">
                      {tmpl.category}
                    </Badge>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground line-clamp-1">{tmpl.description}</p>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botón Configuración de Documento */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border bg-muted/30 hover:bg-muted"
          >
            <Settings2 className="h-3.5 w-3.5 text-primary" />
            Configuración
          </Button>

          {/* Layout View Toggles */}
          <div className="flex items-center p-0.5 rounded-xl border border-border bg-muted/50">
            <Button
              type="button"
              variant={activeLayout === "split" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-lg text-foreground"
              onClick={() => setActiveLayout("split")}
              title="Vista Dividida"
            >
              <Columns className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant={activeLayout === "editor" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-lg text-foreground"
              onClick={() => setActiveLayout("editor")}
              title="Solo Editor"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant={activeLayout === "preview" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-lg text-foreground"
              onClick={() => setActiveLayout("preview")}
              title="Solo Previsualización PDF"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0 overflow-hidden">
        {/* Panel Izquierdo: Editor Markdown */}
        {(activeLayout === "split" || activeLayout === "editor") && (
          <div className={`h-full min-h-0 ${activeLayout === "editor" ? "md:col-span-2" : ""}`}>
            <MarkdownEditorPane
              content={markdownContent}
              onChange={handleContentChange}
              onReset={handleResetCurrentTemplate}
            />
          </div>
        )}

        {/* Panel Derecho: Visor PDF en Vivo */}
        {(activeLayout === "split" || activeLayout === "preview") && (
          <div className={`h-full min-h-0 ${activeLayout === "preview" ? "md:col-span-2" : ""}`}>
            <PDFPreviewPane
              markdown={markdownContent}
              metadata={metadata}
              styleConfig={styleConfig}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Modal de Configuración */}
      <DocumentSettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        metadata={metadata}
        setMetadata={setMetadata}
        styleConfig={styleConfig}
        setStyleConfig={setStyleConfig}
      />
    </div>
  );
}
