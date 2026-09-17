import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GitReportToolView } from "@/features/github/components/reports/GitReportToolView";
import { getGithubTokenInfo } from "@/lib/githubTokenHelper";

export default async function GitReportToolPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as any;
    const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

    if (!session || (role !== "teacher" && role !== "admin")) {
        redirect("/signin");
    }

    const tokenInfo = await getGithubTokenInfo(session.user.id);

    return (
        <GitReportToolView 
            hasUserGithubToken={tokenInfo.hasToken} 
            tokenSource={tokenInfo.source}
        />
    );
}
