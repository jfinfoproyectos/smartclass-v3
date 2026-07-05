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
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-6">
      <Toaster />
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Button asChild variant="ghost" size="sm" className="w-fit h-8 px-0 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors gap-2 mb-2">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Volver al Panel</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-black tracking-tight font-heading uppercase">
            Administración Global de <span className="text-primary">Docs</span>
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
            Panel de Control | {projects.length} Proyectos
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
           <Search className="w-4 h-4 text-muted-foreground" />
           <input 
              type="text" 
              placeholder="Buscar en todos los proyectos..." 
              className="bg-transparent border-none outline-none text-xs font-medium w-full placeholder:text-muted-foreground/40"
           />
        </div>

        <div className="w-full overflow-x-auto rounded-md border bg-card">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Proyecto</TableHead>
              <TableHead>Identificador (Slug)</TableHead>
              <TableHead>Profesor / Creador</TableHead>
              <TableHead className="text-right">Acciones Administrativas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  No se encontraron proyectos de documentación en el sistema.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                         <Files className="w-4 h-4" />
                      </div>
                      <span className="font-bold">{project.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                      {project.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-muted-foreground italic">
                      {project.teacherId || "Sin asignar"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="sm" variant="outline" className="gap-2 h-9 rounded-xl font-bold border-border/50 hover:bg-muted transition-all">
                        <Link href={`/docs/${project.slug}`} target="_blank" rel="noopener noreferrer">
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
    </div>
  );
}
