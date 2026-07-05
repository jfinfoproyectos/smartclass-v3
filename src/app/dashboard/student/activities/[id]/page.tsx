import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { courseService } from "@/features/teacher/services/courseService";
import { profileService } from "@/features/profile/services/profileService";
import { ActivityDetails } from "@/features/student/components/ActivityDetails";

export const maxDuration = 60; // Increase Vercel timeout to 60s for Gemini API calls

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "student") {
        redirect("/signin");
    }

    const activity = await courseService.getActivity(id, session.user.id);
    const profile = await profileService.getProfile(session.user.id);
    const studentName = profile ? `${profile.nombres} ${profile.apellido}` : session.user.name;

    if (!activity) {
        return <div>Actividad no encontrada</div>;
    }

    return <ActivityDetails activity={activity} userId={session.user.id} studentName={studentName} />;
}
