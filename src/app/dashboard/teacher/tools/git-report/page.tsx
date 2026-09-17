import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GitReportToolView } from "@/features/github/components/reports/GitReportToolView";
import { getGithubToken } from "@/lib/githubTokenHelper";

export default async function GitReportToolPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as any;
    const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

    if (!session || (role !== "teacher" && role !== "admin")) {
        redirect("/signin");
    }

    const token = await getGithubToken(session.user.id);
    const hasUserGithubToken = Boolean(token);

    return (
        <GitReportToolView 
            hasUserGithubToken={hasUserGithubToken} 
        />
    );
}
