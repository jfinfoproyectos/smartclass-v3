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
  Files
} from "lucide-react";
import Link from "next/link";
// import { DocStatusToggle } from "@/components/DocStatusToggle";
import { CreateProjectDialog } from "@/features/documentation/components/admin/CreateProjectDialog";
import { CreateAiProjectDialog } from "@/features/documentation/components/admin/CreateAiProjectDialog";
import { ProjectRowActions } from "@/features/documentation/components/admin/ProjectRowActions";
import { Toaster } from "@/components/ui/sonner";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documentación | SmartClass" };

export default async function DocsScannerPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const role = getRoleFromUser(session.user);
  const isAdmin = role === "admin" || role === "teacher";
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
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
    <div className="space-y-6 animate-in fade-in duration-500 p-4 sm:p-6 md:p-8 pt-6">
      <Toaster />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Docs</h2>
          <p className="text-muted-foreground">
            {projects.length} Proyectos de Documentación
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
          <CreateAiProjectDialog />
          <CreateProjectDialog />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/15">
           <Search className="w-4 h-4 text-muted-foreground" />
           <input 
              type="text" 
              placeholder="Buscar documentación..." 
              className="bg-transparent border-none outline-none text-xs font-medium w-full placeholder:text-muted-foreground/40"
           />
        </div>

      <TooltipProvider delayDuration={150}>
        <div className="rounded-2xl border border-border/15 overflow-hidden bg-card/25 backdrop-blur-md shadow-xl shadow-black/5">
          <Table className="w-full min-w-[800px]">
            <TableHeader>
              <TableRow className="h-12 bg-muted/40 hover:bg-muted/40 border-b border-border/15">
                <TableHead className="font-extrabold uppercase tracking-wider text-[10px] pl-5 text-muted-foreground/80">Nombre</TableHead>
                <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-right pr-5 text-muted-foreground/80">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-32 text-center text-muted-foreground pl-5">
                    No se encontraron proyectos de documentación.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id} className="group hover:bg-muted/30 transition-colors border-b border-border/10">
                    <TableCell className="font-medium py-3.5 pl-5">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-all duration-300 shadow-sm shadow-primary/5">
                           <Files className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm text-foreground/90 group-hover:text-primary transition-colors duration-300">{project.name}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right py-3.5 pr-5">
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
    </div>
  );
}
