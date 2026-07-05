import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SystemMonitor } from "@/features/admin/components/SystemMonitor";
import { getSystemHealthAction, getRecentActivityAction } from "@/app/admin-actions";

export default async function AdminSystemPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const [health, recentActivity] = await Promise.all([
        getSystemHealthAction(),
        getRecentActivityAction(15)
    ]);

    return (
        <div className="p-8">
            <SystemMonitor initialHealth={health} recentActivity={recentActivity} />
        </div>
    );
}
