import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getRoleFromUser } from "@/features/auth/services/authService";
import { 
  Search, 
  Files,
  BookMarked,
} from "lucide-react";
import Link from "next/link";
import { CreateProjectDialog } from "@/features/documentation/components/admin/CreateProjectDialog";
import { CreateAiProjectDialog } from "@/features/documentation/components/admin/CreateAiProjectDialog";
import { ProjectRowActions } from "@/features/documentation/components/admin/ProjectRowActions";
import { Toaster } from "@/components/ui/sonner";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { DashboardContainer } from "@/components/ui/dashboard-container";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documentación | SmartClass" };

export default async function DocsScannerPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const role = getRoleFromUser(session.user);
  const isAdmin = role === "admin" || role === "teacher";
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 max-w-7xl mx-auto px-4">
        <Files className="w-12 h-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Acceso Restringido</h2>
        <p className="text-muted-foreground">Solo los profesores o admins pueden gestionar la documentación.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Volver</Link>
        </Button>
      </div>
    );
  }

  const projects = await prisma.docProject.findMany({
    where: role === "admin" ? {} : { teacherId: session.user.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <DashboardContainer>
      <Toaster />
      
      {/* Header Banner AI Canvas */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-900/90 text-white p-6 sm:p-8 shadow-xl">
        <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent blur-3xl opacity-70" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 backdrop-blur-md">
              <BookMarked className="w-3.5 h-3.5" />
              <span>Gestión de Documentación</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
              Proyectos de Documentación
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Crea y administra documentación técnica, guías y recursos asistidos por Inteligencia Artificial.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CreateAiProjectDialog />
            <CreateProjectDialog />
          </div>
        </div>
      </div>

      {/* Search Bar & Table Container */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-card p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
           <Search className="w-4 h-4 text-muted-foreground ml-1" />
           <input 
              type="text" 
              placeholder="Buscar proyectos de documentación..." 
              className="bg-transparent border-none outline-none text-sm font-medium w-full placeholder:text-muted-foreground/60 text-foreground"
           />
        </div>

        <TooltipProvider delayDuration={150}>
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-card shadow-sm">
            <Table className="w-full min-w-[700px]">
              <TableHeader>
                <TableRow className="h-12 bg-muted/50 hover:bg-muted/50 border-b border-slate-200/80 dark:border-slate-800">
                  <TableHead className="font-bold uppercase tracking-wider text-xs pl-6 text-muted-foreground">Proyecto</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs text-right pr-6 text-muted-foreground">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-32 text-center text-muted-foreground text-sm">
                      No se encontraron proyectos de documentación.
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <TableRow key={project.id} className="group hover:bg-muted/40 transition-colors border-b border-slate-100 dark:border-slate-800/80">
                      <TableCell className="font-medium py-4 pl-6">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-all duration-300 shadow-sm">
                             <Files className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{project.name}</span>
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
        </TooltipProvider>
      </div>
    </DashboardContainer>
  );
}
