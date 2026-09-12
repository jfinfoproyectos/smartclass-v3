"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, LayoutGrid, List } from "lucide-react";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabEmptyState } from "@/components/ui/tab-empty-state";

interface DocInfo {
  id: string;
  title: string;
  icon?: string;
  groupName: string;
  imageUrl?: string | null;
}

interface UserDocsListProps {
  docs: DocInfo[];
  viewMode?: "grid" | "table";
  hideHeader?: boolean;
}

export function UserDocsList({ docs, viewMode: propViewMode, hideHeader = false }: UserDocsListProps) {
  const [internalViewMode, setInternalViewMode] = useState<"grid" | "table">("grid");
  const viewMode = propViewMode !== undefined ? propViewMode : internalViewMode;

  if (docs.length === 0) {
    return (
      <TabEmptyState
        icon={BookOpen}
        title="Sin documentación asignada"
        description="El profesor aún no ha vinculado guías o manuales de estudio para este curso."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header if not hidden */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between pb-2 border-b border-border/40">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold">Documentación del Curso</h3>
            <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 rounded-full">
              {docs.length} {docs.length === 1 ? "documento" : "documentos"}
            </Badge>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold">
            <Button
              type="button"
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 rounded-lg text-xs"
              onClick={() => setInternalViewMode("grid")}
              title="Vista de Tarjetas"
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              <span>Tarjetas</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 rounded-lg text-xs"
              onClick={() => setInternalViewMode("table")}
              title="Vista de Tabla"
            >
              <List className="h-4 w-4 mr-1.5" />
              <span>Tabla</span>
            </Button>
          </div>
        </div>
      )}


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
              badgeColor="bg-primary/10 text-primary border-primary/20"
              accentColor="from-primary/30 via-primary/20 to-transparent"
              iconBgColor="bg-primary/10 dark:bg-primary/20"
              iconTextColor="text-primary"
              hideFooter={true}
              className="h-full group"
            >
              <div className="pt-4 mt-auto">
                <Button
                  className="w-full font-semibold text-xs rounded-xl shadow-md bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                  asChild
                >
                  <Link href={`/docs/${doc.id}`}>
                    <BookOpen className="w-4 h-4 mr-1.5" />
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
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-all duration-300 shadow-sm">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
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
                      className="font-semibold text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm gap-1.5 cursor-pointer"
                      asChild
                    >
                      <Link href={`/docs/${doc.id}`}>
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Abrir</span>
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
