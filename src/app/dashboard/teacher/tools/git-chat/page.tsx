import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GitChatToolView } from "@/features/github/components/chat/GitChatToolView";
import { getGithubTokenInfo } from "@/lib/githubTokenHelper";
import { getLocalComputerGitAccountAction } from "@/features/github/actions/gitDocsActions";

export default async function GitChatToolPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as any;
    const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

    if (!session || (role !== "teacher" && role !== "admin")) {
        redirect("/signin");
    }

    const tokenInfo = await getGithubTokenInfo(session.user.id);
    const localAccount = await getLocalComputerGitAccountAction();

    return (
        <GitChatToolView 
            hasUserGithubToken={tokenInfo.hasToken} 
            tokenSource={tokenInfo.source}
            localAccount={localAccount}
        />
    );
}
