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

import { DocProjectsList } from "@/features/documentation/components/admin/DocProjectsList";

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
        <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 backdrop-blur-md">
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

      <DocProjectsList projects={projects} />
    </DashboardContainer>
  );
}
