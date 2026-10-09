"use client";

import React, { useState } from "react";
import { 
  History, 
  Trash2, 
  Search, 
  Calendar, 
  FileText, 
  ArrowRight, 
  ExternalLink,
  CheckCircle2,
  X
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { GeneratedReport } from "../types";

interface ReportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedReports: GeneratedReport[];
  onSelectReport: (report: GeneratedReport) => void;
  onDeleteReport: (id: string) => void;
  onClearAll: () => void;
}

export function ReportHistoryModal({
  isOpen,
  onClose,
  savedReports,
  onSelectReport,
  onDeleteReport,
  onClearAll,
}: ReportHistoryModalProps) {
  const [search, setSearch] = useState("");

  const filtered = savedReports.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.courseTitle && r.courseTitle.toLowerCase().includes(q)) ||
      r.summary.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-5 rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border/60 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <History className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-black">
                  Historial de Informes Guardados
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Accede y recupera los informes generados previamente en tu navegador.
                </DialogDescription>
              </div>
            </div>

            {savedReports.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-7 text-xs text-muted-foreground hover:text-destructive rounded-lg"
              >
                Limpiar todo
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Buscador */}
        <div className="py-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, ficha o contenido..."
              className="h-8 pl-8 text-xs bg-muted/40 rounded-xl"
            />
          </div>
        </div>

        {/* Lista de Informes */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[250px]">
          {filtered.length > 0 ? (
            filtered.map((report) => (
              <div
                key={report.id}
                className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/20">
                      {report.date}
                    </Badge>
                    {report.courseTitle && (
                      <Badge variant="secondary" className="text-[10px]">
                        {report.courseTitle}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {report.actionItems.length} compromisos
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {report.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {report.summary}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onSelectReport(report);
                      onClose();
                    }}
                    className="h-8 text-xs rounded-xl font-bold gap-1 cursor-pointer"
                  >
                    <span>Cargar</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteReport(report.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-xl"
                    title="Eliminar de historial"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
              <FileText className="h-8 w-8 stroke-1" />
              <p className="text-xs">
                {savedReports.length === 0
                  ? "Aún no tienes informes guardados en este navegador."
                  : "No se encontraron informes coincidentes con la búsqueda."}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
