import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GitDocsToolView } from "@/features/github/components/docs/GitDocsToolView";
import { getLocalComputerGitAccountAction } from "@/features/github/actions/gitDocsActions";

export default async function GitDocsToolPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as any;
    const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

    if (!session || (role !== "teacher" && role !== "admin")) {
        redirect("/signin");
    }

    const localAccount = await getLocalComputerGitAccountAction();

    return (
        <GitDocsToolView 
            localAccount={localAccount}
        />
    );
}
