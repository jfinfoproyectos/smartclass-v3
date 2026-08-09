"use client";

import React, { useState } from "react";
import { Search, Files, LayoutGrid, List, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProjectRowActions } from "./ProjectRowActions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import Link from "next/link";

interface DocProject {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string | Date;
}

export function DocProjectsList({ projects }: { projects: DocProject[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Top Bar: Search & View Mode Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 bg-card p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex-1">
          <Search className="w-4 h-4 text-muted-foreground ml-1" />
          <input
            type="text"
            placeholder="Buscar proyectos de documentación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-medium w-full placeholder:text-muted-foreground/60 text-foreground"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold shrink-0">
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

      <TooltipProvider delayDuration={150}>
        {viewMode === "grid" ? (
          filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-muted/5 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
              <Files className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">
                No se encontraron proyectos de documentación.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {filteredProjects.map((project) => (
                <AICanvasCard
                  key={project.id}
                  title={project.name}
                  description={project.description || "Proyecto de documentación técnica y guías pedagógicas."}
                  icon={Files}
                  badge="Documentación"
                  badgeColor="bg-primary/10 text-primary border-primary/20"
                  accentColor="from-primary/30 via-primary/15 to-transparent"
                  iconBgColor="bg-primary/10 dark:bg-primary/20"
                  iconTextColor="text-primary"
                  hideFooter={true}
                  className="h-full group"
                >
                  {/* Actions Footer */}
                  <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <ProjectRowActions
                      projectId={project.id}
                      projectName={project.name}
                      projectSlug={project.slug}
                    />

                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 font-bold text-xs uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md"
                      asChild
                    >
                      <Link href={`/docs/${project.slug}`}>
                        <BookOpen className="h-4 w-4 mr-1.5" />
                        Ver Guías
                      </Link>
                    </Button>
                  </div>
                </AICanvasCard>
              ))}
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-card shadow-sm">
            <Table className="w-full min-w-[700px]">
              <TableHeader>
                <TableRow className="h-12 bg-muted/50 hover:bg-muted/50 border-b border-slate-200/80 dark:border-slate-800">
                  <TableHead className="font-bold uppercase tracking-wider text-xs pl-6 text-muted-foreground">
                    Proyecto
                  </TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs text-right pr-6 text-muted-foreground">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-32 text-center text-muted-foreground text-sm">
                      No se encontraron proyectos de documentación.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="group hover:bg-muted/40 transition-colors border-b border-slate-100 dark:border-slate-800/80"
                    >
                      <TableCell className="font-medium py-4 pl-6">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-all duration-300 shadow-sm">
                            <Files className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            {project.name}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right py-4 pr-6">
                        <ProjectRowActions
                          projectId={project.id}
                          projectName={project.name}
                          projectSlug={project.slug}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </TooltipProvider>
    </div>
  );
}
