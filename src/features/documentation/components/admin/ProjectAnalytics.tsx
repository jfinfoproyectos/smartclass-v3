"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpenText,
  Unlink,
  Plus,
  ExternalLink,
  Settings2,
  RefreshCcw,
  Search,
  BookOpen,
  Link2,
} from "lucide-react";
import {
  getCourseLinkedProjectsAction,
  linkProjectToCourseAction,
  unlinkProjectFromCourseAction,
} from "../../actions/adminDocsActions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface CourseDocManagerProps {
  courseId: string;
  availableProjects: { id: string; name: string; slug?: string }[];
}

interface LinkedProject {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  imageUrl?: string | null;
  linkId: string;
  order: number;
}

export function ProjectAnalytics({ courseId, availableProjects }: CourseDocManagerProps) {
  const [linkedProjects, setLinkedProjects] = useState<LinkedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadLinkedProjects();
  }, [courseId]);

  async function loadLinkedProjects() {
    setLoading(true);
    try {
      const data = await getCourseLinkedProjectsAction(courseId);
      setLinkedProjects(data as LinkedProject[]);
    } catch (error) {
      console.error("Error loading linked projects:", error);
      toast.error("Error al cargar las documentaciones vinculadas");
    } finally {
      setLoading(false);
    }
  }

  const linkedIds = new Set(linkedProjects.map((p) => p.id));
  const unlinkedProjects = availableProjects.filter((p) => !linkedIds.has(p.id));
  const filteredUnlinked = search
    ? unlinkedProjects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : unlinkedProjects;

  const handleLink = async (projectId: string) => {
    setActionLoading(`link-${projectId}`);
    try {
      await linkProjectToCourseAction(courseId, projectId);
      toast.success("Documentación vinculada exitosamente");
      await loadLinkedProjects();
    } catch (error) {
      toast.error("Error al vincular la documentación");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlink = async (projectId: string) => {
    setActionLoading(`unlink-${projectId}`);
    try {
      await unlinkProjectFromCourseAction(courseId, projectId);
      toast.success("Documentación desvinculada");
      await loadLinkedProjects();
    } catch (error) {
      toast.error("Error al desvincular");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <RefreshCcw className="w-8 h-8 animate-spin text-primary opacity-40" />
        <p className="text-sm font-bold animate-pulse text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 p-4 sm:p-6">

      {/* ─── Linked Projects Table ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Documentaciones Vinculadas
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visibles para los estudiantes en la pestaña Documentación del curso.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs font-bold">
            {linkedProjects.length}
          </Badge>
        </div>

        <div className="rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-bold uppercase tracking-wider text-xs w-full">Proyecto</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs text-right whitespace-nowrap">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linkedProjects.length > 0 ? (
                linkedProjects.map((project) => (
                  <TableRow key={project.id} className="group hover:bg-muted/20 transition-colors border-border/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                          <BookOpenText className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm">{project.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                          <Link href={`/docs/${project.slug}`}>
                            <BookOpenText className="w-3.5 h-3.5 mr-1" />
                            Abrir
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                          <Link href={`/dashboard/teacher/docs/${project.id}`}>
                            <Settings2 className="w-3.5 h-3.5 mr-1" />
                            Editar
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={actionLoading === `unlink-${project.id}`}
                            >
                              {actionLoading === `unlink-${project.id}` ? (
                                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Unlink className="w-3.5 h-3.5 mr-1" />
                              )}
                              Desvincular
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Desvincular Documentación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Los estudiantes ya no podrán ver{" "}
                                <strong>{project.name}</strong> desde este curso.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleUnlink(project.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-10 text-muted-foreground">
                    <BookOpenText className="w-7 h-7 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">Ninguna documentación vinculada aún</p>
                    <p className="text-xs mt-0.5 opacity-70">Vincula un proyecto desde la sección de abajo</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ─── Available to Link Table ─── */}
      {availableProjects.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed rounded-xl opacity-40">
          <BookOpenText className="w-8 h-8 mx-auto mb-3" />
          <p className="text-sm font-medium">No tienes proyectos de documentación creados</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crea proyectos desde{" "}
            <a href="/dashboard/teacher/docs" className="underline text-primary">
              Documentación
            </a>
          </p>
        </div>
      ) : unlinkedProjects.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Vincular Documentación
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecciona un proyecto para vincularlo al curso.
              </p>
            </div>
            {unlinkedProjects.length > 4 && (
              <div className="relative w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm bg-muted/30"
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-bold uppercase tracking-wider text-xs w-full">Proyecto</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs text-right whitespace-nowrap">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnlinked.length > 0 ? (
                  filteredUnlinked.map((project) => (
                    <TableRow
                      key={project.id}
                      className="group hover:bg-muted/20 transition-colors border-border/30 cursor-pointer"
                      onClick={() => !actionLoading && handleLink(project.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                            <BookOpenText className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-sm">{project.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10 group-hover:opacity-100"
                          disabled={!!actionLoading}
                          onClick={(e) => { e.stopPropagation(); handleLink(project.id); }}
                        >
                          {actionLoading === `link-${project.id}` ? (
                            <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Link2 className="w-3.5 h-3.5 mr-1" />
                          )}
                          Vincular
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-6 text-sm text-muted-foreground">
                      No se encontraron proyectos con &quot;{search}&quot;
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
