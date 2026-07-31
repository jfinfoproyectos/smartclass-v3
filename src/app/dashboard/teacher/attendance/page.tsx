import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TeacherAttendanceView } from "@/features/teacher/components/TeacherAttendanceView";

export const dynamic = 'force-dynamic';

export default async function TeacherAttendancePage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        redirect("/signin");
    }

    return <TeacherAttendanceView />;
}
