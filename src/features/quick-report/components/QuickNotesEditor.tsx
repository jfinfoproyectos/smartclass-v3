"use client";

import React from "react";
import { 
  FileText, 
  Sparkles, 
  GraduationCap, 
  Sliders, 
  Lightbulb, 
  Wand2, 
  RotateCcw,
  CheckCircle2,
  Users,
  Building2,
  ClipboardCheck,
  AlertTriangle,
  Layers,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectGroup,
  SelectItem, 
  SelectLabel,
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { REPORT_TEMPLATES, type ReportTemplateType, type ReportTone } from "../types";
import type { CourseWithStudents } from "@/features/teacher/components/TeacherToolsView";

interface QuickNotesEditorProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  selectedTemplate: ReportTemplateType;
  onTemplateChange: (t: ReportTemplateType) => void;
  selectedTone: ReportTone;
  onToneChange: (tone: ReportTone) => void;
  selectedCourseId: string;
  onCourseChange: (courseId: string) => void;
  courses: CourseWithStudents[];
  additionalInstructions: string;
  onInstructionsChange: (val: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  hasAudio: boolean;
}

export function QuickNotesEditor({
  notes,
  onNotesChange,
  selectedTemplate,
  onTemplateChange,
  selectedTone,
  onToneChange,
  selectedCourseId,
  onCourseChange,
  courses,
  additionalInstructions,
  onInstructionsChange,
  onGenerate,
  isGenerating,
  hasAudio,
}: QuickNotesEditorProps) {
  const currentTemplate = REPORT_TEMPLATES.find((t) => t.id === selectedTemplate) || REPORT_TEMPLATES[0];
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // Chips para insertar rápidamente secciones o frases típicas adaptadas
  const quickChips = [
    { label: "+ 🎯 Objetivos / Propósito", snippet: "\n- Objetivo del encuentro: " },
    { label: "+ 👥 Participantes y Roles", snippet: "\n- Participantes y entidades presentes: " },
    { label: "+ ⚠️ Dificultades / Novedades", snippet: "\n- Novedades y observaciones: " },
    { label: "+ 📋 Temas y Acuerdos", snippet: "\n- Puntos tratados y decisiones: " },
    { label: "+ 🤝 Compromisos con Plazos", snippet: "\n- Compromisos y fechas límite: " },
    { label: "+ 🏆 Logros / Conclusiones", snippet: "\n- Conclusiones y resultados: " },
  ];

  const handleInsertSnippet = (snippet: string) => {
    onNotesChange(notes ? `${notes.trim()}${snippet}` : snippet.trimStart());
  };

  const handleLoadExample = () => {
    onNotesChange(currentTemplate.examplePrompt);
  };

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  // Agrupación de plantillas para un menú ordenado
  const formacionTemplates = REPORT_TEMPLATES.filter((t) => t.category === "formacion");
  const gestionTemplates = REPORT_TEMPLATES.filter((t) => t.category === "gestion");
  const seguimientoTemplates = REPORT_TEMPLATES.filter((t) => t.category === "seguimiento");
  const cierreTemplates = REPORT_TEMPLATES.filter((t) => t.category === "cierre");

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4 shadow-xs">
      {/* 1. Selector de Plantilla de Informe */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Tipo de Informe Oficial</span>
          </label>
          <Badge variant="secondary" className="text-[10px] font-bold shrink-0 bg-primary/10 text-primary border-primary/20">
            {currentTemplate.badge}
          </Badge>
        </div>

        <Select value={selectedTemplate} onValueChange={(val) => onTemplateChange(val as ReportTemplateType)}>
          <SelectTrigger className="h-9 text-xs rounded-xl bg-muted/40 w-full min-w-0 [&>span]:truncate border-border/80 font-medium">
            <SelectValue placeholder="Selecciona plantilla..." />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectGroup>
              <SelectLabel className="text-[11px] font-bold text-primary">📚 Formación & Aula</SelectLabel>
              {formacionTemplates.map((tmpl) => (
                <SelectItem key={tmpl.id} value={tmpl.id} className="text-xs cursor-pointer py-1.5">
                  {tmpl.name}
                </SelectItem>
              ))}
            </SelectGroup>

            <SelectGroup>
              <SelectLabel className="text-[11px] font-bold text-indigo-500">🏛️ Gestión & Interinstitucional</SelectLabel>
              {gestionTemplates.map((tmpl) => (
                <SelectItem key={tmpl.id} value={tmpl.id} className="text-xs cursor-pointer py-1.5">
                  {tmpl.name}
                </SelectItem>
              ))}
            </SelectGroup>

            <SelectGroup>
              <SelectLabel className="text-[11px] font-bold text-amber-500">⚖️ Seguimiento & Comités</SelectLabel>
              {seguimientoTemplates.map((tmpl) => (
                <SelectItem key={tmpl.id} value={tmpl.id} className="text-xs cursor-pointer py-1.5">
                  {tmpl.name}
                </SelectItem>
              ))}
            </SelectGroup>

            <SelectGroup>
              <SelectLabel className="text-[11px] font-bold text-emerald-500">🏁 Cierre & Evaluación</SelectLabel>
              {cierreTemplates.map((tmpl) => (
                <SelectItem key={tmpl.id} value={tmpl.id} className="text-xs cursor-pointer py-1.5">
                  {tmpl.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <p className="text-[10px] text-muted-foreground pl-0.5">
          {currentTemplate.shortDescription}
        </p>
      </div>

      {/* 2. Ficha / Curso Contextual & Tono en 2 columnas limpias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/60">
        {/* Ficha / Curso Activo */}
        <div className="space-y-1.5 min-w-0">
          <label className="text-xs font-bold text-foreground flex items-center justify-between gap-1">
            <span className="flex items-center gap-1.5 truncate">
              <GraduationCap className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">Ficha / Grupo</span>
            </span>
            {selectedCourse && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                {selectedCourse.studentsCount} est.
              </span>
            )}
          </label>
          <Select value={selectedCourseId} onValueChange={onCourseChange}>
            <SelectTrigger className="h-8 text-xs rounded-xl bg-muted/40 w-full min-w-0 [&>span]:truncate border-border/80">
              <SelectValue placeholder="Sin ficha (General)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">
                🌐 General (Sin ficha vinculada)
              </SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  <span className="font-medium">{c.title}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    ({c.studentsCount} aprendices)
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tono de Redacción */}
        <div className="space-y-1.5 min-w-0">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5 truncate">
            <Sliders className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">Tono & Formalidad</span>
          </label>
          <Select value={selectedTone} onValueChange={(val) => onToneChange(val as ReportTone)}>
            <SelectTrigger className="h-8 text-xs rounded-xl bg-muted/40 w-full min-w-0 [&>span]:truncate border-border/80">
              <SelectValue placeholder="Selecciona tono..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="institutional" className="text-xs">
                🏛️ Formal Institucional (SENA / MinEducación)
              </SelectItem>
              <SelectItem value="executive" className="text-xs">
                📊 Técnico Ejecutivo (Métricas y decisiones)
              </SelectItem>
              <SelectItem value="pedagogical" className="text-xs">
                🌱 Pedagógico Formativo (Formativo y empático)
              </SelectItem>
              <SelectItem value="concise" className="text-xs">
                ⚡ Ejecutivo Síntesis Rápida (Tablas y bullets)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Directriz Adicional (Opcional) */}
      <div className="space-y-1.5 pt-1 border-t border-border/60">
        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Wand2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>Instrucción Especial para la IA (Opcional)</span>
        </label>
        <Input
          value={additionalInstructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder="Ej: Incluye mención al Dr. Juan Pablo, enfatiza necesidad de licencias..."
          className="h-8 text-xs bg-muted/40 rounded-xl border-border/80"
        />
      </div>

      {/* 4. Ideas Rápidas y Notas */}
      <div className="space-y-2 pt-1 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              Ideas Rápidas, Minuta o Dictado
            </label>
            <span className="text-[10px] text-muted-foreground">
              ({wordCount} palabras)
            </span>
          </div>

          <button
            type="button"
            onClick={handleLoadExample}
            className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
          >
            Cargar ejemplo
          </button>
        </div>

        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={`Escribe tus apuntes sueltos, pega un chat o dicta por voz...\n\nEjemplo: ${currentTemplate.examplePrompt}`}
          rows={5}
          className="text-xs leading-relaxed resize-y bg-muted/30 border-border/80 rounded-xl focus-visible:ring-1"
        />

        {/* Atajos rápidos */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] text-muted-foreground font-semibold">Atajos:</span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleInsertSnippet(chip.snippet)}
              className="text-[10px] px-2 py-0.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Botón de Generación Principal */}
      <div className="pt-2">
        <Button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || (!notes.trim() && !hasAudio)}
          className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm gap-2 bg-gradient-to-r from-rose-600 via-primary to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          {isGenerating ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Redactando informe oficial con IA...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Generar {currentTemplate.name}</span>
            </>
          )}
        </Button>
        <p className="text-[10px] text-center text-muted-foreground mt-1.5">
          {hasAudio 
            ? "🎧 Se procesará tu audio y notas con el modelo multimodal de Gemini."
            : "✍️ Se redactará un documento completo con estructura oficial a partir de tus notas."}
        </p>
      </div>
    </div>
  );
}
