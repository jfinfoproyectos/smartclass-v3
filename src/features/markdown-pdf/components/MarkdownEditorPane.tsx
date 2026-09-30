"use client";

import React, { useRef } from "react";
import { 
  Bold, 
  Italic, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3, 
  Table as TableIcon, 
  ListOrdered, 
  List, 
  CheckSquare, 
  AlertCircle, 
  FileCode, 
  BarChart3, 
  PenTool, 
  Scissors, 
  Upload, 
  Download, 
  Copy, 
  RotateCcw, 
  Sparkles,
  Info,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface MarkdownEditorPaneProps {
  content: string;
  onChange: (val: string) => void;
  onReset: () => void;
}

export function MarkdownEditorPane({
  content,
  onChange,
  onReset,
}: MarkdownEditorPaneProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estadísticas del texto
  const lineCount = content.split("\n").length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const insertTextAtCursor = (prefix: string, suffix: string = "", placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(content + "\n" + prefix + placeholder + suffix);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || placeholder;

    const newContent = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
    onChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 10);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (typeof text === "string") {
        onChange(text);
        toast.success(`Archivo "${file.name}" cargado correctamente.`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDownloadMd = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "documento-smartclass.md";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo Markdown descargado.");
  };

  const handleCopyMd = () => {
    navigator.clipboard.writeText(content);
    toast.success("Markdown copiado al portapapeles.");
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 border-b border-border/80 bg-muted/40 backdrop-blur-xs">
        <TooltipProvider delayDuration={200}>
          {/* Formato y Encabezados */}
          <div className="flex items-center flex-wrap gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-foreground hover:bg-background"
                  onClick={() => insertTextAtCursor("# ", "", "Título Principal H1")}
                >
                  <Heading1 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Título H1</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-foreground hover:bg-background"
                  onClick={() => insertTextAtCursor("## ", "", "Sección H2")}
                >
                  <Heading2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Subtítulo H2</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-foreground hover:bg-background"
                  onClick={() => insertTextAtCursor("### ", "", "Subsección H3")}
                >
                  <Heading3 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Subtítulo H3</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-foreground hover:bg-background"
                  onClick={() => insertTextAtCursor("**", "**", "texto en negrita")}
                >
                  <Bold className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Negrita (**)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-foreground hover:bg-background"
                  onClick={() => insertTextAtCursor("*", "*", "texto en cursiva")}
                >
                  <Italic className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Cursiva (*)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-foreground hover:bg-background"
                  onClick={() => insertTextAtCursor("`", "`", "variable o comando")}
                >
                  <Code className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Código Inline (`)</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Alertas Corporativas Dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 rounded-lg text-xs gap-1 font-semibold text-foreground hover:bg-background"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-primary" />
                      Alertas
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent className="text-[11px]">Insertar Callout Corporativo</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="text-xs">
                <DropdownMenuItem onClick={() => insertTextAtCursor("> [!NOTE]\n> ", "", "Información clave del proyecto.")}>
                  <Badge variant="outline" className="mr-2 bg-teal-500/10 text-teal-600 border-teal-500/30 text-[10px]">NOTE</Badge>
                  Nota Clave
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertTextAtCursor("> [!TIP]\n> ", "", "Recomendación para mejorar la eficiencia.")}>
                  <Badge variant="outline" className="mr-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">TIP</Badge>
                  Consejo Práctico
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertTextAtCursor("> [!IMPORTANT]\n> ", "", "Instrucción obligatoria de cumplimiento.")}>
                  <Badge variant="outline" className="mr-2 bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">IMPORTANT</Badge>
                  Importante
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertTextAtCursor("> [!WARNING]\n> ", "", "Atención a posibles efectos secundarios.")}>
                  <Badge variant="outline" className="mr-2 bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">WARNING</Badge>
                  Advertencia
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertTextAtCursor("> [!CAUTION]\n> ", "", "Riesgo crítico de pérdida de datos o fallo.")}>
                  <Badge variant="outline" className="mr-2 bg-red-500/10 text-red-600 border-red-500/30 text-[10px]">CAUTION</Badge>
                  Precaución
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tabla */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-foreground hover:bg-background"
                  onClick={() => insertTextAtCursor(
                    "\n| Encabezado 1 | Encabezado 2 | Encabezado 3 |\n| :--- | :--- | :--- |\n| Dato A1 | Dato A2 | Dato A3 |\n| Dato B1 | Dato B2 | Dato B3 |\n"
                  )}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Insertar Tabla</TooltipContent>
            </Tooltip>

            {/* Snippet de Código */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-foreground hover:bg-background"
                  onClick={() => insertTextAtCursor(
                    "\n```typescript\nfunction executeWorkflow() {\n  console.log('SmartClass Engine v3');\n}\n```\n"
                  )}
                >
                  <FileCode className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Bloque de Código con Sintaxis</TooltipContent>
            </Tooltip>

            {/* Checklists */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-foreground hover:bg-background"
                  onClick={() => insertTextAtCursor("\n- [ ] Tarea pendiente de revisión\n- [x] Tarea completada con éxito\n")}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Checklist / Lista de Tareas</TooltipContent>
            </Tooltip>

            {/* KPIs */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-foreground hover:bg-background"
                  onClick={() => insertTextAtCursor("\n:::kpi 99.98% | Disponibilidad SLA | Últimos 90 días :::\n:::kpi 42ms | Latencia Media | Reducción de 18ms :::\n")}
                >
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Tarjeta de Métricas / KPI</TooltipContent>
            </Tooltip>

            {/* Firmas */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-foreground hover:bg-background"
                  onClick={() => insertTextAtCursor("\n:::signatures\nElaboró | Ing. Responsable | Líder Técnico | SmartClass\nAprobó | Dr. Director | Comité Ejecutivo | Dirección General\n:::\n")}
                >
                  <PenTool className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Bloque de Firmas Corporativas</TooltipContent>
            </Tooltip>

            {/* Salto de Página */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-foreground hover:bg-background"
                  onClick={() => insertTextAtCursor("\n---pagebreak---\n")}
                >
                  <Scissors className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Salto de Página (---pagebreak---)</TooltipContent>
            </Tooltip>
          </div>

          {/* Acciones de Archivo */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Cargar archivo .md / .txt</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={handleDownloadMd}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Guardar como .md</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={handleCopyMd}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Copiar Markdown</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={onReset}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[11px]">Restablecer plantilla</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Editor Textarea */}
      <div className="flex-1 relative min-h-[350px]">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribe o pega aquí tu documento Markdown..."
          className="w-full h-full p-4 font-mono text-[12.5px] leading-relaxed resize-none bg-background text-foreground focus:outline-none placeholder:text-muted-foreground/60 selection:bg-primary/20"
          spellCheck={false}
        />
      </div>

      {/* Editor Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/70 bg-muted/30 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span><strong>{lineCount}</strong> líneas</span>
          <span>•</span>
          <span><strong>{wordCount}</strong> palabras</span>
          <span>•</span>
          <span><strong>{charCount}</strong> caracteres</span>
        </div>
        <div className="flex items-center gap-2">
          <span>~{readingTimeMin} min de lectura</span>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-muted/60 border-border">
            GFM + Executive
          </Badge>
        </div>
      </div>
    </div>
  );
}
