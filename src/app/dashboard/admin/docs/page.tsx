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
import { Badge } from "@/components/ui/badge";
import { getRoleFromUser } from "@/features/auth/services/authService";
import { 
  Search, 
  ExternalLink, 
  Files,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { DeleteProjectDialog } from "@/features/documentation/components/admin/DeleteProjectDialog";
import { Toaster } from "@/components/ui/sonner";
import { formatName } from "@/lib/utils";
import { DashboardContainer } from "@/components/ui/dashboard-container";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gestión de Documentación | Admin | SmartClass" };

export default async function AdminDocsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const role = getRoleFromUser(session.user);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const projects = await prisma.docProject.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      teacher: {
        select: {
          name: true,
          profile: {
            select: {
              nombres: true,
              apellido: true,
            }
          }
        }
      }
    }
  });

  return (
    <DashboardContainer>
      <Toaster />
      
      {/* Header Banner AI Canvas */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-900/90 text-white p-6 sm:p-8 shadow-xl">
        <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent blur-3xl opacity-70" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Administración de Sistema</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
              Administración Global de Docs
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Supervisa y administra todos los proyectos de documentación registrados en el sistema.
            </p>
          </div>

          <Badge variant="outline" className="text-xs py-1.5 px-3 rounded-xl border-slate-700 bg-slate-800/80 text-slate-200">
            <Files className="mr-2 h-3.5 w-3.5 text-blue-400" />
            {projects.length} proyectos registrados
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-card p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
           <Search className="w-4 h-4 text-muted-foreground ml-1" />
           <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              className="bg-transparent border-none outline-none text-sm font-medium w-full placeholder:text-muted-foreground/60 text-foreground"
           />
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-card shadow-sm">
          <Table className="w-full min-w-[700px]">
            <TableHeader>
              <TableRow className="h-12 bg-muted/50 hover:bg-muted/50 border-b border-slate-200/80 dark:border-slate-800">
                <TableHead className="font-bold uppercase tracking-wider text-xs pl-6 text-muted-foreground">Nombre del Proyecto</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs text-muted-foreground">Profesor / Creador</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs text-right pr-6 text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground text-sm">
                    No se encontraron proyectos de documentación en el sistema.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id} className="group hover:bg-muted/40 transition-colors border-b border-slate-100 dark:border-slate-800/80">
                    <TableCell className="font-medium py-4 pl-6">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-all duration-300 shadow-sm">
                           <Files className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{project.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {project.teacher ? formatName(project.teacher.name, project.teacher.profile) : "Sin asignar"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-4 pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild size="sm" variant="outline" className="gap-2 h-9 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-muted transition-all text-xs">
                           <Link href={`/docs/${project.slug}`}>
                             <ExternalLink className="w-3.5 h-3.5" />
                             Ver Público
                           </Link>
                         </Button>
                        <DeleteProjectDialog projectId={project.id} projectName={project.name} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardContainer>
  );
}
