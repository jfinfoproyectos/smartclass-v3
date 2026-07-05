import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuditLogPanel } from "@/features/admin/components/AuditLogPanel";
import { GeminiApiLogPanel } from "@/features/admin/components/GeminiApiLogPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, ShieldAlert } from "lucide-react";

export default async function AuditLogsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/signin");
    }

    return (
        <div className="flex-1 space-y-6 p-6 md:p-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Registro de Auditoría</h1>
                <p className="text-muted-foreground">
                    Monitoreo completo de todas las operaciones del sistema
                </p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Auditoría General
                    </TabsTrigger>
                    <TabsTrigger value="gemini" className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        Uso API Gemini
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="m-0">
                    <AuditLogPanel />
                </TabsContent>
                <TabsContent value="gemini" className="m-0">
                    <GeminiApiLogPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}
