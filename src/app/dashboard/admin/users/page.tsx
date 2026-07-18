import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserManagement } from "@/features/admin/components/UserManagement";
import { getAllUsersAction } from "@/app/admin-actions";

export default async function AdminUsersPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const { users, total } = await getAllUsersAction({ limit: 20, role: "student" });

    return (
        <div className="p-8">
            <UserManagement initialUsers={users} totalCount={total} />
        </div>
    );
}
