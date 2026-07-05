import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { UserDocsList } from "@/features/documentation/components/student/UserDocsList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documentación del Curso" };

export default async function StudentDocsPage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/signin");

  // We fetch all public doc projects for now, as it's decoupled from the course schema
  const projects = await prisma.docProject.findMany({
    where: { isPublic: true },
    orderBy: { order: "asc" }
  });

  const formattedDocs = projects.map(p => ({
    id: p.slug,
    title: p.name,
    icon: p.icon || "lucide:book",
    groupName: "Documentación Global",
    imageUrl: p.imageUrl
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight font-heading uppercase">
          <span className="text-primary">Docs</span> Disponibles
        </h1>
        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
          Documentación habilitada para lectura
        </p>
      </div>

      <UserDocsList docs={formattedDocs} />
    </div>
  );
}
