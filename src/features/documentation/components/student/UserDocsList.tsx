"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, LayoutGrid, List } from "lucide-react";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DocInfo {
  id: string;
  title: string;
  icon?: string;
  groupName: string;
  imageUrl?: string | null;
}

interface UserDocsListProps {
  docs: DocInfo[];
}

export function UserDocsList({ docs }: UserDocsListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-3xl text-center">
        <div className="p-5 bg-primary/5 rounded-full mb-4 ring-4 ring-primary/10">
          <BookOpen className="h-10 w-10 text-primary/40" />
        </div>
        <h3 className="text-lg font-bold uppercase tracking-tight text-muted-foreground">Sin documentación asignada</h3>
        <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs">
          El profesor aún no ha vinculado documentación a este curso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold uppercase tracking-tight">Material de Estudio</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Documentación habilitada por el docente para este curso
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge className="text-[9px] px-3 h-6 font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 rounded-full">
            {docs.length} {docs.length === 1 ? "documento" : "documentos"}
          </Badge>

          {/* View mode toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold">
            <Button
              type="button"
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 rounded-lg text-xs"
              onClick={() => setViewMode("grid")}
              title="Vista de Tarjetas AI Canvas"
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              <span>Tarjetas AI Canvas</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 rounded-lg text-xs"
              onClick={() => setViewMode("table")}
              title="Vista de Tabla"
            >
              <List className="h-4 w-4 mr-1.5" />
              <span>Tabla</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content Rendering */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {docs.map((doc) => (
            <AICanvasCard
              key={`${doc.groupName}-${doc.id}`}
              title={doc.title}
              description="Accede al contenido completo de esta guía y recursos de estudio asignados por tu docente."
              icon={BookOpen}
              badge="Material del Curso"
              badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              accentColor="from-emerald-500/30 via-teal-500/20 to-transparent"
              iconBgColor="bg-emerald-500/10 dark:bg-emerald-500/20"
              iconTextColor="text-emerald-600 dark:text-emerald-400"
              hideFooter={true}
              className="h-full group"
            >
              <div className="pt-4 mt-auto">
                <Button
                  className="w-full font-bold text-xs uppercase tracking-wider rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-500 text-white"
                  asChild
                >
                  <Link href={`/docs/${doc.id}`}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Abrir Documento
                  </Link>
                </Button>
              </div>
            </AICanvasCard>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 overflow-hidden bg-card shadow-sm">
          <Table className="w-full min-w-[600px]">
            <TableHeader>
              <TableRow className="h-12 bg-muted/40 hover:bg-muted/40 border-b border-border/30">
                <TableHead className="font-bold uppercase tracking-wider text-xs pl-6 text-muted-foreground">Documento</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs text-right pr-6 text-muted-foreground">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={`${doc.groupName}-${doc.id}`} className="group hover:bg-muted/30 transition-colors border-b border-border/20">
                  <TableCell className="font-medium py-4 pl-6">
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-all duration-300 shadow-sm">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {doc.title}
                        </span>
                        <p className="text-xs text-muted-foreground">Material del Curso</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right py-4 pr-6">
                    <Button
                      variant="default"
                      size="sm"
                      className="font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm"
                      asChild
                    >
                      <Link href={`/docs/${doc.id}`}>
                        <BookOpen className="h-4 w-4 mr-1.5" />
                        Abrir
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
