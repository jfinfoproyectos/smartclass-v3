import { AdminSettings } from "@/features/admin/components/AdminSettings";
import { getSystemSettingsAction } from "@/app/admin-actions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const [settings, themes] = await Promise.all([
        getSystemSettingsAction(),
        import("@/app/actions/themes").then(m => m.getAvailableThemes())
    ]);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <AdminSettings initialSettings={settings as any} themes={themes} />
        </div>
    );
}
