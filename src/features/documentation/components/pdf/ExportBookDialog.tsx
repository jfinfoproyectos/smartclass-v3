"use client";

import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Download, 
  Loader2, 
  Sparkles, 
  Layers, 
  FileText, 
  CheckCircle2, 
  Printer, 
  ShieldCheck,
  GraduationCap,
  User,
  Building2,
  Calendar,
  Bookmark,
  Edit3
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getProjectEditorialBookDataAction } from "../../actions/adminDocsActions";

interface ExportBookDialogProps {
  projectId: string;
  projectName?: string;
  trigger?: React.ReactNode;
}

export function ExportBookDialog({ projectId, projectName, trigger }: ExportBookDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progressStage, setProgressStage] = useState<string | null>(null);

  // Metadatos editoriales editables por el usuario
  const [bookTitle, setBookTitle] = useState(projectName || "");
  const [subtitle, setSubtitle] = useState("Compendio estructurado de lecciones, fundamentos teóricos y ejercicios prácticos de ingeniería.");
  const [authorName, setAuthorName] = useState("");
  const [institutionName, setInstitutionName] = useState("SmartClass Academic Press");
  const [edition, setEdition] = useState("1ª Edición Oficial");
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [hasLoadedDefaults, setHasLoadedDefaults] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);

  // Pre-cargar valores por defecto al abrir el diálogo
  useEffect(() => {
    if (isOpen && !hasLoadedDefaults) {
      setIsLoadingDefaults(true);
      getProjectEditorialBookDataAction(projectId)
        .then((data) => {
          if (data) {
            if (!bookTitle) setBookTitle(data.projectName || projectName || "");
            if (!authorName) setAuthorName(data.authorName || "");
            if (data.institutionName) setInstitutionName(data.institutionName);
            if (data.academicYear) setAcademicYear(data.academicYear);
          }
          setHasLoadedDefaults(true);
        })
        .catch((e) => {
          console.error("Error al obtener datos editoriales preliminares:", e);
        })
        .finally(() => {
          setIsLoadingDefaults(false);
        });
    }
  }, [isOpen, hasLoadedDefaults, projectId, projectName, bookTitle, authorName]);

  const handleExportBook = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const toastId = toast.loading("Iniciando compilación editorial del libro...", {
      description: "Recopilando capítulos, tópicos y lecciones...",
    });

    try {
      setProgressStage("Obteniendo temario y contenido de lecciones...");
      const rawBookData = await getProjectEditorialBookDataAction(projectId);

      if (!rawBookData || !rawBookData.chapters || rawBookData.chapters.length === 0) {
        toast.error("El curso aún no tiene tópicos ni lecciones para exportar.", { id: toastId });
        setIsExporting(false);
        setProgressStage(null);
        return;
      }

      // Fusionar los datos del curso con los metadatos personalizados por el docente
      const customizedBookData = {
        ...rawBookData,
        projectName: bookTitle.trim() || rawBookData.projectName,
        subtitle: subtitle.trim() || undefined,
        authorName: authorName.trim() || rawBookData.authorName,
        institutionName: institutionName.trim() || rawBookData.institutionName,
        edition: edition.trim() || "1ª Edición Oficial",
        academicYear: academicYear.trim() || rawBookData.academicYear,
      };

      const totalLessons = customizedBookData.chapters.reduce((acc, c) => acc + c.lessons.length, 0);

      setProgressStage(`Renderizando ${customizedBookData.chapters.length} capítulos y ${totalLessons} lecciones...`);
      toast.loading(`Formateando ${totalLessons} lecciones con índice navegable...`, { id: toastId });

      // Carga dinámica de @react-pdf/renderer y el componente del libro
      const { pdf } = await import("@react-pdf/renderer");
      const { EditorialBookPDF } = await import("./EditorialBookPDF");

      setProgressStage("Generando archivo binario PDF con marcadores e hipervínculos...");
      const blob = await pdf(<EditorialBookPDF bookData={customizedBookData} />).toBlob();

      // Disparar descarga automática en el navegador
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const cleanSlug = (customizedBookData.projectName || "libro-editorial")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      link.download = `${cleanSlug}-superlibro-editorial.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("¡Superlibro Editorial generado con éxito!", {
        id: toastId,
        description: `Se descargó "${cleanSlug}-superlibro-editorial.pdf" con índice navegable y metadatos personalizados.`,
      });

      setIsOpen(false);
    } catch (error: any) {
      console.error("Error al exportar libro PDF:", error);
      toast.error("No se pudo compilar el libro PDF", {
        id: toastId,
        description: error?.message || "Ocurrió un error inesperado durante la renderización.",
      });
    } finally {
      setIsExporting(false);
      setProgressStage(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="font-medium rounded-xl gap-2 h-9 px-3 border-border hover:bg-muted text-foreground transition-all shrink-0 cursor-pointer shadow-2xs"
            title="Exportar como Superlibro Editorial en PDF con portada, índice navegable y código completo"
          >
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="hidden md:inline font-semibold">Libro PDF</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto border-border bg-background shadow-2xl p-6 sm:p-7 rounded-2xl flex flex-col gap-4">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-mono uppercase tracking-wider">
              Edición de Editorial
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Exportar Superlibro Editorial (PDF)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Personaliza los créditos y datos editoriales del libro antes de compilar. Incluye portada formal, tabla de contenidos con navegación interactiva por clics y código con One Dark Pro.
          </DialogDescription>
        </DialogHeader>

        {/* Formulario de Metadatos Editoriales Editables */}
        <div className="space-y-4 py-1">
          <div className="flex items-center gap-2 pb-1 border-b border-border/60">
            <Edit3 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Datos Editoriales del Libro
            </span>
            {isLoadingDefaults && (
              <Loader2 className="w-3 h-3 text-muted-foreground animate-spin ml-auto" />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Título del Libro */}
            <div className="space-y-1.5">
              <Label htmlFor="book-title" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                Título de la Portada
              </Label>
              <Input
                id="book-title"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="Nombre del Libro o Curso"
                className="text-xs h-9"
              />
            </div>

            {/* Subtítulo / Descriptor */}
            <div className="space-y-1.5">
              <Label htmlFor="book-subtitle" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                Subtítulo / Descriptor Académico
              </Label>
              <Input
                id="book-subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Descripción concisa que aparecerá bajo el título"
                className="text-xs h-9"
              />
            </div>

            {/* Autor / Docente */}
            <div className="space-y-1.5">
              <Label htmlFor="book-author" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Autor / Docente
              </Label>
              <Input
                id="book-author"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Ej. Dr. Juan Pérez"
                className="text-xs h-9"
              />
            </div>

            {/* Editorial / Institución */}
            <div className="space-y-1.5">
              <Label htmlFor="book-institution" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                Editorial / Institución
              </Label>
              <Input
                id="book-institution"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="Ej. Universidad Central - Serie Técnica"
                className="text-xs h-9"
              />
            </div>

            {/* Edición */}
            <div className="space-y-1.5">
              <Label htmlFor="book-edition" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                Edición / Versión
              </Label>
              <Input
                id="book-edition"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="Ej. 1ª Edición Oficial"
                className="text-xs h-9"
              />
            </div>

            {/* Año Académico */}
            <div className="space-y-1.5">
              <Label htmlFor="book-year" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                Año Académico
              </Label>
              <Input
                id="book-year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026"
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Características Editoriales en 4 columnas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground leading-tight">Índice Navegable</span>
            </div>
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground leading-tight">Marcadores PDF</span>
            </div>
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground leading-tight">Portada y Créditos</span>
            </div>
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground leading-tight">One Dark Pro</span>
            </div>
          </div>

          {progressStage && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-2.5 text-xs text-primary font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{progressStage}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsOpen(false)} 
            disabled={isExporting}
            className="text-xs h-9"
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={handleExportBook} 
            disabled={isExporting}
            className="text-xs h-9 gap-2 bg-primary text-primary-foreground font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Compilando Libro...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Descargar Superlibro Editorial
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
