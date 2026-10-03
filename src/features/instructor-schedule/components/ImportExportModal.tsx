"use client";

import React, { useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Upload, 
  FileJson, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle
} from "lucide-react";
import { InstructorScheduleProfile } from "../types";
import { 
  exportScheduleToJson, 
  validateAndParseImportedJson 
} from "../utils/storage";
import { toast } from "sonner";

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: InstructorScheduleProfile;
  onImportProfile: (imported: InstructorScheduleProfile, mode: "replace" | "merge") => void;
  onResetToDefaults: () => void;
}

export function ImportExportModal({
  isOpen,
  onClose,
  profile,
  onImportProfile,
  onResetToDefaults,
}: ImportExportModalProps) {
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace");
  const [parsedPreview, setParsedPreview] = useState<InstructorScheduleProfile | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      exportScheduleToJson(profile);
      toast.success("Horario exportado exitosamente a archivo JSON.");
    } catch {
      toast.error("Error al exportar el horario.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = validateAndParseImportedJson(content);
      if (res.success && res.profile) {
        setParsedPreview(res.profile);
      } else {
        setErrorMsg(res.error || "Formato de archivo inválido.");
        setParsedPreview(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Error al leer el archivo seleccionado.");
      setParsedPreview(null);
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (!parsedPreview) return;
    onImportProfile(parsedPreview, importMode);
    toast.success(
      importMode === "replace"
        ? "Horario reemplazado completamente desde el archivo JSON."
        : "Clases e instituciones fusionadas con tu horario actual."
    );
    onClose();
  };

  const handleReset = () => {
    if (confirm("¿Estás seguro de restablecer el horario al ejemplo inicial predeterminado?")) {
      onResetToDefaults();
      toast.info("Horario restablecido a valores predeterminados.");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[580px] p-6 rounded-3xl max-h-[90vh] overflow-y-auto border-border/80 shadow-2xl">
        <DialogHeader className="space-y-1 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FileJson className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
              Importar y Exportar Horario
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Guarda una copia de respaldo independiente en JSON o restaura horarios entre navegadores y dispositivos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Seccion 1: Exportar */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                  Exportar Horario Actual
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Descarga un archivo con {profile.institutions.length} instituciones y {profile.slots.length} clases programadas.
                </p>
              </div>
              <Button
                onClick={handleExport}
                size="sm"
                className="h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar JSON</span>
              </Button>
            </div>
          </div>

          {/* Seccion 2: Importar */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
            <div>
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                Importar Horario desde Archivo
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Selecciona un archivo .json previamente exportado de SmartClass.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all p-5 rounded-2xl flex flex-col items-center justify-center cursor-pointer text-center gap-1.5"
            >
              <Upload className="w-6 h-6 text-primary" />
              <span className="text-xs font-bold text-foreground">
                {fileName ? fileName : "Haz clic para seleccionar tu archivo JSON"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Archivos con formato JSON compatibles con SmartClass
              </span>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {parsedPreview && (
              <div className="p-3 rounded-xl bg-card border border-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-foreground">Archivo analizado correctamente</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {parsedPreview.slots.length} clases • {parsedPreview.institutions.length} inst.
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/30 p-2 rounded-lg border border-border/60">
                  <div>
                    <span className="text-muted-foreground">Docente:</span>{" "}
                    <strong className="text-foreground">{parsedPreview.instructorName}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Periodo:</span>{" "}
                    <strong className="text-foreground">{parsedPreview.periodTitle} ({parsedPreview.academicYear})</strong>
                  </div>
                </div>

                {/* Modo de importación */}
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-bold text-foreground">¿Cómo deseas importar los datos?</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImportMode("replace")}
                      className={`p-2 rounded-xl border text-left text-xs font-bold transition-all ${
                        importMode === "replace"
                          ? "border-primary bg-primary/10 text-primary shadow-2xs"
                          : "border-border/70 bg-card text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-extrabold text-[11px]">Reemplazar Todo</div>
                      <div className="text-[9.5px] font-normal opacity-80">Sobrescribe el horario actual por el importado</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportMode("merge")}
                      className={`p-2 rounded-xl border text-left text-xs font-bold transition-all ${
                        importMode === "merge"
                          ? "border-primary bg-primary/10 text-primary shadow-2xs"
                          : "border-border/70 bg-card text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-extrabold text-[11px]">Combinar / Fusionar</div>
                      <div className="text-[9.5px] font-normal opacity-80">Añade las clases sin borrar las actuales</div>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleApplyImport}
                    className="h-8 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    Confirmar e Importar Horario
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Seccion 3: Restablecer */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-destructive/20 bg-destructive/5 text-xs">
            <div>
              <span className="font-bold text-foreground">Restablecer valores iniciales</span>
              <p className="text-[11px] text-muted-foreground">
                Vuelve al horario de ejemplo con SENA, CESDE y Universidad.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 rounded-xl text-xs font-bold border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Restablecer
            </Button>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 px-4 rounded-xl text-xs font-bold"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
