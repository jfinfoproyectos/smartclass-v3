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
  Plus, 
  Trash2, 
  Layout, 
  Settings, 
  ExternalLink, 
  FolderOpen,
  AlertCircle,
  Files,
  Edit3
} from "lucide-react";
import Link from "next/link";
// import { DocStatusToggle } from "@/components/DocStatusToggle";
import { CreateProjectDialog } from "@/features/documentation/components/admin/CreateProjectDialog";
import { CreateAiProjectDialog } from "@/features/documentation/components/admin/CreateAiProjectDialog";
import { DeleteProjectDialog } from "@/features/documentation/components/admin/DeleteProjectDialog";
import { Toaster } from "@/components/ui/sonner";

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
    <div className="space-y-8 animate-in fade-in duration-500 p-6">
      <Toaster />
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight font-heading uppercase">
            Gestión de <span className="text-primary">Docs</span>
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
            {projects.length} Proyectos de Documentación
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CreateAiProjectDialog />
          <CreateProjectDialog />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
           <Search className="w-4 h-4 text-muted-foreground" />
           <input 
              type="text" 
              placeholder="Buscar documentación..." 
              className="bg-transparent border-none outline-none text-xs font-medium w-full placeholder:text-muted-foreground/40"
           />
        </div>

        <div className="w-full overflow-x-auto rounded-md border">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>ID / Slug</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                  No se encontraron proyectos de documentación.
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="sm" variant="outline" className="gap-2 h-9 rounded-xl font-bold border-border/50 hover:bg-muted transition-all">
                        <Link href={`/docs/${project.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir Documentación
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="secondary" className="gap-2 h-9 rounded-xl font-bold hover:bg-primary hover:text-primary-foreground transition-all">
                        <Link href={`/dashboard/teacher/docs/${project.slug}`}>
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar
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
