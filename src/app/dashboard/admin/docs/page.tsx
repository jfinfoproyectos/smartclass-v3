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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getRoleFromUser } from "@/features/auth/services/authService";
import { 
  FileText, 
  Search, 
  Trash2, 
  ExternalLink, 
  Files,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { DeleteProjectDialog } from "@/features/documentation/components/admin/DeleteProjectDialog";
import { Toaster } from "@/components/ui/sonner";
import { formatName } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gestión de Documentación | Admin | SmartClass" };

export default async function AdminDocsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const role = getRoleFromUser(session.user);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  // Admins see all projects
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
    <div className="space-y-6 animate-in fade-in duration-500 p-8">
      <Toaster />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Administración Global de Docs</h2>
          <p className="text-muted-foreground">
            Administra los proyectos de documentación del sistema
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <Badge variant="outline" className="text-sm py-1.5 px-3">
            <Files className="mr-2 h-3.5 w-3.5 text-primary" />
            {projects.length} proyectos totales
          </Badge>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-md">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input 
              type="text" 
              placeholder="Buscar por nombre..." 
              className="pl-10 bg-card border-border/50"
           />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proyectos ({projects.length})</CardTitle>
          <CardDescription>
            Lista de todos los proyectos de documentación registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/50 overflow-x-auto shadow-sm">
            <Table className="w-full min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/30">
                  <TableHead className="font-bold uppercase tracking-wider text-xs pl-4">Nombre del Proyecto</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs">Profesor / Creador</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs text-right pr-4">Acciones Administrativas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground pl-4">
                      No se encontraron proyectos de documentación en el sistema.
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <TableRow key={project.id} className="group hover:bg-muted/20 transition-colors border-border/30">
                      <TableCell className="font-medium pl-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                             <Files className="w-4 h-4" />
                          </div>
                          <span className="font-bold">{project.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {project.teacher ? formatName(project.teacher.name, project.teacher.profile) : "Sin asignar"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild size="sm" variant="outline" className="gap-2 h-9 border-border/50 hover:bg-muted transition-all">
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
        </CardContent>
      </Card>
    </div>
  );
}
