import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MarkdownToPdfToolView } from "@/features/markdown-pdf/components/MarkdownToPdfToolView";

export const metadata = {
    title: "Conversor Markdown a PDF Corporativo | SmartClass",
    description: "Generador profesional de documentos ejecutivos y técnicos desde Markdown con @react-pdf/renderer.",
};

export default async function MarkdownPdfToolPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as any;
    const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

    if (!session || (role !== "teacher" && role !== "admin")) {
        redirect("/signin");
    }

    return <MarkdownToPdfToolView />;
}
