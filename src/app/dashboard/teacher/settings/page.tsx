import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTeacherCredentialsAction } from "@/app/teacher-actions";
import { TeacherSettings } from "@/features/teacher/components/TeacherSettings";

export default async function TeacherSettingsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        redirect("/dashboard");
    }

    const [credentials, themes] = await Promise.all([
        getTeacherCredentialsAction(),
        import("@/app/actions/themes").then(m => m.getAvailableThemes())
    ]);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <TeacherSettings initialCredentials={credentials} themes={themes} />
        </div>
    );
}
