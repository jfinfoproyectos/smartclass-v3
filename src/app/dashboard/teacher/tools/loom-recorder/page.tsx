import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoomRecorderView } from "@/features/loom-recorder/components/LoomRecorderView";

export const metadata = {
    title: "Grabador de Pantalla y Cámara | SmartClass",
    description: "Herramienta para docentes para grabar videos de pantalla y cámara web con burbuja flotante, zoom interactivo y descarga directa.",
};

export default async function LoomRecorderPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as any;
    const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

    if (!session || (role !== "teacher" && role !== "admin")) {
        redirect("/signin");
    }

    return <LoomRecorderView />;
}
