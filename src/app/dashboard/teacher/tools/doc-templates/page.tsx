import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DocxAutofillView } from "@/features/doc-templates/components/DocxAutofillView";

export const metadata = {
    title: "Diligenciador de Formatos & Plantillas Word | SmartClass",
    description: "Automatiza cualquier documento Word (.docx) marcando variables con IA o manualmente y diligenciando nuevos casos.",
};

export default async function DocxAutofillPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as any;
    const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

    if (!session || (role !== "teacher" && role !== "admin")) {
        redirect("/signin");
    }

    return (
        <div className="h-full w-full min-h-0 flex flex-col overflow-hidden">
            <DocxAutofillView />
        </div>
    );
}
