import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { StudentAttendanceView } from "@/features/student/components/StudentAttendanceView";

export const dynamic = 'force-dynamic';

export default async function StudentAttendancePage() {
    const session = await authClient.getSession();

    if (!session) {
        redirect("/signin");
    }

    return <StudentAttendanceView />;
}
