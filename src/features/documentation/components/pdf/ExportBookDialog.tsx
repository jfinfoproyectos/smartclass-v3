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
  Edit3,
  Image as ImageIcon,
  Globe,
  Trash2,
  Palette,
  Code2
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
import { Switch } from "@/components/ui/switch";
import { SHIKI_THEMES } from "@/components/theme/CodeThemeSelector";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  getProjectEditorialBookDataAction,
  fetchImageAsBase64Action,
  updateProjectLogoAction
} from "../../actions/adminDocsActions";

/**
 * Optimiza y asegura la compatibilidad de una imagen para el motor PDF
 * convirtiendo SVGs o WebP a un Data URL PNG limpio a través del canvas del navegador.
 */
async function rasterizeToPngDataUrl(sourceUrl: string): Promise<string> {
  if (sourceUrl.startsWith("data:image/png") || sourceUrl.startsWith("data:image/jpeg")) {
    return sourceUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const width = img.naturalWidth || 320;
          const height = img.naturalHeight || 160;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(sourceUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(sourceUrl);
        }
      };
      img.onerror = () => resolve(sourceUrl);
      img.src = sourceUrl;
    } catch {
      resolve(sourceUrl);
    }
  });
}

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
  
  // Estado para el logo importado desde URL
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [isValidatingLogo, setIsValidatingLogo] = useState(false);
  const [saveAsProjectLogo, setSaveAsProjectLogo] = useState(false);

  // Detección del tema visual de la interfaz y del estilo de código activo
  const [activeThemeId, setActiveThemeId] = useState("ocean-breeze");
  const [activeThemeName, setActiveThemeName] = useState("Ocean Breeze");
  const [activeThemeColor, setActiveThemeColor] = useState("#0d9488");

  const [activeCodeThemeId, setActiveCodeThemeId] = useState("one-dark-pro");
  const [activeCodeThemeName, setActiveCodeThemeName] = useState("One Dark Pro");

  // Switches para habilitar que el PDF adopte el tema y estilo de código seleccionados
  const [adoptCustomStyles, setAdoptCustomStyles] = useState(true);
  const [adoptTheme, setAdoptTheme] = useState(true);
  const [adoptCodeTheme, setAdoptCodeTheme] = useState(true);

  const [hasLoadedDefaults, setHasLoadedDefaults] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);

  // Detectar y sincronizar tema de la aplicación y estilo de código en vivo
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncThemeAndCodeTheme = () => {
      // 1. Tema de la interfaz desde localStorage
      const savedTheme = localStorage.getItem("smartclass-theme");
      const tId = (!savedTheme || savedTheme === "default") ? "ocean-breeze" : savedTheme;
      setActiveThemeId(tId);
      const tName = tId.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      setActiveThemeName(tName);

      try {
        const compPrimary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
        if (compPrimary) setActiveThemeColor(compPrimary);
      } catch {}

      // 2. Estilo de código desde cookies
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift();
        return null;
      };
      const savedCode = getCookie("code-theme") || "one-dark-pro";
      setActiveCodeThemeId(savedCode);
      const foundCode = SHIKI_THEMES.find((t) => t.id === savedCode);
      setActiveCodeThemeName(foundCode?.name || savedCode);
    };

    syncThemeAndCodeTheme();

    window.addEventListener("smartclass-theme-changed", syncThemeAndCodeTheme);
    window.addEventListener("code-theme-change", syncThemeAndCodeTheme);
    return () => {
      window.removeEventListener("smartclass-theme-changed", syncThemeAndCodeTheme);
      window.removeEventListener("code-theme-change", syncThemeAndCodeTheme);
    };
  }, [isOpen]);

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
            if (data.logoUrl) {
              setLogoUrl(data.logoUrl);
              setLogoPreviewUrl(data.logoUrl);
            }
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

  const handleImportLogo = async (explicitUrl?: string) => {
    const targetUrl = (explicitUrl !== undefined ? explicitUrl : logoUrl).trim();
    if (!targetUrl) {
      toast.error("Ingresa una URL válida de imagen (ej. https://ejemplo.com/logo.png)");
      return;
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://") && !targetUrl.startsWith("data:image/")) {
      toast.error("La URL debe comenzar con http:// o https://");
      return;
    }

    setIsValidatingLogo(true);
    const toastId = toast.loading("Descargando e importando logo...", {
      description: "Verificando enlace y optimizando formato...",
    });

    try {
      const res = await fetchImageAsBase64Action(targetUrl);
      if (res.success && res.dataUrl) {
        const optimizedDataUrl = await rasterizeToPngDataUrl(res.dataUrl);
        setLogoPreviewUrl(optimizedDataUrl);
        toast.success("¡Logo importado correctamente!", {
          id: toastId,
          description: "La imagen está lista para aparecer en la portada del libro.",
        });
      } else {
        toast.error("No se pudo importar la imagen", {
          id: toastId,
          description: res.error || "Asegúrate de que la URL apunte a una imagen pública accesible.",
        });
      }
    } catch (err: any) {
      console.error("Error al importar logo:", err);
      toast.error("Error al importar logo", {
        id: toastId,
        description: err?.message || "Ocurrió un error de red.",
      });
    } finally {
      setIsValidatingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    setLogoPreviewUrl("");
    toast.info("Logo removido de la portada.");
  };

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

      // Preparar logo final
      let finalLogo = logoPreviewUrl;
      if (logoUrl.trim() && !finalLogo) {
        setProgressStage("Importando y optimizando logo para la portada...");
        try {
          const res = await fetchImageAsBase64Action(logoUrl.trim());
          if (res.success && res.dataUrl) {
            finalLogo = await rasterizeToPngDataUrl(res.dataUrl);
          }
        } catch (logoErr) {
          console.warn("No se pudo importar el logo automáticamente:", logoErr);
        }
      }

      // Guardar opcionalmente como logo predeterminado del proyecto
      if (saveAsProjectLogo && logoUrl.trim()) {
        updateProjectLogoAction(projectId, logoUrl.trim()).catch((err) => {
          console.error("Error al persistir logo en el proyecto:", err);
        });
      }

      // Configuración de tema visual y estilo de código para el compilador editorial
      const themeConfig = {
        adoptTheme: adoptCustomStyles && adoptTheme,
        adoptCodeTheme: adoptCustomStyles && adoptCodeTheme,
        themeId: activeThemeId,
        themeName: activeThemeName,
        primaryColor: activeThemeColor,
        codeThemeId: activeCodeThemeId,
        codeThemeName: activeCodeThemeName,
      };

      // Fusionar los datos del curso con los metadatos personalizados por el docente
      const customizedBookData = {
        ...rawBookData,
        projectName: bookTitle.trim() || rawBookData.projectName,
        subtitle: subtitle.trim() || undefined,
        authorName: authorName.trim() || rawBookData.authorName,
        institutionName: institutionName.trim() || rawBookData.institutionName,
        edition: edition.trim() || "1ª Edición Oficial",
        academicYear: academicYear.trim() || rawBookData.academicYear,
        logoUrl: finalLogo || undefined,
        themeConfig,
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

          {/* Sección de Importación de Logo desde URL */}
          <div className="space-y-2.5 p-3.5 rounded-xl border border-border/70 bg-muted/15 shadow-2xs">
            <div className="flex items-center justify-between">
              <Label htmlFor="book-logo" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-primary" />
                Logo Institucional / Escudo de Portada
              </Label>
              {logoPreviewUrl ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1 px-2 py-0.5 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Logo Vinculado
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground font-mono">PNG, JPG, SVG o WebP</span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  id="book-logo"
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    if (!e.target.value.trim()) {
                      setLogoPreviewUrl("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleImportLogo();
                    }
                  }}
                  placeholder="https://ejemplo.com/logo-institucional.png (URL de imagen)"
                  className="text-xs h-9 pl-8"
                  disabled={isValidatingLogo}
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleImportLogo()}
                disabled={isValidatingLogo || !logoUrl.trim()}
                className="text-xs h-9 px-3 gap-1.5 shrink-0 font-semibold cursor-pointer border border-border/80 hover:bg-secondary/80"
              >
                {isValidatingLogo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Importar Logo</span>
                  </>
                )}
              </Button>
            </div>

            {/* Vista previa del Logo Importado */}
            {logoPreviewUrl && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg border border-border/80 bg-background/90 shadow-2xs animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-24 rounded-md bg-white border border-border flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-xs">
                    <img
                      src={logoPreviewUrl}
                      alt="Vista previa del logo institucional"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      Vista previa para la portada
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Se mostrará en la cabecera editorial de la portada del libro.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Quitar</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Opción para guardar como predeterminado en el proyecto */}
            {logoPreviewUrl && (
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="save-logo-default"
                  checked={saveAsProjectLogo}
                  onChange={(e) => setSaveAsProjectLogo(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <label
                  htmlFor="save-logo-default"
                  className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer select-none"
                >
                  Guardar como logo oficial del curso para futuras exportaciones
                </label>
              </div>
            )}
          </div>

          {/* Switch para Adoptar Tema Visual y Estilo de Código Seleccionado */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-muted/15 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-primary" />
                  <Label htmlFor="adopt-styles-switch" className="text-xs font-semibold text-foreground cursor-pointer">
                    Adoptar tema visual y estilo de código
                  </Label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Habilita que el PDF herede los colores de la interfaz y el resaltado de código activo.
                </p>
              </div>
              <Switch
                id="adopt-styles-switch"
                checked={adoptCustomStyles}
                onCheckedChange={(checked) => {
                  setAdoptCustomStyles(checked);
                  setAdoptTheme(checked);
                  setAdoptCodeTheme(checked);
                }}
              />
            </div>

            {adoptCustomStyles && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/50 animate-in fade-in duration-200">
                {/* Sub-opción: Tema Visual de la Interfaz */}
                <div 
                  onClick={() => setAdoptTheme(!adoptTheme)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer select-none",
                    adoptTheme 
                      ? "bg-background border-primary/30 shadow-2xs" 
                      : "bg-muted/30 border-border/50 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs">🎨</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">
                        Tema: <span className="font-semibold text-primary">{activeThemeName}</span>
                      </p>
                      <p className="text-[9px] text-muted-foreground">Acentos, cabeceras y portadillas</p>
                    </div>
                  </div>
                  <Switch
                    id="sub-switch-theme"
                    checked={adoptTheme}
                    onCheckedChange={(c) => {
                      setAdoptTheme(c);
                      if (!c && !adoptCodeTheme) setAdoptCustomStyles(false);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="scale-75"
                  />
                </div>

                {/* Sub-opción: Estilo de Código del Editor */}
                <div 
                  onClick={() => setAdoptCodeTheme(!adoptCodeTheme)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer select-none",
                    adoptCodeTheme 
                      ? "bg-background border-primary/30 shadow-2xs" 
                      : "bg-muted/30 border-border/50 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Code2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">
                        Código: <span className="font-semibold text-primary font-mono">{activeCodeThemeName}</span>
                      </p>
                      <p className="text-[9px] text-muted-foreground">Fondo y coloreado sintáctico</p>
                    </div>
                  </div>
                  <Switch
                    id="sub-switch-code"
                    checked={adoptCodeTheme}
                    onCheckedChange={(c) => {
                      setAdoptCodeTheme(c);
                      if (!adoptTheme && !c) setAdoptCustomStyles(false);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="scale-75"
                  />
                </div>
              </div>
            )}
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
              <span className="text-muted-foreground leading-tight truncate">
                {adoptCustomStyles && adoptTheme ? `Tema ${activeThemeName}` : "Portada y Créditos"}
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground leading-tight truncate">
                {adoptCustomStyles && adoptCodeTheme ? activeCodeThemeName : "One Dark Pro"}
              </span>
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
