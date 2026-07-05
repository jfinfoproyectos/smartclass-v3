import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { getAdminDashboardStatsAction, getRecentActivityAction } from "@/app/admin-actions";

export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== "admin") {
    redirect("/dashboard/student");
  }

  const [stats, recentActivity] = await Promise.all([
    getAdminDashboardStatsAction(),
    getRecentActivityAction(5)
  ]);

  return (
    <div className="container mx-auto py-8">
      <AdminDashboard stats={stats} recentActivity={recentActivity} />
    </div>
  );
}